"""Comment / note routes for a Solicitud de Pago."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..errors import NotFound, PermissionDenied
from ..models import Comment, Solicitud, User
from ..schemas.solicitud import CommentCreate, CommentOut
from ..services.permissions import can_view_solicitud

router = APIRouter(prefix="/solicitudes/{solicitud_id}/comments", tags=["comments"])


def _get_solicitud(db: Session, solicitud_id: str) -> Solicitud:
    solicitud = db.get(Solicitud, solicitud_id)
    if solicitud is None:
        raise NotFound("La solicitud indicada no existe.")
    return solicitud


@router.get("", response_model=list[CommentOut])
def list_comments(
    solicitud_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[CommentOut]:
    solicitud = _get_solicitud(db, solicitud_id)
    if not can_view_solicitud(user, solicitud):
        raise PermissionDenied()
    rows = list(
        db.execute(
            select(Comment)
            .where(Comment.solicitud_id == solicitud_id)
            .order_by(Comment.created_at)
        ).scalars()
    )
    out = []
    for c in rows:
        item = CommentOut.model_validate(c)
        item.author_name = c.author.full_name if c.author else None
        out.append(item)
    return out


@router.post("", response_model=CommentOut, status_code=201)
def create_comment(
    solicitud_id: str,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CommentOut:
    solicitud = _get_solicitud(db, solicitud_id)
    # Anyone who can view the request may comment on it.
    if not can_view_solicitud(user, solicitud):
        raise PermissionDenied()
    comment = Comment(solicitud_id=solicitud_id, author_id=user.id, body=payload.body)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    item = CommentOut.model_validate(comment)
    item.author_name = user.full_name
    return item
