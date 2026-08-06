"""Comment / Note model attached to a Solicitud de Pago."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base, GUID, datetime2, new_uuid, unicode_text


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=new_uuid)
    solicitud_id: Mapped[str] = mapped_column(
        GUID, ForeignKey("solicitudes.id"), nullable=False, index=True
    )
    author_id: Mapped[str] = mapped_column(GUID, ForeignKey("users.id"), nullable=False)
    body: Mapped[str] = mapped_column(unicode_text(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(datetime2(), default=_now, nullable=False)

    solicitud: Mapped["Solicitud"] = relationship(back_populates="comments")
    author = relationship("User")
