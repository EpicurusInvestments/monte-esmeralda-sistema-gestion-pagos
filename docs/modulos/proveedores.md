# Módulo: proveedores — Proveedores y Cumplimiento

> Ficha viva del módulo. Se actualiza junto con el código (skill `documentacion-proyecto`).

## Propósito

Mantiene el **catálogo de proveedores** (datos fiscales, contacto y datos bancarios) y el
**registro de sus cumplimientos** documentales (*clearances*).

Principio del dominio: **el sistema NO evalúa a los proveedores**. Solo registra el resultado
de una revisión externa. Cada cumplimiento es una foto de ese resultado en una fecha; el más
reciente define la situación vigente.

Los proveedores son **datos**, no usuarios: no tienen acceso al sistema ni portal externo.

## Alcance

- **Incluye:** consulta, búsqueda y filtrado de proveedores; alta y edición; baja lógica
  (`status = "inactive"`); consulta e **alta** de cumplimientos.
- **No incluye:** borrado de proveedores; edición o borrado de cumplimientos; validación del
  formato de RFC/CLABE; bloqueo duro por cumplimiento vencido (hoy es informativo — se
  aplicará en la etapa de pago, Paquete 2); portal para el proveedor.

## Entidades

| Entidad | Campos clave | Relaciones | Notas |
|---|---|---|---|
| `suppliers` | `id` (GUID), `legal_name`, `rfc`, `contact_name`, `email`, `phone`, `bank_name`, `bank_account`, `clabe`, `status` (`active`/`inactive`), `created_at`, `updated_at` | 1:N → `supplier_clearances` | Solo `legal_name` y `status` son obligatorios; el resto es opcional (`null`). Sin borrado: baja lógica con `status`. |
| `supplier_clearances` | `id` (GUID), `supplier_id`, `status` (`cleared`/`pending`/`blocked`), `clearance_date`, `valid_until`, `compliance_reference`, `notes`, `created_by`, `created_at` | `supplier_id` → `suppliers.id`; `created_by` → `users.id` | **Solo alta** (append-only de hecho: el backend no expone editar ni borrar). Se listan del más reciente al más antiguo. |

### Campo derivado: `clearance.effective_status`

`SupplierOut` trae un objeto `clearance` (`ClearanceSummary`) que **no está en la tabla**: lo
calcula `supplier_service.clearance_summary` a partir del cumplimiento más reciente.

| `effective_status` | Cuándo | Tono del badge |
|---|---|---|
| `cleared` | Último registro `cleared` y **no** vencido | verde |
| `pending` | Último registro `pending` | ámbar |
| `blocked` | Último registro `blocked` | rojo |
| `expired` | Último registro `cleared` pero con `valid_until` **anterior a hoy** | rojo |
| `none` | El proveedor no tiene ningún cumplimiento registrado | gris |

**Regla de negocio:** un cumplimiento **vencido cuenta como no vigente**. Por eso `expired`
existe como estado *derivado* y **no** es capturable — al registrar solo se elige entre
`cleared`, `pending` y `blocked`.

El resumen también expone `has_record`, `status` (el crudo), `valid_until` e `is_expired`.

## Estados y transiciones

No hay máquina de estados. Dos dimensiones independientes:

- **Proveedor:** `active` ⇄ `inactive` (se cambia editando el proveedor).
- **Cumplimiento:** no transiciona. Cada alta agrega un registro nuevo; el más reciente manda.

## Endpoints

