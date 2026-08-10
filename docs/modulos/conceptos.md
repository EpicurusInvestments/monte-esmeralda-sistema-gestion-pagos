# Módulo: conceptos — Catálogo de Conceptos de Flujo

> Ficha viva del módulo. Se actualiza junto con el código (skill `documentacion-proyecto`).

## Propósito

Mantiene el **catálogo jerárquico de conceptos de flujo**: la clasificación con la que se
etiqueta cada Solicitud de Pago. Es un árbol; solo las **hojas** (`is_header = false`) son
asignables a una Solicitud — los encabezados agrupan y no se pueden seleccionar.

Todos los roles con `concept:view` consultan el catálogo (lo necesitan para capturar y para
revisar solicitudes). Solo **Admin** lo edita.

## Alcance

- **Incluye:** consulta del árbol completo, búsqueda y filtrado, alta y edición de conceptos,
  baja lógica (`active = false`).
- **No incluye:** borrado físico (no existe `DELETE`); reordenar el árbol arrastrando; mover
  ramas completas de padre; importación masiva del catálogo.

## Entidades

| Entidad | Campos clave | Relaciones | Notas |
|---|---|---|---|
| `concepts` | `id` (GUID), `code` (**único**), `name`, `parent_id`, `section`, `is_header`, `sort_order`, `active` | `parent_id` → `concepts.id` (auto-referencia) | Árbol auto-referenciado. `code` único lo valida el router al crear. Sin `created_at`/`updated_at` (es catálogo maestro). |

**Secciones** (`section`, código → etiqueta en la UI):

| Código | Etiqueta |
|---|---|
| `ING` | INGRESOS |
| `EGR` | EGRESOS — COSTOS |
| `GAS` | GASTOS |
| `ACT` | ACTIVOS |

**Campos derivados** que agrega `concept_service.to_out` en las respuestas (no están en la
tabla): `parent_name` y `path` (`"Grupo › Subgrupo › Concepto"`).

## Estados y transiciones

No aplica: el catálogo no tiene máquina de estados. Lo único con dos valores es `active`
(alta lógica / baja lógica), que se cambia con un `PATCH`.

## Endpoints

Detalle en [`docs/API-CONTRACT.md`](../API-CONTRACT.md#conceptos-concepts).

- `GET /concepts?leaves_only=&active_only=` — listar (`concept:view`).
- `POST /concepts` — crear, **201**; código duplicado → **422** `VALIDATION_ERROR`
  (`concept:edit`).
- `PATCH /concepts/{concept_id}` — actualizar, **200** (`concept:edit`).

## Pantallas

**`/conceptos` — Catálogo de Conceptos** (`frontend/src/modules/conceptos/`). Patrón
**lista + panel de detalle**:

| Zona | Contenido |
|---|---|
| Encabezado | Título y, solo con `concept:edit`, botón **“+ Nuevo concepto”** |
| Toolbar | Búsqueda local por código o nombre · `Dropdown` de **sección** (ING/EGR/GAS/ACT, con “limpiar”) · `Dropdown` de **estado** (Activos / Inactivos / Todos) · contador de resultados |
| Lista | `DataTable` de PrimeReact: código (mono), nombre con su `path` como sublínea, sección, tipo (badge Encabezado/Hoja) y estado (badge Activo/Inactivo) |
| Panel derecho | Detalle del concepto seleccionado; con `concept:edit`, botón **“Editar”**. Sin selección muestra el estado vacío. Su **ancho se ajusta** arrastrando el borde izquierdo (ver ADR-011) |
| Formulario | Alta/edición en el mismo panel (RHF + Zod): código, nombre, sección, padre, “es encabezado”, activo y orden |

Notas de comportamiento:

- La **búsqueda y el filtro por sección son locales** sobre lo ya traído; el filtro de
  **estado** sí toca la consulta (`active_only`).
- El backend solo expone `active_only` (true = solo activos; false = todos): **no existe un
  “solo inactivos”**. La opción **Inactivos** pide `active_only=false` y descarta en cliente
  los que tienen `active = true`.
- El **código duplicado** se muestra sobre el campo `code` sin perder lo capturado. El
  frontend lo detecta por `code === "VALIDATION_ERROR"`, no por el status.
- Roles **sin `concept:edit` ven la pantalla en solo lectura**: no se pintan “+ Nuevo
  concepto” ni “Editar”. Es solo UX — el backend responde **403** igual.

## Permisos (capacidades)

Fuente de verdad: `backend/app/services/permissions.py`.

| Capacidad | Quién la tiene | Para qué |
|---|---|---|
| `concept:view` | **Todos los roles** (admin, field_admin, supervisor, cfo, treasurer, ceo, accountant, engineer) | Listar y ver el detalle |
| `concept:edit` | **Solo `admin`** | Crear y actualizar conceptos |

En el frontend el guard de UI es `canEditConcepts(role)` de `shared/lib/nav.ts`, que debe
mantenerse alineado con `permissions.py`.

## Reglas de negocio

1. **Solo las hojas son asignables.** Una Solicitud no puede apuntar a un concepto con
   `is_header = true`; lo valida `concept_service.validate_leaf` y el error es
   `CONCEPT_MUST_BE_LEAF`.
2. **`code` es único** en todo el catálogo (validado al crear; **no** se revalida en `PATCH`).
3. **Baja lógica, nunca borrado.** Desactivar preserva la integridad de las Solicitudes
   históricas que ya referencian ese concepto.
4. **`path` se calcula al vuelo** recorriendo `parent_id` hacia arriba, con un tope de 20
   niveles como salvaguarda contra ciclos.

## Pendientes / decisiones

- **Sin paginación:** `GET /concepts` devuelve el catálogo completo (hoy 78 conceptos: 16
  encabezados y 62 hojas) y el frontend filtra en cliente. Aceptable a este volumen; entra en
  el endurecimiento pendiente de paginación en listados.
- **Sin vista de árbol:** la jerarquía se comunica con el `path` bajo el nombre, no con un
  `TreeTable` plegable. Pendiente de decidir si se justifica.
- **Sin validación de coherencia del árbol:** nada impide asignar como padre un concepto de
  **otra sección**, ni se detectan **ciclos** (A padre de B y B padre de A). No lo valida el
  backend ni el frontend; `build_path` solo se protege con el tope de 20 niveles.
  `[[POR LLENAR: decidir si se valida en el servicio y con qué regla]]`
- **`PATCH` no revalida la unicidad de `code`:** cambiar el código de un concepto a uno ya
  existente no está bloqueado. `[[POR LLENAR: confirmar si debe validarse]]`
- **`leaves_only` sin uso en la UI:** el cliente lo soporta; se usará en el selector de
  concepto al migrar Solicitudes.
