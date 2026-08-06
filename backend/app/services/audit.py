"""Audit trail helpers."""
from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from ..models import AuditEvent, User


def _serializable(value: Any) -> Any:
    """Coerce a value into something JSON-serializable for audit storage."""
    return json.loads(json.dumps(value, default=str))


def record_event(
    db: Session,
    *,
    entity_type: str,
    entity_id: str,
    action: str,
    performed_by: User | None,
    before: dict | None = None,
    after: dict | None = None,
    reason: str | None = None,
) -> AuditEvent:
    event = AuditEvent(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        performed_by=performed_by.id if performed_by else None,
        before_json=_serializable(before) if before is not None else None,
        after_json=_serializable(after) if after is not None else None,
        reason=reason,
    )
    db.add(event)
    db.flush()
    return event
