"""Audit event routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_capability
from ..models import AuditEvent, User
from ..schemas.solicitud import AuditEventOut
from ..services import permissions

router = APIRouter(prefix="/audit-events", tags=["audit"])

_view = require_capability(permissions.AUDIT_VIEW)


@router.get("", response_model=list[AuditEventOut])
def list_audit_events(
    entity_type: str | None = None,
    entity_id: str | None = None,
    limit: int = Query(default=200, le=1000),
    db: Session = Depends(get_db),
    _: User = Depends(_view),
) -> list[AuditEventOut]:
    stmt = select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(limit)
    if entity_type:
        stmt = stmt.where(AuditEvent.entity_type == entity_type)
    if entity_id:
        stmt = stmt.where(AuditEvent.entity_id == entity_id)
    rows = list(db.execute(stmt).scalars())

    actor_ids = {a.performed_by for a in rows if a.performed_by}
    names: dict[str, str] = {}
    if actor_ids:
        for uid, name in db.execute(
            select(User.id, User.full_name).where(User.id.in_(actor_ids))
        ).all():
            names[uid] = name

    out = []
    for a in rows:
        item = AuditEventOut.model_validate(a)
        item.performed_by_name = names.get(a.performed_by) if a.performed_by else None
        out.append(item)
    return out
