"""Etiquetas legibles (es-MX) del dominio.

Viven en el backend a propósito: son el texto que la UI muestra **tal cual**, así que tenerlas
aquí evita que el frontend reinvente el criterio (y que dos clientes describan el mismo permiso
de forma distinta). El catálogo de capacidades es además la fuente del ORDEN en que se
presentan: `ROLE_CAPABILITIES` usa `set`, que no tiene orden, y una respuesta que cambie de
orden entre llamadas es una mala API.

Regla: cuando se agregue una capacidad a `services/permissions.py`, hay que etiquetarla aquí.
`tests/test_roles_permissions.py` falla si alguna queda sin etiqueta.
"""
from __future__ import annotations

from typing import NamedTuple

from .enums import Role
from .services import permissions as perms

ROLE_LABELS: dict[Role, str] = {
    Role.admin: "Administrador",
    Role.engineer: "Ingeniería",
    Role.accountant: "Contabilidad",
    Role.field_admin: "Administrador de Campo",
    Role.supervisor: "Supervisor",
    Role.cfo: "Director de Finanzas (CFO)",
    Role.treasurer: "Tesorería",
    Role.ceo: "Director General (CEO)",
}


class CapabilityMeta(NamedTuple):
    label: str
    group: str


# Grupos (áreas funcionales) con los que la UI agrupa la matriz.
GROUP_SOLICITUDES = "Solicitudes de Pago"
GROUP_PROVEEDORES = "Proveedores"
GROUP_CATALOGO = "Catálogo de Conceptos"
GROUP_AUDITORIA = "Auditoría"
GROUP_ADMIN = "Administración"

# El ORDEN de este diccionario es el orden de presentación (Python conserva el de inserción).
CAPABILITY_LABELS: dict[str, CapabilityMeta] = {
    perms.SOLICITUD_CREATE: CapabilityMeta("Capturar solicitudes", GROUP_SOLICITUDES),
    perms.SOLICITUD_EDIT_DRAFT: CapabilityMeta(
        "Editar solicitudes en borrador", GROUP_SOLICITUDES
    ),
    perms.SOLICITUD_SUBMIT: CapabilityMeta("Enviar solicitudes a revisión", GROUP_SOLICITUDES),
    perms.SOLICITUD_UPLOAD: CapabilityMeta("Adjuntar documentos", GROUP_SOLICITUDES),
    perms.SOLICITUD_VIEW_OWN: CapabilityMeta("Ver sus propias solicitudes", GROUP_SOLICITUDES),
    perms.SOLICITUD_VIEW_ALL: CapabilityMeta("Ver todas las solicitudes", GROUP_SOLICITUDES),
    perms.SUPERVISOR_REVIEW: CapabilityMeta(
        "Revisión operativa: aprobar, rechazar, pedir corrección y asignar el concepto final",
        GROUP_SOLICITUDES,
    ),
    perms.CFO_REVIEW: CapabilityMeta(
        "Revisión financiera: aprobar, rechazar, diferir y pedir corrección",
        GROUP_SOLICITUDES,
    ),
    perms.SUPPLIER_VIEW: CapabilityMeta("Ver proveedores", GROUP_PROVEEDORES),
    perms.SUPPLIER_CREATE: CapabilityMeta("Dar de alta proveedores", GROUP_PROVEEDORES),
    perms.SUPPLIER_EDIT: CapabilityMeta("Editar proveedores", GROUP_PROVEEDORES),
    perms.CLEARANCE_VIEW: CapabilityMeta(
        "Ver el cumplimiento de un proveedor", GROUP_PROVEEDORES
    ),
    perms.CLEARANCE_CREATE: CapabilityMeta(
        "Registrar el cumplimiento de un proveedor", GROUP_PROVEEDORES
    ),
    perms.CONCEPT_VIEW: CapabilityMeta("Ver el catálogo de conceptos", GROUP_CATALOGO),
    perms.CONCEPT_EDIT: CapabilityMeta("Editar el catálogo de conceptos", GROUP_CATALOGO),
    perms.AUDIT_VIEW: CapabilityMeta("Ver la bitácora de auditoría", GROUP_AUDITORIA),
    perms.USER_MANAGE: CapabilityMeta("Administrar usuarios y sus roles", GROUP_ADMIN),
}

# Matices que la matriz sola no comunica, porque no son capacidades sino reglas de
# visibilidad (`permissions.can_view_solicitud`).
ROLE_NOTES: dict[Role, str] = {
    Role.treasurer: (
        "Aunque tiene «Ver todas las solicitudes», Tesorería solo ve las que ya pasaron "
        "revisión: aprobadas por Supervisor, aprobadas por CFO y diferidas."
    ),
    Role.field_admin: (
        "Solo ve y edita las solicitudes que capturó, y únicamente mientras están en "
        "borrador o con corrección solicitada."
    ),
}
