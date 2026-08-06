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

- **Solicitudes** (lista + detalle) — todos los roles, con visibilidad según rol.
- **Capturar / Editar Solicitud** (form) — Admin/Campo.
- **Bandeja de Aprobaciones** — Supervisor (`submitted`).
- **Aprobaciones Financieras** — CFO (`supervisor_approved`).
- **Proveedores** y **Catálogo de Conceptos** — según permisos.
- **Administración** (usuarios) — Admin.
- **Detalle de Solicitud:** info, adjuntos, comentarios, acciones de flujo y línea de tiempo
  de auditoría.

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
