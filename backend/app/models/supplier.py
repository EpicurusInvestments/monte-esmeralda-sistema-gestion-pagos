"""Supplier (Proveedor) model."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Enum, Unicode
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base, GUID, datetime2, new_uuid
from ..enums import SupplierStatus


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=new_uuid)
    legal_name: Mapped[str] = mapped_column(Unicode(255), nullable=False, index=True)
    rfc: Mapped[str | None] = mapped_column(Unicode(20), nullable=True)
    contact_name: Mapped[str | None] = mapped_column(Unicode(255), nullable=True)
    email: Mapped[str | None] = mapped_column(Unicode(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(Unicode(50), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(Unicode(255), nullable=True)
    bank_account: Mapped[str | None] = mapped_column(Unicode(50), nullable=True)
    clabe: Mapped[str | None] = mapped_column(Unicode(18), nullable=True)
    status: Mapped[SupplierStatus] = mapped_column(
        Enum(SupplierStatus, native_enum=False),
        default=SupplierStatus.active,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(datetime2(), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        datetime2(), default=_now, onupdate=_now, nullable=False
    )

    clearances: Mapped[list["SupplierClearance"]] = relationship(
        back_populates="supplier",
        order_by="desc(SupplierClearance.created_at)",
        cascade="all, delete-orphan",
    )
