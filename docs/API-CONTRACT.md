# API-CONTRACT — Sistema de Gestión de Pagos y Flujo de Efectivo (Monte Esmeralda)

> Documento vivo. La fuente técnica exacta de firmas/payloads es el **OpenAPI** que genera
> FastAPI (`/docs`). Este documento agrega el contexto de negocio: propósito, permiso
> requerido, reglas y errores. Actualízalo en el mismo PR que cambie un endpoint (skill
> `documentacion-proyecto`).

## Convenciones

- **Base:** las rutas van a nivel raíz (p.ej. `/solicitudes`). **No hay prefijo `/api/v1`**
  hoy; el versionado es una decisión futura (no cambiar sin acordar, impacta al frontend).
- **Autenticación:** JWT `Bearer` en `Authorization`, salvo `POST /auth/login`. El usuario
  se resuelve del token (`get_current_user`).
- **Permisos:** los endpoints de catálogos/usuarios usan el guard `require_capability(...)`;
  los de **Solicitudes** validan permiso y visibilidad **dentro del servicio**
  (`workflow.py` / `can_view_solicitud`), no con un guard de router.
- **Errores:** formato uniforme `{ "code": "...", "message": "..." }` con el status
  correspondiente (401 no autenticado, 403 sin permiso, 404 no encontrado, 409 transición
  de estado inválida, 422 validación).

## Auth

| Método | Ruta | Propósito | Permiso |
|---|---|---|---|
| POST | `/auth/login` | Iniciar sesión (`{email, password}`) → `{access_token, token_type, user}` | Público |
| GET | `/auth/me` | Usuario autenticado actual (`UserOut`) | Autenticado |

La respuesta de `POST /auth/login` es `TokenResponse`: el campo del token se llama
**`access_token`** (no `token`), `token_type` es `"bearer"` y `user` es el `UserOut`
(`id, email, full_name, role, is_active`). El frontend guarda **`access_token`** en
`localStorage` y lo manda como `Authorization: Bearer <access_token>`. Credenciales
incorrectas → **401** con `{"code": "AUTHENTICATION_ERROR", ...}`.

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "token_type": "bearer",
  "user": {
    "id": "f7215c97-5211-499b-92c2-7b4db603c225",
    "email": "admin@monteesmeralda.mx",
    "full_name": "Administrador del Sistema",
    "role": "admin",
    "is_active": true
  }
}
```

## Usuarios (`/users`) — solo Admin (`user:manage`)

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/users` | Listar usuarios |
| POST | `/users` | Crear usuario (`email, full_name, role, password`) |
| PATCH | `/users/{user_id}` | Actualizar (`full_name, role, is_active, password`) |

## Proveedores (`/suppliers`)

| Método | Ruta | Propósito | Permiso |
|---|---|---|---|
| GET | `/suppliers` | Listar proveedores | `supplier:view` |
| POST | `/suppliers` | Crear proveedor | `supplier:create` |
| GET | `/suppliers/{supplier_id}` | Detalle | `supplier:view` |
| PATCH | `/suppliers/{supplier_id}` | Actualizar | `supplier:edit` |
| GET | `/suppliers/{supplier_id}/clearances` | Listar cumplimientos del proveedor | `supplier:view` |
| POST | `/suppliers/{supplier_id}/clearances` | Registrar cumplimiento | `clearance:create` (Admin) |

## Conceptos (`/concepts`)

| Método | Ruta | Propósito | Permiso |
|---|---|---|---|
| GET | `/concepts?leaves_only=&active_only=` | Listar el catálogo (árbol); `leaves_only` filtra hojas asignables | `concept:view` |
| POST | `/concepts` | Crear concepto → **201** | `concept:edit` (Admin) |
| PATCH | `/concepts/{concept_id}` | Actualizar concepto → **200** | `concept:edit` (Admin) |

**`ConceptOut`** (respuesta de los tres endpoints) devuelve, además de los campos propios
(`id`, `code`, `name`, `parent_id`, `section`, `is_header`, `sort_order`, `active`), dos
campos **derivados de solo lectura** que calcula `concept_service.to_out`:

- **`parent_name`** — nombre del concepto padre (`null` si es raíz).
- **`path`** — ruta legible completa, `"Grupo › Subgrupo › Concepto"` (separador `›`, U+203A).
  Sirve para distinguir hojas con nombre idéntico en grupos distintos.

