"""Concept Catalog (Concepto de Flujo) model — hierarchical master data.

`is_header = True` rows are organizational groupings and are NOT selectable as a
Solicitud concept. Only leaf concepts (`is_header = False`) may be assigned.
"""
from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base, GUID, new_uuid


class Concept(Base):
    __tablename__ = "concepts"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=new_uuid)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_id: Mapped[str | None] = mapped_column(
        GUID, ForeignKey("concepts.id"), nullable=True, index=True
    )
    section: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    is_header: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    parent: Mapped["Concept | None"] = relationship(
        remote_side="Concept.id", backref="children"
    )
