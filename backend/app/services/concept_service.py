"""Concept catalog helpers — hierarchy, labels and leaf validation."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..errors import ConceptMustBeLeaf, NotFound
from ..models import Concept
from ..schemas.concept import ConceptOut


def get_concept(db: Session, concept_id: str) -> Concept:
    concept = db.get(Concept, concept_id)
    if concept is None:
        raise NotFound("El concepto indicado no existe.")
    return concept


def validate_leaf(db: Session, concept_id: str) -> Concept:
    """Ensure the concept exists and is a selectable leaf (not a header)."""
    concept = get_concept(db, concept_id)
    if concept.is_header:
        raise ConceptMustBeLeaf()
    return concept


def build_path(db: Session, concept: Concept, _cache: dict[str, Concept] | None = None) -> str:
    """Return a human-readable path like 'EGRESOS › Costos Directos › Edificación'."""
    cache = _cache if _cache is not None else {}
    names: list[str] = []
    current: Concept | None = concept
    guard = 0
    while current is not None and guard < 20:
        names.append(current.name)
        guard += 1
        if current.parent_id is None:
            break
        parent = cache.get(current.parent_id) or db.get(Concept, current.parent_id)
        if parent is not None:
            cache[parent.id] = parent
        current = parent
    return " › ".join(reversed(names))


def to_out(db: Session, concept: Concept, cache: dict[str, Concept] | None = None) -> ConceptOut:
    parent = None
    if concept.parent_id:
        parent = (cache or {}).get(concept.parent_id) or db.get(Concept, concept.parent_id)
    return ConceptOut(
        id=concept.id,
        code=concept.code,
        name=concept.name,
        parent_id=concept.parent_id,
        section=concept.section,
        is_header=concept.is_header,
        sort_order=concept.sort_order,
        active=concept.active,
        parent_name=parent.name if parent else None,
        path=build_path(db, concept, cache),
    )


def list_concepts(db: Session) -> list[ConceptOut]:
    concepts = list(db.execute(select(Concept)).scalars())
    cache = {c.id: c for c in concepts}
    ordered = sorted(concepts, key=lambda c: (c.section, c.code))
    return [to_out(db, c, cache) for c in ordered]
