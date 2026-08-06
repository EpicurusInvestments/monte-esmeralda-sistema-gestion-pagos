"""Concept catalog routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_capability
from ..errors import NotFound, ValidationError
from ..models import Concept, User
from ..schemas.concept import ConceptCreate, ConceptOut, ConceptUpdate
from ..services import permissions
from ..services.concept_service import list_concepts, to_out

router = APIRouter(prefix="/concepts", tags=["concepts"])

_view = require_capability(permissions.CONCEPT_VIEW)
_edit = require_capability(permissions.CONCEPT_EDIT)


@router.get("", response_model=list[ConceptOut])
def get_concepts(
    leaves_only: bool = False,
    active_only: bool = True,
    db: Session = Depends(get_db),
    _: User = Depends(_view),
) -> list[ConceptOut]:
    items = list_concepts(db)
    if active_only:
        items = [c for c in items if c.active]
    if leaves_only:
        items = [c for c in items if not c.is_header]
    return items


@router.post("", response_model=ConceptOut, status_code=201)
def create_concept(
    payload: ConceptCreate, db: Session = Depends(get_db), _: User = Depends(_edit)
) -> ConceptOut:
    exists = db.execute(
        select(Concept).where(Concept.code == payload.code)
    ).scalar_one_or_none()
    if exists:
        raise ValidationError("Ya existe un concepto con ese código.")
    concept = Concept(**payload.model_dump())
    db.add(concept)
    db.commit()
    db.refresh(concept)
    return to_out(db, concept)


@router.patch("/{concept_id}", response_model=ConceptOut)
def update_concept(
    concept_id: str,
    payload: ConceptUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_edit),
) -> ConceptOut:
    concept = db.get(Concept, concept_id)
    if concept is None:
        raise NotFound("El concepto indicado no existe.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(concept, field, value)
    db.commit()
    db.refresh(concept)
    return to_out(db, concept)
