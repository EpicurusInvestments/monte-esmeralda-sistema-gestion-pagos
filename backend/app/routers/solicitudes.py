"""Solicitud de Pago routes — capture, listing, detail and workflow actions."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..enums import RequestType, Role, SolicitudStatus
from ..errors import NotFound, PermissionDenied
from ..models import AuditEvent, Concept, Solicitud, Supplier, User
from ..schemas.solicitud import (
    AttachmentOut,
    AuditEventOut,
    CommentOut,
    SolicitudCreate,
    SolicitudDetail,
    SolicitudListItem,
    SolicitudUpdate,
    WorkflowAction,
)
from ..services import permissions, workflow
from ..services.concept_service import to_out as concept_out
from ..services.permissions import can_view_solicitud
from ..services.supplier_service import to_out as supplier_out

router = APIRouter(prefix="/solicitudes", tags=["solicitudes"])


def _get(db: Session, solicitud_id: str) -> Solicitud:
    solicitud = db.get(Solicitud, solicitud_id)
    if solicitud is None:
        raise NotFound("La solicitud indicada no existe.")
    return solicitud


def _get_viewable(db: Session, user: User, solicitud_id: str) -> Solicitud:
    solicitud = _get(db, solicitud_id)
    if not can_view_solicitud(user, solicitud):
        raise PermissionDenied()
    return solicitud


def _user_names(db: Session, ids: set[str]) -> dict[str, str]:
    ids = {i for i in ids if i}
    if not ids:
        return {}
    rows = db.execute(select(User.id, User.full_name).where(User.id.in_(ids))).all()
    return {r[0]: r[1] for r in rows}


def _concept_label(db: Session, solicitud: Solicitud, cache: dict) -> str | None:
    cid = solicitud.final_concept_id or solicitud.proposed_concept_id
    if not cid:
        return None
    concept = cache.get(cid) or db.get(Concept, cid)
    if concept is None:
        return None
    parent = None
    if concept.parent_id:
        parent = cache.get(concept.parent_id) or db.get(Concept, concept.parent_id)
    if parent:
        return f"{concept.name} ({parent.name})"
    return concept.name


# --- Listing ----------------------------------------------------------------


@router.get("", response_model=list[SolicitudListItem])
def list_solicitudes(
    status: SolicitudStatus | None = None,
    supplier_id: str | None = None,
    concept_id: str | None = None,
    request_type: RequestType | None = None,
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[SolicitudListItem]:
    if not (
        permissions.has_capability(user, permissions.SOLICITUD_VIEW_ALL)
        or permissions.has_capability(user, permissions.SOLICITUD_VIEW_OWN)
    ):
        raise PermissionDenied()

    stmt = select(Solicitud).order_by(Solicitud.created_at.desc())

    # Visibility scoping.
    if not permissions.has_capability(user, permissions.SOLICITUD_VIEW_ALL):
        stmt = stmt.where(Solicitud.captured_by == user.id)
    elif user.role == Role.treasurer:
        stmt = stmt.where(
            Solicitud.status.in_(
                [
                    SolicitudStatus.supervisor_approved,
                    SolicitudStatus.cfo_approved,
                    SolicitudStatus.deferred,
                ]
            )
        )

    # Filters.
    if status:
        stmt = stmt.where(Solicitud.status == status)
    if supplier_id:
        stmt = stmt.where(Solicitud.supplier_id == supplier_id)
    if concept_id:
        stmt = stmt.where(
            (Solicitud.final_concept_id == concept_id)
            | (Solicitud.proposed_concept_id == concept_id)
        )
    if request_type:
        stmt = stmt.where(Solicitud.request_type == request_type)
    if date_from:
        stmt = stmt.where(Solicitud.document_date >= date_from)
    if date_to:
        stmt = stmt.where(Solicitud.document_date <= date_to)

    rows = list(db.execute(stmt).scalars())

    supplier_ids = {r.supplier_id for r in rows}
    suppliers = {
        s.id: s.legal_name
        for s in db.execute(
            select(Supplier).where(Supplier.id.in_(supplier_ids))
        ).scalars()
    } if supplier_ids else {}
    concept_cache: dict[str, Concept] = {}

    items: list[SolicitudListItem] = []
    for r in rows:
        items.append(
            SolicitudListItem(
                id=r.id,
                folio=r.folio,
                request_type=r.request_type,
                supplier_id=r.supplier_id,
                supplier_name=suppliers.get(r.supplier_id),
                final_concept_id=r.final_concept_id,
                proposed_concept_id=r.proposed_concept_id,
                concept_label=_concept_label(db, r, concept_cache),
                net_amount=r.net_amount,
                status=r.status,
                document_date=r.document_date,
                created_at=r.created_at,
            )
        )
    return items


# --- Detail -----------------------------------------------------------------


def _detail(db: Session, solicitud: Solicitud) -> SolicitudDetail:
    audit_rows = list(
        db.execute(
            select(AuditEvent)
            .where(
                AuditEvent.entity_type == "solicitud",
                AuditEvent.entity_id == solicitud.id,
            )
            .order_by(AuditEvent.created_at.asc())
        ).scalars()
    )
    actor_ids = {a.performed_by for a in audit_rows} | {
        c.author_id for c in solicitud.comments
    }
    names = _user_names(db, actor_ids)

    concept_cache: dict[str, Concept] = {}
    proposed = (
        concept_out(db, solicitud.proposed_concept, concept_cache)
        if solicitud.proposed_concept
        else None
    )
    final = (
        concept_out(db, solicitud.final_concept, concept_cache)
        if solicitud.final_concept
        else None
    )

    comments_out = []
    for c in solicitud.comments:
        item = CommentOut.model_validate(c)
        item.author_name = names.get(c.author_id)
        comments_out.append(item)

    audit_out = [
        AuditEventOut(
            id=a.id,
            entity_type=a.entity_type,
            entity_id=a.entity_id,
            action=a.action,
            performed_by=a.performed_by,
            performed_by_name=names.get(a.performed_by),
            before_json=a.before_json,
            after_json=a.after_json,
            reason=a.reason,
            created_at=a.created_at,
        )
        for a in audit_rows
    ]

    # Build explicitly: the nested SupplierOut carries a computed `clearance`
    # field that the ORM object does not have, so we cannot model_validate the
    # ORM relationship directly.
    return SolicitudDetail(
        id=solicitud.id,
        folio=solicitud.folio,
        request_type=solicitud.request_type,
        supplier_id=solicitud.supplier_id,
        description=solicitud.description,
        net_amount=solicitud.net_amount,
        proposed_concept_id=solicitud.proposed_concept_id,
        final_concept_id=solicitud.final_concept_id,
        proposed_payment_week=solicitud.proposed_payment_week,
        document_date=solicitud.document_date,
        due_date=solicitud.due_date,
        status=solicitud.status,
        captured_by=solicitud.captured_by,
        submitted_at=solicitud.submitted_at,
        supervisor_reviewed_by=solicitud.supervisor_reviewed_by,
        supervisor_reviewed_at=solicitud.supervisor_reviewed_at,
        cfo_reviewed_by=solicitud.cfo_reviewed_by,
        cfo_reviewed_at=solicitud.cfo_reviewed_at,
        created_at=solicitud.created_at,
        updated_at=solicitud.updated_at,
        supplier=supplier_out(solicitud.supplier) if solicitud.supplier else None,
        proposed_concept=proposed,
        final_concept=final,
        attachments=[AttachmentOut.model_validate(a) for a in solicitud.attachments],
        comments=comments_out,
        audit_events=audit_out,
    )


@router.get("/{solicitud_id}", response_model=SolicitudDetail)
def get_solicitud(
    solicitud_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SolicitudDetail:
    solicitud = _get_viewable(db, user, solicitud_id)
    return _detail(db, solicitud)


# --- Create / edit ----------------------------------------------------------


@router.post("", response_model=SolicitudDetail, status_code=201)
def create_solicitud(
    payload: SolicitudCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SolicitudDetail:
    solicitud = workflow.create_solicitud(db, user, payload)
    db.commit()
    db.refresh(solicitud)
    return _detail(db, solicitud)


@router.patch("/{solicitud_id}", response_model=SolicitudDetail)
def update_solicitud(
    solicitud_id: str,
    payload: SolicitudUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SolicitudDetail:
    solicitud = _get(db, solicitud_id)
    workflow.update_solicitud(db, user, solicitud, payload)
    db.commit()
    db.refresh(solicitud)
    return _detail(db, solicitud)


# --- Workflow actions -------------------------------------------------------


@router.post("/{solicitud_id}/submit", response_model=SolicitudDetail)
def submit(
    solicitud_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SolicitudDetail:
    solicitud = _get(db, solicitud_id)
    workflow.submit_solicitud(db, user, solicitud)
    db.commit()
    db.refresh(solicitud)
    return _detail(db, solicitud)


@router.post("/{solicitud_id}/assign-concept", response_model=SolicitudDetail)
def assign_concept(
    solicitud_id: str,
    action: WorkflowAction,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SolicitudDetail:
    solicitud = _get(db, solicitud_id)
    if not action.final_concept_id:
        raise NotFound("Debe indicar el concepto final a asignar.")
    workflow.assign_concept(db, user, solicitud, action.final_concept_id)
    db.commit()
    db.refresh(solicitud)
    return _detail(db, solicitud)


@router.post("/{solicitud_id}/supervisor-approve", response_model=SolicitudDetail)
def supervisor_approve(
    solicitud_id: str,
    action: WorkflowAction = WorkflowAction(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SolicitudDetail:
    solicitud = _get(db, solicitud_id)
    workflow.supervisor_approve(db, user, solicitud, action)
    db.commit()
    db.refresh(solicitud)
    return _detail(db, solicitud)


@router.post("/{solicitud_id}/cfo-approve", response_model=SolicitudDetail)
def cfo_approve(
    solicitud_id: str,
    action: WorkflowAction = WorkflowAction(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SolicitudDetail:
    solicitud = _get(db, solicitud_id)
    workflow.cfo_approve(db, user, solicitud, action)
    db.commit()
    db.refresh(solicitud)
    return _detail(db, solicitud)


@router.post("/{solicitud_id}/defer", response_model=SolicitudDetail)
def defer(
    solicitud_id: str,
    action: WorkflowAction = WorkflowAction(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SolicitudDetail:
    solicitud = _get(db, solicitud_id)
    workflow.cfo_defer(db, user, solicitud, action)
    db.commit()
    db.refresh(solicitud)
    return _detail(db, solicitud)


@router.post("/{solicitud_id}/reject", response_model=SolicitudDetail)
def reject(
    solicitud_id: str,
    action: WorkflowAction = WorkflowAction(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SolicitudDetail:
    solicitud = _get(db, solicitud_id)
    workflow.reject(db, user, solicitud, action)
    db.commit()
    db.refresh(solicitud)
    return _detail(db, solicitud)


@router.post("/{solicitud_id}/request-correction", response_model=SolicitudDetail)
def request_correction(
    solicitud_id: str,
    action: WorkflowAction = WorkflowAction(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SolicitudDetail:
    solicitud = _get(db, solicitud_id)
    workflow.request_correction(db, user, solicitud, action)
    db.commit()
    db.refresh(solicitud)
    return _detail(db, solicitud)


@router.post("/{solicitud_id}/cancel", response_model=SolicitudDetail)
def cancel(
    solicitud_id: str,
    action: WorkflowAction = WorkflowAction(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SolicitudDetail:
    solicitud = _get(db, solicitud_id)
    workflow.cancel(db, user, solicitud, action)
    db.commit()
    db.refresh(solicitud)
    return _detail(db, solicitud)
