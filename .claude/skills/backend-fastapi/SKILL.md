---
name: backend-fastapi
description: >
  Convenciones para implementar la lógica de backend del Sistema de Gestión de Pagos y
  Flujo de Efectivo (Monte Esmeralda) con Python, FastAPI, Pydantic v2 y SQLAlchemy 2.x
  sobre SQLite (dev) y SQL Server (prod). Úsala SIEMPRE que se vaya a escribir o modificar
  código de backend: endpoints, servicios, modelos, schemas, validaciones, transiciones de
  la máquina de estados, RBAC por capacidades o auditoría. Asegura el respeto a las capas
  (router → service) y a la máquina de estados única de app/services/workflow.py. El
  backend se continúa de forma incremental; no se reescribe ni se reestructura desde cero.
---

# Skill: backend-fastapi

Cómo implementar o modificar backend respetando las capas y el código existente.

## Arquitectura por capas (no romperla)

```
router.py  →  service.py  →  SQL (SQLAlchemy Session)
(API/HTTP)    (negocio + datos)
```

- **router** (`app/routers/`): HTTP ↔ negocio. Valida permisos (con `require_capability`),
  usa schemas Pydantic y delega TODO al servicio. Cero lógica de negocio.
- **service** (`app/services/`): reglas de negocio, máquina de estados, transacciones,
  auditoría, y **acceso a datos** mediante la `Session` de SQLAlchemy.
- **No hay capa `repository`** en este proyecto: los servicios usan la `Session`
  directamente. No introducir una capa repository en el código existente.
- Nunca devolver entidades SQLAlchemy crudas desde el router: siempre schemas (`XxxRead` /
  `XxxDetail`).

## La referencia es el código actual (no una spec externa)

- Entidades, campos (**snake_case en inglés**: `net_amount`, `final_concept_id`,
  `supervisor_reviewed_by`), tipos y valores de estado son los que ya existen. No se
  renombran ni se "mejoran". Duda → preguntar.
- Enums en `app/enums.py` (`Role`, `SolicitudStatus`, `RequestType`, `ClearanceStatus`,
  `AuditAction`) son la **fuente única** de valores. No inventar estados.
- Constantes de negocio viven en configuración (`config.py`), no repetidas por el código.

## Máquina de estados (patrón obligatorio — `app/services/workflow.py`)

`workflow.py` es la **única puerta** para cambiar el estado de una Solicitud. Cada
transición es una función que: (1) valida permiso, (2) valida el estado de origen,
(3) valida precondiciones, (4) aplica el cambio, (5) registra auditoría. Patrón real:

```python
def submit_solicitud(db, user, solicitud):
    # 1) permiso (dueño/admin + capacidad)
    if not (solicitud.captured_by == user.id or user.role.value == "admin"):
        raise PermissionDenied()
    if not permissions.has_capability(user, permissions.SOLICITUD_SUBMIT):
        raise PermissionDenied()
    # 2) estado de origen válido
    if solicitud.status not in {SolicitudStatus.draft, SolicitudStatus.correction_requested}:
        raise InvalidWorkflowTransition("...")
    # 3) precondiciones (proveedor, descripción, monto > 0, ≥1 adjunto)
    _validate_submittable(solicitud)
    # 4) aplicar
    before = _snapshot(solicitud)
    solicitud.status = SolicitudStatus.submitted
    solicitud.submitted_at = _now()
    db.flush()
    # 5) auditar
    audit.record_event(db, entity_type="solicitud", entity_id=solicitud.id,
                       action=AuditAction.submitted.value, performed_by=user,
                       before=before, after=_snapshot(solicitud))
    return solicitud
```

Transiciones vigentes (respetarlas tal cual; ver el diagrama en `docs/modulos/`):
`draft → submitted → supervisor_approved → cfo_approved`, con ramas
`correction_requested` (reeditable y reenviable), `deferred` (CFO), `rejected` (terminal)
y `cancelled` (desde `draft`/`correction_requested`). Una transición no permitida →
`InvalidWorkflowTransition` (el handler la traduce a HTTP 409).

Precondiciones clave que no se relajan: para **enviar** y para **aprobar (Supervisor)** se
exige proveedor, monto > 0 y ≥1 adjunto; para aprobar el Supervisor además un
**concepto final que sea hoja** (`concept_service.validate_leaf`).

## Endpoint con permiso (patrón)

```python
@router.post("/{solicitud_id}/submit", response_model=SolicitudDetail,
             dependencies=[Depends(require_capability(SOLICITUD_SUBMIT))])
def submit(solicitud_id: str, db: Session = Depends(get_db),
           user: User = Depends(get_current_user)):
    solicitud = _get_or_404(db, solicitud_id)
    return workflow.submit_solicitud(db, user, solicitud)
```

- `require_capability(cap)` (de `app/deps.py`) es el guard del router.
- El usuario actual se resuelve del **JWT** en `get_current_user`, nunca del cliente.
- **Defensa en profundidad:** aunque el router aplique el guard, el servicio vuelve a
  validar permiso, dueño y precondiciones. Mantener ese doble control.

## RBAC por capacidades

- Las capacidades por rol viven en `app/services/permissions.py` como conjuntos (datos, no
  `if` repartidos). Chequeo: `permissions.has_capability(user, cap)`.
- Visibilidad especial: Tesorería solo ve solicitudes `supervisor_approved`, `cfo_approved`
  y `deferred` (`can_view_solicitud`).
- **No hay permisos a nivel de campo** en este sistema. No introducirlos sin un alcance
  nuevo acordado.

## Auditoría

- Toda transición y toda edición sensible registran un evento vía `services/audit.py`
  (`record_event`): `entity_type`, `entity_id`, `action`, `performed_by`, `before_json`,
  `after_json`, `reason`. La bitácora `audit_events` es **append-only**.
- Un servicio que cambie una Solicitud sin registrar su evento está incompleto.

## SQL Server / SQLite (notas)

- PKs UUID por el tipo **GUID portable** de `database.py` (hoy `CHAR(36)`; en SQL Server,
  decisión `CHAR(36)` vs `UNIQUEIDENTIFIER` — Frente 2). Textos con `Unicode`
  (→ `NVARCHAR` en SQL Server). Dinero `Numeric`/`DECIMAL(14,2)`, nunca float. Estados con
  el tipo `Enum` de SQLAlchemy (→ `VARCHAR` + CHECK en ambos dialectos).
- Endpoints **síncronos** (`def`) con pyodbc en prod; no mezclar `async def` con acceso
  síncrono. Engine/sesión central en `app/database.py`.
- Cambios de esquema SOLO por Alembic (skill `migraciones-sqlserver`).

## Cargas de archivo

- Los adjuntos se guardan/leen SIEMPRE por `app/services/storage.py` (abstracción S3;
  disco en dev). No tocar disco/bucket desde el router.
- **Endurecimiento pendiente:** validar tamaño/tipo antes de guardar y servir la descarga
  por streaming.

## Calidad y cierre

- Tipos en todo. Pruebas con **pytest**: casos felices, validaciones de dominio y, sobre
  todo, **transiciones de estado**. (Recomendado incorporar `ruff` + `mypy`; aún no están.)
- Actualizar `docs/API-CONTRACT.md` y la ficha del módulo (skill `documentacion-proyecto`).
- Pasar `revision-modulo` antes del PR.
