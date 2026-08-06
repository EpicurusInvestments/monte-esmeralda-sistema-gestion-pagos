"""Supplier and clearance routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_capability
from ..errors import SupplierNotFound
from ..models import Supplier, SupplierClearance, User
from ..schemas.supplier import (
    ClearanceCreate,
    ClearanceOut,
    SupplierCreate,
    SupplierOut,
    SupplierUpdate,
)
from ..services import permissions
from ..services.supplier_service import to_out

router = APIRouter(prefix="/suppliers", tags=["suppliers"])

_view = require_capability(permissions.SUPPLIER_VIEW)
_create = require_capability(permissions.SUPPLIER_CREATE)
_edit = require_capability(permissions.SUPPLIER_EDIT)
_clearance = require_capability(permissions.CLEARANCE_CREATE)


def _get(db: Session, supplier_id: str) -> Supplier:
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise SupplierNotFound()
    return supplier


@router.get("", response_model=list[SupplierOut])
def list_suppliers(
    db: Session = Depends(get_db), _: User = Depends(_view)
) -> list[SupplierOut]:
    suppliers = db.execute(select(Supplier).order_by(Supplier.legal_name)).scalars()
    return [to_out(s) for s in suppliers]


@router.post("", response_model=SupplierOut, status_code=201)
def create_supplier(
    payload: SupplierCreate, db: Session = Depends(get_db), _: User = Depends(_create)
) -> SupplierOut:
    supplier = Supplier(**payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return to_out(supplier)


@router.get("/{supplier_id}", response_model=SupplierOut)
def get_supplier(
    supplier_id: str, db: Session = Depends(get_db), _: User = Depends(_view)
) -> SupplierOut:
    return to_out(_get(db, supplier_id))


@router.patch("/{supplier_id}", response_model=SupplierOut)
def update_supplier(
    supplier_id: str,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_edit),
) -> SupplierOut:
    supplier = _get(db, supplier_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return to_out(supplier)


@router.get("/{supplier_id}/clearances", response_model=list[ClearanceOut])
def list_clearances(
    supplier_id: str, db: Session = Depends(get_db), _: User = Depends(_view)
) -> list[SupplierClearance]:
    _get(db, supplier_id)
    return list(
        db.execute(
            select(SupplierClearance)
            .where(SupplierClearance.supplier_id == supplier_id)
            .order_by(SupplierClearance.created_at.desc())
        ).scalars()
    )


@router.post(
    "/{supplier_id}/clearances", response_model=ClearanceOut, status_code=201
)
def create_clearance(
    supplier_id: str,
    payload: ClearanceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_clearance),
) -> SupplierClearance:
    _get(db, supplier_id)
    clearance = SupplierClearance(
        supplier_id=supplier_id,
        created_by=user.id,
        **payload.model_dump(),
    )
    db.add(clearance)
    db.commit()
    db.refresh(clearance)
    return clearance