**`POST /concepts`** — body: `{code, name, section, parent_id?, is_header?, sort_order?,
active?}`. Defaults del backend: `parent_id=null`, `is_header=false`, `sort_order=0`,
`active=true`. El **código es único**; si ya existe responde **422**:

```json
{ "code": "VALIDATION_ERROR", "message": "Ya existe un concepto con ese código." }
```

**`PATCH /concepts/{concept_id}`** — todos los campos son opcionales (`exclude_unset`): solo
se actualiza lo enviado. Si el id no existe → **404** `NOT_FOUND`.

**No hay borrado.** El catálogo se da de baja **lógicamente** con `active = false`: no existe
`DELETE /concepts`. Un concepto inactivo sigue siendo visible con `active_only=false` y
conserva su historial en las Solicitudes que ya lo referencian.

> Los `parent_id` que apuntan a otra sección y los ciclos en el árbol **no se validan** hoy
> (ni en backend ni en frontend). Ver `docs/modulos/conceptos.md`.

## Solicitudes de Pago (`/solicitudes`)

Permisos validados en el servicio. Listado/detalle respetan `can_view_solicitud` (Tesorería
solo ve `supervisor_approved`, `cfo_approved`, `deferred`).

| Método | Ruta | Propósito | Regla clave |
|---|---|---|---|
| GET | `/solicitudes` | Listar (filtros: `status`, `supplier_id`, `concept_id`, `request_type`, `date_from`, `date_to`) | Visibilidad por rol |
| GET | `/solicitudes/{id}` | Detalle (incluye adjuntos, comentarios, auditoría) | Visibilidad por rol |
| POST | `/solicitudes` | Crear en `draft` | `solicitud:create` (Admin/Campo) |
| PATCH | `/solicitudes/{id}` | Editar | Solo dueño/Admin y solo en `draft`/`correction_requested` |
| POST | `/solicitudes/{id}/submit` | Enviar a revisión → `submitted` | Requiere proveedor, descripción, monto > 0 y ≥1 adjunto |
| POST | `/solicitudes/{id}/assign-concept` | Asignar concepto final (`{final_concept_id}`) | Supervisor; concepto debe ser **hoja**; estado `submitted` |
| POST | `/solicitudes/{id}/supervisor-approve` | Aprobar operativamente → `supervisor_approved` | Supervisor; requiere concepto final hoja, monto, proveedor, adjunto |
| POST | `/solicitudes/{id}/cfo-approve` | Aprobar financieramente → `cfo_approved` | CFO; desde `supervisor_approved` |
| POST | `/solicitudes/{id}/defer` | Diferir → `deferred` | CFO; desde `supervisor_approved` |
| POST | `/solicitudes/{id}/reject` | Rechazar → `rejected` (terminal) | Supervisor (desde `submitted`) o CFO (desde `supervisor_approved`) |
| POST | `/solicitudes/{id}/request-correction` | Solicitar corrección → `correction_requested` | Supervisor o CFO según etapa |
| POST | `/solicitudes/{id}/cancel` | Cancelar → `cancelled` | Dueño/Admin; desde `draft`/`correction_requested` |

Las acciones de flujo aceptan `reason` opcional, que se guarda en la auditoría. Ver la
máquina de estados completa en `docs/modulos/solicitudes-de-pago.md`.

## Adjuntos (`/solicitudes/{solicitud_id}/attachments`)

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/solicitudes/{id}/attachments` | Listar adjuntos |
| POST | `/solicitudes/{id}/attachments` | Subir adjunto (multipart `file`) — delega en `storage.py` |
| GET | `/solicitudes/{id}/attachments/{attachment_id}/download` | Descargar adjunto |

> **Endurecimiento pendiente:** validar tamaño/tipo al subir y servir la descarga por
> streaming.

## Comentarios (`/solicitudes/{solicitud_id}/comments`)

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/solicitudes/{id}/comments` | Listar comentarios |
| POST | `/solicitudes/{id}/comments` | Agregar comentario (`{body}`) |

## Auditoría (`/audit-events`) — requiere `audit:view`

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/audit-events` | Listar eventos de auditoría (bitácora append-only) |

## Salud

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/health` | Estado del servicio |
