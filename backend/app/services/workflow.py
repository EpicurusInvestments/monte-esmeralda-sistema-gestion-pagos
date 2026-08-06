"""Workflow service — the single place where Solicitud de Pago state changes.

Every transition is validated server-side and audited. Routers must call these
functions rather than mutating models directly.
"""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from ..enums import AuditAction, SolicitudStatus
from ..errors import (
    ConceptRequired,
    InvalidWorkflowTransition,
    MissingRequiredAttachment,
    PermissionDenied,
    SupplierNotFound,
    ValidationError,
)
from ..models import Solicitud, Supplier, User
from ..schemas.solicitud import SolicitudCreate, SolicitudUpdate, WorkflowAction
from . import audit, permissions
from .concept_service import validate_leaf
from .folio import next_folio


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _snapshot(s: Solicitud) -> dict:
    return {
        "folio": s.folio,
        "status": s.status.value,
        "net_amount": str(s.net_amount),
        "supplier_id": s.supplier_id,
        "proposed_concept_id": s.proposed_concept_id,
        "final_concept_id": s.final_concept_id,
        "request_type": s.request_type.value,
    }


def _require_supplier(db: Session, supplier_id: str) -> Supplier:
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise SupplierNotFound()
    return supplier


def _has_attachment(s: Solicitud) -> bool:
    return len(s.attachments) > 0


# --- Creation & editing -----------------------------------------------------


def create_solicitud(db: Session, user: User, payload: SolicitudCreate) -> Solicitud:
    if not permissions.has_capability(user, permissions.SOLICITUD_CREATE):
        raise PermissionDenied()
    _require_supplier(db, payload.supplier_id)
    if payload.proposed_concept_id:
        validate_leaf(db, payload.proposed_concept_id)

    solicitud = Solicitud(
        folio=next_folio(db),
        request_type=payload.request_type,
        supplier_id=payload.supplier_id,
        description=payload.description,
        net_amount=payload.net_amount,
        proposed_concept_id=payload.proposed_concept_id,
        proposed_payment_week=payload.proposed_payment_week,
        document_date=payload.document_date,
        due_date=payload.due_date,
        status=SolicitudStatus.draft,
        captured_by=user.id,
    )
    db.add(solicitud)
    db.flush()
    audit.record_event(
        db,
        entity_type="solicitud",
        entity_id=solicitud.id,
        action=AuditAction.created.value,
        performed_by=user,
        after=_snapshot(solicitud),
    )
    return solicitud


_EDITABLE_STATUSES = {SolicitudStatus.draft, SolicitudStatus.correction_requested}


def update_solicitud(
    db: Session, user: User, solicitud: Solicitud, payload: SolicitudUpdate
) -> Solicitud:
    # Only the capturer (or admin) may edit, and only while editable.
    is_owner = solicitud.captured_by == user.id
    if not (is_owner or user.role.value == "admin"):
        raise PermissionDenied()
    if not permissions.has_capability(user, permissions.SOLICITUD_EDIT_DRAFT):
        raise PermissionDenied()
    if solicitud.status not in _EDITABLE_STATUSES:
        raise InvalidWorkflowTransition(
            "La solicitud solo puede editarse en borrador o cuando se solicitó corrección."
        )

    before = _snapshot(solicitud)
    data = payload.model_dump(exclude_unset=True)

    if "supplier_id" in data and data["supplier_id"]:
        _require_supplier(db, data["supplier_id"])
    if "proposed_concept_id" in data and data["proposed_concept_id"]:
        validate_leaf(db, data["proposed_concept_id"])

    financial_changed = False
    concept_changed = False
    for field, value in data.items():
        if field == "net_amount" and value is not None:
            if Decimal(str(value)) != Decimal(str(solicitud.net_amount)):
                financial_changed = True
        if field == "proposed_concept_id" and value != solicitud.proposed_concept_id:
            concept_changed = True
        setattr(solicitud, field, value)

    db.flush()
    after = _snapshot(solicitud)

    if financial_changed:
        audit.record_event(
            db,
            entity_type="solicitud",
            entity_id=solicitud.id,
            action=AuditAction.financial_edited.value,
            performed_by=user,
            before=before,
            after=after,
        )
    if concept_changed:
        audit.record_event(
            db,
            entity_type="solicitud",
            entity_id=solicitud.id,
            action=AuditAction.concept_changed.value,
            performed_by=user,
            before=before,
            after=after,
        )
    return solicitud


# --- Submission -------------------------------------------------------------


