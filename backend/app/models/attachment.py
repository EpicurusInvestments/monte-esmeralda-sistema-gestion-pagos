"""Attachment model (supporting documents for a Solicitud de Pago)."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base, GUID, new_uuid


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=new_uuid)
    solicitud_id: Mapped[str] = mapped_column(
        GUID, ForeignKey("solicitudes.id"), nullable=False, index=True
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path_or_s3_key: Mapped[str] = mapped_column(String(512), nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    uploaded_by: Mapped[str] = mapped_column(
        GUID, ForeignKey("users.id"), nullable=False
    )
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)

    solicitud: Mapped["Solicitud"] = relationship(back_populates="attachments")
