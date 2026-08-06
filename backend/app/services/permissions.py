"""Role-based capabilities and visibility rules.

All permission checks are enforced server-side. The frontend may hide controls
for UX, but the backend is the source of truth.
"""
from __future__ import annotations

from ..enums import Role, SolicitudStatus
from ..models import Solicitud, User

# --- Capabilities -----------------------------------------------------------

SUPPLIER_CREATE = "supplier:create"
SUPPLIER_VIEW = "supplier:view"
SUPPLIER_EDIT = "supplier:edit"
CLEARANCE_CREATE = "clearance:create"
CLEARANCE_VIEW = "clearance:view"
CONCEPT_VIEW = "concept:view"
CONCEPT_EDIT = "concept:edit"
SOLICITUD_CREATE = "solicitud:create"
SOLICITUD_EDIT_DRAFT = "solicitud:edit_draft"
SOLICITUD_SUBMIT = "solicitud:submit"
SOLICITUD_UPLOAD = "solicitud:upload"
SOLICITUD_VIEW_ALL = "solicitud:view_all"
SOLICITUD_VIEW_OWN = "solicitud:view_own"
SUPERVISOR_REVIEW = "solicitud:supervisor_review"
CFO_REVIEW = "solicitud:cfo_review"
AUDIT_VIEW = "audit:view"
USER_MANAGE = "user:manage"

_FIELD_ADMIN = {
    SUPPLIER_CREATE,
    SUPPLIER_VIEW,
    SUPPLIER_EDIT,
    CLEARANCE_VIEW,
    CONCEPT_VIEW,
    SOLICITUD_CREATE,
    SOLICITUD_EDIT_DRAFT,
    SOLICITUD_SUBMIT,
    SOLICITUD_UPLOAD,
    SOLICITUD_VIEW_OWN,
    AUDIT_VIEW,
}

_SUPERVISOR = {
    SUPPLIER_VIEW,
    CLEARANCE_VIEW,
    CONCEPT_VIEW,
    SOLICITUD_VIEW_ALL,
    SUPERVISOR_REVIEW,
    AUDIT_VIEW,
}

_CFO = {
    SUPPLIER_VIEW,
    CLEARANCE_VIEW,
    CONCEPT_VIEW,
    SOLICITUD_VIEW_ALL,
    CFO_REVIEW,
    AUDIT_VIEW,
}

_CEO = {
    SUPPLIER_VIEW,
    CLEARANCE_VIEW,
    CONCEPT_VIEW,
    SOLICITUD_VIEW_ALL,
    AUDIT_VIEW,
}

_ACCOUNTANT = {
    SUPPLIER_VIEW,
    CLEARANCE_VIEW,
    CONCEPT_VIEW,
    SOLICITUD_VIEW_ALL,
    AUDIT_VIEW,
}

_ENGINEER = {
    SUPPLIER_VIEW,
    CONCEPT_VIEW,
    SOLICITUD_VIEW_ALL,
}

_TREASURER = {
    SUPPLIER_VIEW,
    CLEARANCE_VIEW,
    CONCEPT_VIEW,
    SOLICITUD_VIEW_ALL,
    AUDIT_VIEW,
}

# Admin gets every capability.
_ALL_CAPS = (
    _FIELD_ADMIN
    | _SUPERVISOR
    | _CFO
    | _CEO
    | _ACCOUNTANT
    | _ENGINEER
    | _TREASURER
    | {SUPPLIER_EDIT, CONCEPT_EDIT, CLEARANCE_CREATE, USER_MANAGE, SOLICITUD_VIEW_ALL}
)

ROLE_CAPABILITIES: dict[Role, set[str]] = {
    Role.admin: set(_ALL_CAPS),
    Role.field_admin: _FIELD_ADMIN,
    Role.supervisor: _SUPERVISOR,
    Role.cfo: _CFO,
    Role.ceo: _CEO,
    Role.accountant: _ACCOUNTANT,
    Role.engineer: _ENGINEER,
    Role.treasurer: _TREASURER,
}

# Clearance is recorded by admins (external clearance reference entry).
ROLE_CAPABILITIES[Role.admin].add(CLEARANCE_CREATE)


def has_capability(user: User, capability: str) -> bool:
    return capability in ROLE_CAPABILITIES.get(user.role, set())


# --- Visibility -------------------------------------------------------------

# Statuses a Treasurer is allowed to see (approved-and-beyond requests).
_TREASURER_VISIBLE = {
    SolicitudStatus.supervisor_approved,
    SolicitudStatus.cfo_approved,
    SolicitudStatus.deferred,
}


def can_view_solicitud(user: User, solicitud: Solicitud) -> bool:
    if has_capability(user, SOLICITUD_VIEW_ALL):
        if user.role == Role.treasurer:
            return solicitud.status in _TREASURER_VISIBLE
        return True
    # Field Admin: only own captured requests.
    if has_capability(user, SOLICITUD_VIEW_OWN):
        return solicitud.captured_by == user.id
    return False
