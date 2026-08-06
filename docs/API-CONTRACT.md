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
| POST | `/auth/login` | Iniciar sesión (`{email, password}`) → token + usuario | Público |
| GET | `/auth/me` | Usuario autenticado actual | Autenticado |

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
| POST | `/concepts` | Crear concepto | `concept:edit` (Admin) |
| PATCH | `/concepts/{concept_id}` | Actualizar concepto | `concept:edit` (Admin) |

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
