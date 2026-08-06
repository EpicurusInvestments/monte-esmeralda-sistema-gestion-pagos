"""Supplier and clearance schemas."""
from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, EmailStr

from ..enums import ClearanceStatus, SupplierStatus


class SupplierBase(BaseModel):
    legal_name: str
    rfc: str | None = None
    contact_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    bank_name: str | None = None
    bank_account: str | None = None
    clabe: str | None = None
    status: SupplierStatus = SupplierStatus.active


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    legal_name: str | None = None
    rfc: str | None = None
    contact_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    bank_name: str | None = None
    bank_account: str | None = None
    clabe: str | None = None
    status: SupplierStatus | None = None


class ClearanceCreate(BaseModel):
    status: ClearanceStatus
    clearance_date: date | None = None
    valid_until: date | None = None
    compliance_reference: str | None = None
    notes: str | None = None


class ClearanceOut(BaseModel):
    id: str
    supplier_id: str
    status: ClearanceStatus
    clearance_date: date | None
    valid_until: date | None
    compliance_reference: str | None
    notes: str | None
    created_by: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ClearanceSummary(BaseModel):
    """Derived, effective clearance status for display.

    `effective_status` collapses an expired "cleared" record to "not cleared".
    """

    has_record: bool
    status: ClearanceStatus | None = None
    effective_status: str  # cleared / pending / blocked / expired / none
    valid_until: date | None = None
    is_expired: bool = False


class SupplierOut(SupplierBase):
    id: str
    created_at: datetime
    updated_at: datetime
    clearance: ClearanceSummary

    model_config = {"from_attributes": True}
