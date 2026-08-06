"""Supplier helpers — effective clearance derivation.

The system never screens suppliers; it only records an externally provided
clearance result. Per the business rule, an *expired* clearance counts as
"not cleared".
"""
from __future__ import annotations

from datetime import date

from ..enums import ClearanceStatus
from ..models import Supplier
from ..schemas.supplier import ClearanceSummary, SupplierOut


def clearance_summary(supplier: Supplier, today: date | None = None) -> ClearanceSummary:
    today = today or date.today()
    # `clearances` is ordered newest-first by the relationship.
    latest = supplier.clearances[0] if supplier.clearances else None
    if latest is None:
        return ClearanceSummary(has_record=False, effective_status="none")

    is_expired = bool(latest.valid_until and latest.valid_until < today)

    if latest.status == ClearanceStatus.cleared and is_expired:
        effective = "expired"
    else:
        effective = latest.status.value

    return ClearanceSummary(
        has_record=True,
        status=latest.status,
        effective_status=effective,
        valid_until=latest.valid_until,
        is_expired=is_expired,
    )


def to_out(supplier: Supplier) -> SupplierOut:
    return SupplierOut(
        id=supplier.id,
        legal_name=supplier.legal_name,
        rfc=supplier.rfc,
        contact_name=supplier.contact_name,
        email=supplier.email,
        phone=supplier.phone,
        bank_name=supplier.bank_name,
        bank_account=supplier.bank_account,
        clabe=supplier.clabe,
        status=supplier.status,
        created_at=supplier.created_at,
        updated_at=supplier.updated_at,
        clearance=clearance_summary(supplier),
    )
