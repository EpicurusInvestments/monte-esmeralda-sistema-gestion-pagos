# Módulo: solicitudes-de-pago — Solicitudes de Pago (núcleo del Paquete 1)

> Ficha viva del módulo central del sistema. Actualízala en el mismo PR que cambie su
> modelo, estados o pantallas (skill `documentacion-proyecto`).

## Propósito

Registrar y procesar los pagos a proveedores mediante un flujo de **aprobación por
niveles**: captura → revisión operativa (Supervisor) → aprobación financiera (CFO) →
visibilidad de Tesorería. Todo el ciclo es auditado.

## Alcance

- **Incluye:** captura/edición de solicitudes, adjuntos, comentarios, catálogo de conceptos
  (árbol), proveedores y su cumplimiento, y la máquina de estados con su auditoría.
- **No incluye (Paquete 2):** selección y ejecución de pagos (remesas), saldo/conciliación
  bancaria, flujo de efectivo, reportería y fiscal.

## Entidades

| Entidad | Campos clave | Relaciones | Notas |
|---|---|---|---|
| `solicitudes` | `folio` (único), `request_type`, `net_amount`, `status`, `document_date`, `due_date`, `proposed_payment_week`, `submitted_at`, `*_reviewed_at` | `supplier_id`, `proposed_concept_id`, `final_concept_id`, `captured_by`, `supervisor_reviewed_by`, `cfo_reviewed_by` | Entidad central |
| `suppliers` | `legal_name`, `rfc`, datos bancarios, `status` | 1:N con `supplier_clearances` | Solo dato; sin acceso |
| `supplier_clearances` | `status`, `clearance_date`, `valid_until`, `compliance_reference` | `supplier_id` | Bloqueo duro = pendiente |
| `concepts` | `code` (único), `name`, `is_header`, `sort_order`, `active` | `parent_id` (árbol) | Solo hojas asignables |
| `attachments` | `file_name`, `file_path_or_s3_key`, `content_type` | `solicitud_id`, `uploaded_by` | Vía `storage.py` |
| `comments` | `body` | `solicitud_id`, `author_id` | |
| `audit_events` | `entity_type`, `entity_id`, `action`, `before_json`, `after_json`, `reason` | `performed_by` | Append-only, polimórfica |

## Estados y transiciones

Estados (`SolicitudStatus`): `draft`, `submitted`, `correction_requested`,
`supervisor_approved`, `cfo_approved`, `deferred`, `rejected`, `cancelled`.

Todas las transiciones se implementan en `app/services/workflow.py` (única puerta) y quedan
auditadas con snapshot antes/después.

| Transición | Origen → Destino | Rol | Precondiciones |
|---|---|---|---|
| Crear | — → `draft` | Admin/Campo | — |
| Enviar | `draft` / `correction_requested` → `submitted` | Dueño/Admin | proveedor, descripción, monto > 0, ≥1 adjunto |
| Asignar concepto | `submitted` → `submitted` | Supervisor | concepto **hoja** |
| Aprobar (Supervisor) | `submitted` → `supervisor_approved` | Supervisor | concepto final hoja + monto + proveedor + adjunto |
| Aprobar (CFO) | `supervisor_approved` → `cfo_approved` | CFO | — |
| Diferir | `supervisor_approved` → `deferred` | CFO | — |
| Solicitar corrección | `submitted` / `supervisor_approved` → `correction_requested` | Supervisor / CFO | — |
| Rechazar | `submitted` / `supervisor_approved` → `rejected` (terminal) | Supervisor / CFO | — |
| Cancelar | `draft` / `correction_requested` → `cancelled` (terminal) | Dueño/Admin | — |

Camino feliz: `draft → submitted → supervisor_approved → cfo_approved`.

## Endpoints

Ver `docs/API-CONTRACT.md`, secciones **Solicitudes de Pago**, **Adjuntos**,
**Comentarios**, **Proveedores**, **Conceptos** y **Auditoría**.

## Pantallas

Panorama del módulo (el detalle de lo ya migrado va abajo):

- **Solicitudes** (lista + detalle) — todos los roles, con visibilidad según rol.
- **Capturar / Editar Solicitud** (form) — Admin/Campo.
- **Bandeja de Aprobaciones** — Supervisor (`submitted`).
- **Aprobaciones Financieras** — CFO (`supervisor_approved`).
- **Proveedores** y **Catálogo de Conceptos** — según permisos.
- **Administración** (usuarios) — Admin.
- **Detalle de Solicitud:** info, adjuntos, comentarios, acciones de flujo y línea de tiempo
  de auditoría.

### `/solicitudes` — **Frente 3, parte 1 de 4 (solo lectura)** ✅

Migrada en `frontend/src/modules/solicitudes/`. Patrón **lista + panel de detalle**.

