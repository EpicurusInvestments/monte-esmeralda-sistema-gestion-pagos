"""Read-only role/capability matrix (Admin only).

Expone `ROLE_CAPABILITIES` de `services/permissions.py` en forma legible, para que el Admin
pueda CONSULTAR qué puede cada rol sin abrir el código. Es solo lectura a propósito: la matriz
vive en código, así que no hay nada que escribir. Habilitar la edición implica moverla a la base
de datos (ver el BACKLOG); hasta entonces este router **no** crece con escrituras.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from ..deps import require_capability
from ..enums import Role
from ..labels import CAPABILITY_LABELS, ROLE_LABELS, ROLE_NOTES
from ..models import User
from ..schemas.roles_permissions import (
    CapabilityOut,
    RolePermissionsOut,
    RolesPermissionsOut,
)
from ..services import permissions

router = APIRouter(prefix="/roles-permissions", tags=["roles-permissions"])

_admin = require_capability(permissions.USER_MANAGE)


def _capability_out(code: str) -> CapabilityOut:
    meta = CAPABILITY_LABELS.get(code)
    if meta is None:
        # Capacidad agregada a permissions.py sin etiquetar: se expone igual —nunca se oculta
        # un permiso real— y `tests/test_roles_permissions.py` falla para que se etiquete.
        return CapabilityOut(code=code, label=code, group="Sin clasificar")
    return CapabilityOut(code=code, label=meta.label, group=meta.group)


def _catalogo() -> list[CapabilityOut]:
    """Catálogo completo, en el orden de `CAPABILITY_LABELS` más lo que no esté etiquetado."""
    conocidas = list(CAPABILITY_LABELS)
    usadas = {cap for caps in permissions.ROLE_CAPABILITIES.values() for cap in caps}
    extras = sorted(usadas - set(conocidas))
    return [_capability_out(code) for code in [*conocidas, *extras]]


@router.get("", response_model=RolesPermissionsOut)
def get_roles_permissions(_: User = Depends(_admin)) -> RolesPermissionsOut:
    catalogo = _catalogo()
    # El orden de las capacidades de cada rol sale del catálogo, no del `set`: así la respuesta
    # es estable entre llamadas y la UI puede cruzarla contra el catálogo directamente.
    roles = [
        RolePermissionsOut(
            value=role.value,
            label=ROLE_LABELS.get(role, role.value),
            capabilities=[
                cap
                for cap in catalogo
                if cap.code in permissions.ROLE_CAPABILITIES.get(role, set())
            ],
            note=ROLE_NOTES.get(role),
        )
        for role in Role
    ]
    return RolesPermissionsOut(roles=roles, capabilities=catalogo)
