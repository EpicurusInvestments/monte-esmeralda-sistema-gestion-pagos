"""Solicitud de Pago — the central workflow entity."""
from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import Date, Enum, ForeignKey, Numeric, Unicode
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base, GUID, datetime2, new_uuid, unicode_text
from ..enums import RequestType, SolicitudStatus


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Solicitud(Base):
    __tablename__ = "solicitudes"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=new_uuid)
    folio: Mapped[str] = mapped_column(Unicode(20), unique=True, index=True, nullable=False)
    request_type: Mapped[RequestType] = mapped_column(
        Enum(RequestType, native_enum=False), nullable=False
    )
    supplier_id: Mapped[str] = mapped_column(
        GUID, ForeignKey("suppliers.id"), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(unicode_text(), nullable=False)
    net_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    proposed_concept_id: Mapped[str | None] = mapped_column(
        GUID, ForeignKey("concepts.id"), nullable=True
    )
    final_concept_id: Mapped[str | None] = mapped_column(
        GUID, ForeignKey("concepts.id"), nullable=True
    )
    proposed_payment_week: Mapped[str | None] = mapped_column(Unicode(10), nullable=True)
    document_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    status: Mapped[SolicitudStatus] = mapped_column(
        Enum(SolicitudStatus, native_enum=False),
        default=SolicitudStatus.draft,
        nullable=False,
        index=True,
    )

    captured_by: Mapped[str] = mapped_column(
        GUID, ForeignKey("users.id"), nullable=False, index=True
    )
    submitted_at: Mapped[datetime | None] = mapped_column(datetime2(), nullable=True)
    supervisor_reviewed_by: Mapped[str | None] = mapped_column(
        GUID, ForeignKey("users.id"), nullable=True
    )
    supervisor_reviewed_at: Mapped[datetime | None] = mapped_column(datetime2(), nullable=True)
    cfo_reviewed_by: Mapped[str | None] = mapped_column(
        GUID, ForeignKey("users.id"), nullable=True
    )
    cfo_reviewed_at: Mapped[datetime | None] = mapped_column(datetime2(), nullable=True)

    created_at: Mapped[datetime] = mapped_column(datetime2(), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        datetime2(), default=_now, onupdate=_now, nullable=False
    )

    supplier = relationship("Supplier")
    proposed_concept = relationship("Concept", foreign_keys=[proposed_concept_id])
    final_concept = relationship("Concept", foreign_keys=[final_concept_id])
    captor = relationship("User", foreign_keys=[captured_by])
    attachments: Mapped[list["Attachment"]] = relationship(
        back_populates="solicitud",
        order_by="Attachment.uploaded_at",
        cascade="all, delete-orphan",
    )
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="solicitud",
        order_by="Comment.created_at",
        cascade="all, delete-orphan",
    )
