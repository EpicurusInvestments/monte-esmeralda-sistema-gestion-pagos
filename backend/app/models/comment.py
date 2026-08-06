"""Comment / Note model attached to a Solicitud de Pago."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base, GUID, new_uuid


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=new_uuid)
    solicitud_id: Mapped[str] = mapped_column(
        GUID, ForeignKey("solicitudes.id"), nullable=False, index=True
    )
    author_id: Mapped[str] = mapped_column(GUID, ForeignKey("users.id"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)

    solicitud: Mapped["Solicitud"] = relationship(back_populates="comments")
    author = relationship("User")