def _validate_submittable(solicitud: Solicitud) -> None:
    if not solicitud.supplier_id:
        raise SupplierNotFound()
    if not solicitud.description or not solicitud.description.strip():
        raise ValidationError("La descripción es obligatoria.")
    if solicitud.net_amount is None or Decimal(str(solicitud.net_amount)) <= 0:
        raise ValidationError("El monto neto debe ser mayor a cero.")
    if not _has_attachment(solicitud):
        raise MissingRequiredAttachment()


def submit_solicitud(db: Session, user: User, solicitud: Solicitud) -> Solicitud:
    is_owner = solicitud.captured_by == user.id
    if not (is_owner or user.role.value == "admin"):
        raise PermissionDenied()
    if not permissions.has_capability(user, permissions.SOLICITUD_SUBMIT):
        raise PermissionDenied()
    if solicitud.status not in {
        SolicitudStatus.draft,
        SolicitudStatus.correction_requested,
    }:
        raise InvalidWorkflowTransition(
            "La solicitud solo puede enviarse desde borrador o tras una corrección."
        )

    _validate_submittable(solicitud)

    before = _snapshot(solicitud)
    is_resubmit = solicitud.status == SolicitudStatus.correction_requested
    solicitud.status = SolicitudStatus.submitted
    solicitud.submitted_at = _now()
    db.flush()
    audit.record_event(
        db,
        entity_type="solicitud",
        entity_id=solicitud.id,
        action=(AuditAction.resubmitted if is_resubmit else AuditAction.submitted).value,
        performed_by=user,
        before=before,
        after=_snapshot(solicitud),
    )
    return solicitud


# --- Concept assignment (supervisor) ---------------------------------------


def assign_concept(
    db: Session, user: User, solicitud: Solicitud, concept_id: str
) -> Solicitud:
    if not permissions.has_capability(user, permissions.SUPERVISOR_REVIEW):
        raise PermissionDenied()
    if solicitud.status != SolicitudStatus.submitted:
        raise InvalidWorkflowTransition(
            "El concepto final solo puede asignarse mientras la solicitud está enviada."
        )
    validate_leaf(db, concept_id)
    before = _snapshot(solicitud)
    solicitud.final_concept_id = concept_id
    db.flush()
    audit.record_event(
        db,
        entity_type="solicitud",
        entity_id=solicitud.id,
        action=AuditAction.concept_changed.value,
        performed_by=user,
        before=before,
        after=_snapshot(solicitud),
    )
    return solicitud


# --- Supervisor decision ----------------------------------------------------


def supervisor_approve(
    db: Session, user: User, solicitud: Solicitud, action: WorkflowAction
) -> Solicitud:
    if not permissions.has_capability(user, permissions.SUPERVISOR_REVIEW):
        raise PermissionDenied()
    if solicitud.status != SolicitudStatus.submitted:
        raise InvalidWorkflowTransition(
            "Solo pueden aprobarse operativamente las solicitudes enviadas."
        )

    before = _snapshot(solicitud)

    # The supervisor may assign/confirm the final concept as part of approval.
    if action.final_concept_id:
        validate_leaf(db, action.final_concept_id)
        solicitud.final_concept_id = action.final_concept_id

    # Approval prerequisites: leaf final concept, net amount, supplier, attachment.
    if not solicitud.final_concept_id:
        raise ConceptRequired()
    validate_leaf(db, solicitud.final_concept_id)
    _require_supplier(db, solicitud.supplier_id)
    if solicitud.net_amount is None or Decimal(str(solicitud.net_amount)) <= 0:
        raise ValidationError("El monto neto debe ser mayor a cero.")
    if not _has_attachment(solicitud):
        raise MissingRequiredAttachment()

    solicitud.status = SolicitudStatus.supervisor_approved
    solicitud.supervisor_reviewed_by = user.id
    solicitud.supervisor_reviewed_at = _now()
    db.flush()
    audit.record_event(
        db,
        entity_type="solicitud",
        entity_id=solicitud.id,
        action=AuditAction.supervisor_approved.value,
        performed_by=user,
        before=before,
        after=_snapshot(solicitud),
        reason=action.reason,
    )
    return solicitud


# --- CFO decision -----------------------------------------------------------


def cfo_approve(
    db: Session, user: User, solicitud: Solicitud, action: WorkflowAction
) -> Solicitud:
    if not permissions.has_capability(user, permissions.CFO_REVIEW):
        raise PermissionDenied()
    if solicitud.status != SolicitudStatus.supervisor_approved:
        raise InvalidWorkflowTransition(
            "El CFO solo puede aprobar solicitudes aprobadas por el supervisor."
        )
    before = _snapshot(solicitud)
    solicitud.status = SolicitudStatus.cfo_approved
    solicitud.cfo_reviewed_by = user.id
    solicitud.cfo_reviewed_at = _now()
    db.flush()
    audit.record_event(
        db,
        entity_type="solicitud",
        entity_id=solicitud.id,
        action=AuditAction.cfo_approved.value,
        performed_by=user,
        before=before,
        after=_snapshot(solicitud),
        reason=action.reason,
    )
    return solicitud


