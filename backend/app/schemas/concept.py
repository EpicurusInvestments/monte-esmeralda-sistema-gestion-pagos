"""Concept catalog schemas."""
from __future__ import annotations

from pydantic import BaseModel


class ConceptBase(BaseModel):
    code: str
    name: str
    parent_id: str | None = None
    section: str
    is_header: bool = False
    sort_order: int = 0
    active: bool = True


class ConceptCreate(ConceptBase):
    pass


class ConceptUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    parent_id: str | None = None
    section: str | None = None
    is_header: bool | None = None
    sort_order: int | None = None
    active: bool | None = None


class ConceptOut(ConceptBase):
    id: str
    # Convenience fields for pickers so visually identical leaf names in
    # different groups stay distinguishable.
    parent_name: str | None = None
    path: str | None = None  # "Group › Subgroup › Concept"

    model_config = {"from_attributes": True}
