"""Schemas for the read-only role/capability matrix."""
from __future__ import annotations

from pydantic import BaseModel


class CapabilityOut(BaseModel):
    """Una capacidad del sistema, con su texto legible y el área a la que pertenece."""

    code: str
    label: str
    group: str


class RolePermissionsOut(BaseModel):
    """Un rol con las capacidades que tiene hoy, en el orden del catálogo."""

    value: str
    label: str
    capabilities: list[CapabilityOut]
    note: str | None = None


class RolesPermissionsOut(BaseModel):
    """Matriz completa: los roles y el catálogo de capacidades para cruzarlos."""

    roles: list[RolePermissionsOut]
    capabilities: list[CapabilityOut]