def cfo_defer(
    db: Session, user: User, solicitud: Solicitud, action: WorkflowAction
) -> Solicitud:
    if not permissions.has_capability(user, permissions.CFO_REVIEW):
        raise PermissionDenied()
    if solicitud.status != SolicitudStatus.supervisor_approved:
        raise InvalidWorkflowTransition(
            "Solo pueden diferirse solicitudes aprobadas por el supervisor."
        )
    before = _snapshot(solicitud)
    solicitud.status = SolicitudStatus.deferred
    solicitud.cfo_reviewed_by = user.id
    solicitud.cfo_reviewed_at = _now()
    db.flush()
    audit.record_event(
        db,
        entity_type="solicitud",
        entity_id=solicitud.id,
        action=AuditAction.deferred.value,
        performed_by=user,
        before=before,
        after=_snapshot(solicitud),
        reason=action.reason,
    )
    return solicitud


# --- Shared reject / request-correction (supervisor or CFO) -----------------


def reject(
    db: Session, user: User, solicitud: Solicitud, action: WorkflowAction
) -> Solicitud:
    stage = _decision_stage(user, solicitud)
    before = _snapshot(solicitud)
    solicitud.status = SolicitudStatus.rejected
    if stage == "supervisor":
        solicitud.supervisor_reviewed_by = user.id
        solicitud.supervisor_reviewed_at = _now()
    else:
        solicitud.cfo_reviewed_by = user.id
        solicitud.cfo_reviewed_at = _now()
    db.flush()
    audit.record_event(
        db,
        entity_type="solicitud",
        entity_id=solicitud.id,
        action=AuditAction.rejected.value,
        performed_by=user,
        before=before,
        after=_snapshot(solicitud),
        reason=action.reason,
    )
    return solicitud


def request_correction(
    db: Session, user: User, solicitud: Solicitud, action: WorkflowAction
) -> Solicitud:
    stage = _decision_stage(user, solicitud)
    before = _snapshot(solicitud)
    solicitud.status = SolicitudStatus.correction_requested
    if stage == "supervisor":
        solicitud.supervisor_reviewed_by = user.id
        solicitud.supervisor_reviewed_at = _now()
    else:
        solicitud.cfo_reviewed_by = user.id
        solicitud.cfo_reviewed_at = _now()
    db.flush()
    audit.record_event(
        db,
        entity_type="solicitud",
        entity_id=solicitud.id,
        action=AuditAction.correction_requested.value,
        performed_by=user,
        before=before,
        after=_snapshot(solicitud),
        reason=action.reason,
    )
    return solicitud


def _decision_stage(user: User, solicitud: Solicitud) -> str:
    """Resolve whether this reject/correction is a supervisor- or CFO-stage action.

    Raises PermissionDenied / InvalidWorkflowTransition as appropriate.
    """
    can_super = permissions.has_capability(user, permissions.SUPERVISOR_REVIEW)
    can_cfo = permissions.has_capability(user, permissions.CFO_REVIEW)
    if not (can_super or can_cfo):
        raise PermissionDenied()

    if solicitud.status == SolicitudStatus.submitted and can_super:
        return "supervisor"
    if solicitud.status == SolicitudStatus.supervisor_approved and can_cfo:
        return "cfo"
    raise InvalidWorkflowTransition()


# --- Cancellation -----------------------------------------------------------


def cancel(
    db: Session, user: User, solicitud: Solicitud, action: WorkflowAction
) -> Solicitud:
    is_owner = solicitud.captured_by == user.id
    if not (is_owner or user.role.value == "admin"):
        raise PermissionDenied()
    if solicitud.status not in {
        SolicitudStatus.draft,
        SolicitudStatus.correction_requested,
    }:
        raise InvalidWorkflowTransition(
            "Solo pueden cancelarse solicitudes en borrador o en corrección."
        )
    before = _snapshot(solicitud)
    solicitud.status = SolicitudStatus.cancelled
    db.flush()
    audit.record_event(
        db,
        entity_type="solicitud",
        entity_id=solicitud.id,
        action=AuditAction.cancelled.value,
        performed_by=user,
        before=before,
        after=_snapshot(solicitud),
        reason=action.reason,
    )
    return solicitud