| Zona | Contenido |
|---|---|
| Encabezado | Título “Solicitudes”. **Sin** botón de nueva solicitud (la captura es la parte 2) |
| Toolbar | **Filtros server-side** (van como query params y reconsultan): estado (los 8), tipo, proveedor (Dropdown desde `listSuppliers`) y **rango de fechas de documento** (Calendar → `YYYY-MM-DD`). Además **búsqueda local** por folio o proveedor, botón “Limpiar” y contador |
| Lista | `DataTable`: folio (mono), proveedor, tipo, concepto (`concept_label`), **monto** (MXN, alineado a la derecha), **estado** (`<StatusBadge>`) y fecha de documento |
| Panel derecho | Detalle de **solo lectura** (abajo). Sin selección, estado vacío |

Secciones del panel de detalle:

1. **Encabezado** — folio (mono) + `<StatusBadge>` + tipo.
2. **Datos** — proveedor y su RFC, tipo, descripción, monto (`formatCurrency`), semana de pago
   propuesta, fecha de documento y vencimiento.
3. **Concepto** — propuesto y final, mostrando el `path` completo del árbol; el final puede
   estar sin asignar.
4. **Flujo** — marcas de tiempo de creada / enviada / revisión del Supervisor / revisión del
   CFO. **No** se muestran los UUID de los `*_reviewed_by`: el “quién” lo cuenta la línea de
   tiempo.
5. **Adjuntos** — nombre, tipo y fecha. *(La descarga y la carga se agregaron en la parte 3.)*
6. **Comentarios** — autor, fecha y texto. *(El formulario para comentar se agregó en la
   parte 3.)*
7. **Línea de tiempo** — los `audit_events` en **orden cronológico**, cada uno con su etiqueta
   (`AUDIT_ACTION_LABELS`), quién (`performed_by_name`), cuándo y el motivo si existe. Es la
   bitácora append-only del backend: solo lectura por diseño.

**Visibilidad por rol: la aplica el backend**, no el frontend. `can_view_solicitud` /
`list_solicitudes` restringen a **Tesorería** a `supervisor_approved`, `cfo_approved` y
`deferred` (verificado: recibe 2 de 3 solicitudes y un **403** al pedir una `draft`), y al
**Admin de Campo** a las que capturó. La pantalla pide y muestra lo que le devuelven.

### Captura y edición — **Frente 3, parte 2 de 4** ✅

**`/solicitudes/nueva`** (captura) y **`/solicitudes/:id/editar`** (edición) comparten un
**formulario full-screen por secciones** (`components/SolicitudForm.tsx`, RHF + Zod):

| Sección | Campos |
|---|---|
| Datos generales | **Tipo** (Dropdown con `REQUEST_TYPE_LABELS`, requerido) · **Proveedor** (Dropdown con filtro, requerido) · **Descripción** (textarea, requerida) |
| Importe y concepto | **Monto neto** (InputNumber a 2 decimales, **> 0**; se envía como **STRING** porque el backend lo tipa `Decimal`) · **Concepto propuesto** (opcional) |
| Fechas | **Fecha del documento** y **Vencimiento** (Calendar → `"YYYY-MM-DD"` en horario local) · **Semana de pago propuesta** (texto libre, p.ej. `2026-W31`) |

Detalles de comportamiento:

- **Aviso de cumplimiento del proveedor:** al elegir proveedor se muestra su badge de
  `effective_status` y, si no es `cleared`, un **aviso no bloqueante**. En el Paquete 1 un
  cumplimiento no vigente **no impide capturar**; el bloqueo duro es de la etapa de pago.
- **Selector de concepto:** ofrece **solo hojas activas**, **agrupadas por sección**
  (INGRESOS / EGRESOS — COSTOS / GASTOS / ACTIVOS) y con el `path` del árbol, para distinguir
  hojas homónimas en grupos distintos. Los encabezados no son seleccionables. Es opcional: el
  Supervisor confirma o cambia el **concepto final**.
- Se crea siempre en **`draft`**. Los opcionales vacíos viajan como `null`.
- Los errores del backend se muestran sin perder lo capturado, y el submit se deshabilita
  mientras envía.

**Edición:** solo cuando el estado es **`draft`** o **`correction_requested`** y el usuario es
el **dueño** (`captured_by`) **o Admin** — las mismas tres condiciones que exige
`workflow.update_solicitud` (además de `solicitud:edit_draft`). Si no se cumplen, la pantalla
explica el motivo en vez de ofrecer un formulario que iba a ser rechazado. El backend revalida:
un `PATCH` sobre un estado no editable responde **409** y de otro usuario **403**. Toda edición
financiera queda auditada (`financial_edited`).

**Botones y permisos de UI:**

| Control | Condición |
|---|---|
| **“+ Nueva solicitud”** (encabezado de la lista) y **“Capturar Solicitud”** (sidebar) | `solicitud:create` → **admin** y **field_admin** |
| **“Editar”** (panel de detalle) | estado editable **y** dueño o Admin |