Detalle en [`docs/API-CONTRACT.md`](../API-CONTRACT.md#proveedores-suppliers).

- `GET /suppliers` · `GET /suppliers/{id}` — `supplier:view`.
- `POST /suppliers` → **201** — `supplier:create`.
- `PATCH /suppliers/{id}` → **200** — `supplier:edit`.
- `GET /suppliers/{id}/clearances` — `supplier:view`.
- `POST /suppliers/{id}/clearances` → **201** — `clearance:create`.

Notas de contrato que impactan al frontend: los opcionales vacíos se envían como **`null`**
(un `email: ""` responde **422**) y las fechas de cumplimiento van en **`"YYYY-MM-DD"`**
formateadas en horario local.

## Pantallas

**`/proveedores`** (`frontend/src/modules/proveedores/`). Patrón **lista + panel de detalle**,
con la sub-entidad anidada en el detalle:

| Zona | Contenido |
|---|---|
| Encabezado | Título y, con `supplier:create`, botón **“+ Nuevo proveedor”** |
| Toolbar | Búsqueda local por razón social o RFC · `Dropdown` de **estado** (Activos / Inactivos / Todos) · `Dropdown` de **cumplimiento** (Vigente / Pendiente / Bloqueado / Vencido / Sin registro, sobre `effective_status`, con “limpiar” = cualquiera) · contador |
| Lista | `DataTable`: razón social, RFC (mono), contacto (nombre + correo), estado (badge) y **cumplimiento** (badge desde `effective_status`) |
| Panel derecho | Su **ancho se ajusta** arrastrando el borde izquierdo (ver ADR-011). Identificación, contacto, datos bancarios y sección **Cumplimiento**: situación vigente, lista de registros con su badge/fechas/referencia/notas, y —con `clearance:create`— formulario **inline** “Registrar cumplimiento” |
| Formulario | Alta/edición del proveedor en el mismo panel (RHF + Zod) |

Comportamiento: la búsqueda y los dos filtros son **locales** (`GET /suppliers` no acepta
parámetros), incluida la opción **Inactivos** (`status = "inactive"`). Registrar un cumplimiento **refresca también la lista**, porque el badge de
cumplimiento se deriva del registro más reciente.

## Permisos (capacidades)

Verificado en `backend/app/services/permissions.py` y comprobado contra el servidor.

| Capacidad | Roles | Para qué |
|---|---|---|
| `supplier:view` | **todos** los roles | Listar, ver detalle y **listar cumplimientos** |
| `supplier:create` | `admin`, `field_admin` | Crear proveedor |
| `supplier:edit` | `admin`, `field_admin` | Editar proveedor (incluye activar/desactivar) |
| `clearance:create` | **solo `admin`** | Registrar un cumplimiento |

> **El Admin de Campo edita proveedores pero NO registra cumplimientos.** Son capacidades
> distintas con roles distintos, así que la UI las evalúa por separado: `canManageSuppliers`
> para “Nuevo/Editar” y `canRecordClearance` para el formulario inline (ambos en
> `shared/lib/nav.ts`). El backend revalida siempre; ocultar controles es solo UX.
>
> `clearance:view` existe como capacidad pero **ningún endpoint la usa** hoy: el listado de
> cumplimientos se protege con `supplier:view`. Nótese que `engineer` no tiene
> `clearance:view` y aun así puede listar cumplimientos.

## Reglas de negocio

1. **El sistema no evalúa proveedores**, solo registra el resultado externo (ADR del dominio).
2. **Vencido = no vigente**: `cleared` con `valid_until` pasada se reporta como `expired`.
3. **En el Paquete 1 el cumplimiento no bloquea la captura** de una Solicitud; se muestra como
   advertencia. El bloqueo duro se aplicará en la etapa de pago.
4. **Baja lógica, nunca borrado**, para preservar las Solicitudes históricas que referencian al
   proveedor.
5. **Los cumplimientos no se corrigen, se superseden** con un registro nuevo.

## Pendientes / decisiones

Detalle y estado en [`docs/BACKLOG.md`](../BACKLOG.md).

- Cumplimientos **solo de alta**: no hay forma de corregir un registro equivocado.
  `[[POR LLENAR: decidir si se permite editar/anular un cumplimiento]]`
- **Sin validación de formato** de RFC ni CLABE (el backend solo limita longitud).
- **Sin confirmación** al desactivar un proveedor, ni detección de dependencias (solicitudes
  asociadas).
- **Sin paginación** ni orden por columna: `GET /suppliers` devuelve todo y se filtra en
  cliente.
- **CEO no ve `/proveedores` en el menú** aunque tiene `supplier:view`: divergencia de
  `nav.ts` frente a `permissions.py`.
