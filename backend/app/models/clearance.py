"""Supplier Clearance (Cumplimiento) model.

The system does not screen suppliers; it only records an externally provided
clearance result. Expired clearance counts as "not cleared".
"""
from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base, GUID, new_uuid
from ..enums import ClearanceStatus


def _now() -> datetime:
    return datetime.now(timezone.utc)


class SupplierClearance(Base):
    __tablename__ = "supplier_clearances"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=new_uuid)
    supplier_id: Mapped[str] = mapped_column(
        GUID, ForeignKey("suppliers.id"), nullable=False, index=True
    )
    status: Mapped[ClearanceStatus] = mapped_column(
        Enum(ClearanceStatus, native_enum=False), nullable=False
    )
    clearance_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    valid_until: Mapped[date | None] = mapped_column(Date, nullable=True)
    compliance_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(
        GUID, ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)

    supplier: Mapped["Supplier"] = relationship(back_populates="clearances")