**Sesión expirada (interceptor 401):** si una llamada **autenticada** responde 401, el cliente
limpia el token y avisa a la app; la sesión se vacía y el guard manda a `/login`. El 401 del
**login** queda excluido (son credenciales inválidas y debe llegar al formulario).

**Home por rol:** el Admin de Campo aterriza en la **lista** `/solicitudes`, no en el
formulario en blanco (`ROLE_HOME` en `nav.ts`).

> ⚠️ **Enviar a revisión exige al menos un adjunto** (`workflow.submit`). La carga de adjuntos
> llega en la **parte 3**, así que hasta entonces una solicitud capturada desde la UI **no se
> puede enviar todavía**: se queda en borrador.

### Adjuntos y comentarios — **Frente 3, parte 3 de 4** ✅

Ambas secciones viven **dentro del panel de detalle**, en componentes propios
(`components/SolicitudAdjuntos.tsx` y `components/SolicitudComentarios.tsx`).

#### Adjuntos

**Descargar** lo puede **cualquier rol que vea la solicitud** (`can_view_solicitud`;
verificado con Admin de Campo, Contabilidad y Supervisor). El endpoint exige
`Authorization: Bearer`, así que **un `<a href>` plano no funciona**: el helper
`downloadAttachment` de `shared/lib/api.ts` trae los bytes con `fetch` + token, arma un
`objectURL` con el blob y dispara la descarga con un `<a download>` temporal, usando el nombre
del archivo. El backend responde los bytes con
`Content-Disposition: attachment; filename="…"`. Sin token → **401**.

**Cargar** requiere las tres condiciones de `attachments.upload_attachment`:

| Condición | Detalle |
|---|---|
| Capacidad | `solicitud:upload` (**admin** y **field_admin**) |
| Autoría | ser el **dueño** (`captured_by`) o **Admin** |
| Estado | **`draft`** o **`correction_requested`** |

Si el estado ya no lo permite, el backend responde **409**
(`INVALID_WORKFLOW_TRANSITION`) y el mensaje se muestra en el panel. Cuando alguna condición
falta, el control de carga **no se pinta** (la descarga y los comentarios siguen disponibles).

> **Guarda de cortesía en el cliente:** se rechazan archivos **> 15 MB** y se limita a PDF,
> imágenes y documentos de Office, para dar un mensaje claro antes de gastar la subida. **No es
> la validación definitiva:** el backend todavía no valida tamaño ni tipo (ver
> [`docs/BACKLOG.md`](../BACKLOG.md)). Cuando lo haga, su respuesta manda.

Se sube **un archivo a la vez**, sin barra de progreso. Al terminar se refresca el detalle.

#### Comentarios

**Cualquiera que vea la solicitud puede comentar** — no hace falta capacidad especial
(`comments.create_comment` solo valida `can_view_solicitud`) y **no depende del estado**: se
puede comentar una solicitud ya enviada o aprobada (verificado: comentar en `submitted` → 201).
El campo se limpia al guardar y el detalle se refresca. Los comentarios **no se editan ni se
borran**: el backend no lo expone.

> Con los adjuntos ya cargables queda **desbloqueado el envío a revisión**, que exige ≥1
> adjunto. La acción de enviar es de la parte 4.

### Pendiente de la parte 4

- **Parte 4 — flujo y bandejas:** acciones de flujo (enviar, asignar concepto final, aprobar
  Supervisor, aprobar CFO, rechazar, diferir, solicitar corrección), todas a través de
  `workflow.py`; y las bandejas **`/aprobaciones`** (Supervisor, home de su rol) y
  **`/aprobaciones-financieras`** (CFO, home de su rol), que hoy siguen cayendo en `/` porque
  no están montadas.

Es **lo único pendiente** de la pantalla de Solicitudes.

## Permisos (capacidades)

Definidas en `app/services/permissions.py`. Ejemplos: `solicitud:create`,
`solicitud:edit_draft`, `solicitud:submit`, `solicitud:upload`, `solicitud:supervisor_review`,
`solicitud:cfo_review`, `solicitud:view_all` / `view_own`, `supplier:*`, `concept:*`,
`clearance:create`, `audit:view`, `user:manage`. Visibilidad de Tesorería restringida a
`supervisor_approved`, `cfo_approved`, `deferred`.

## Reglas de negocio

- El monto (`net_amount`) se maneja con `Decimal`; debe ser > 0 para enviar/aprobar.
- El concepto final debe ser una **hoja** del árbol (`concept_service.validate_leaf`).
- La edición solo es posible en `draft` o `correction_requested`, por el dueño o Admin.
- Toda transición registra evento en `audit_events`.

## Pendientes / decisiones

- Bloqueo **duro** por cumplimiento vencido del proveedor en la etapa de pago (hoy
  informativo).
- Validación de adjuntos (tamaño/tipo) y descarga por streaming.
- Paginación y orden en el listado de solicitudes.
- `[[POR LLENAR: prioridad del Paquete 2 sobre este módulo]]`
