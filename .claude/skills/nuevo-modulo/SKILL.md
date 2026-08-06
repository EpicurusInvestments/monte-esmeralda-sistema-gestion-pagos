---
name: nuevo-modulo
description: >
  Crea el ANDAMIAJE (esqueleto) de una funcionalidad/módulo nuevo del Sistema de Gestión de
  Pagos y Flujo de Efectivo (Monte Esmeralda), en backend (Python/FastAPI) y frontend
  (React/TypeScript), siguiendo las convenciones del proyecto. Úsala SIEMPRE que se pida
  "agregar un módulo", "empezar el Paquete 2", "crear la pantalla/sección de Y" o iniciar
  cualquier parte nueva (p.ej. remesas, saldo bancario, selección de pagos, reportes).
  Genera estructura y plantillas con TODOs, NO la lógica de negocio: su propósito es avanzar
  ordenado, por partes.
---

# Skill: nuevo-modulo

Genera el esqueleto de un módulo, parejo en backend y frontend, listo para que luego se
implemente la lógica con `backend-fastapi` y `frontend-react`. **No implementa reglas de
negocio.**

## Antes de generar nada

1. Ubica el módulo en el plan del `CLAUDE.md` raíz (frentes / Paquete 2) y confirma su
   nombre en `snake_case` (igual en back y front).
2. Identifica las entidades y estados que cubre, a partir del **modelo de datos actual** y
   de lo acordado en la ficha del módulo. No inventar ni renombrar nombres existentes.
3. Lee `docs/modulos/<modulo>.md`; si no existe, créalo desde `docs/modulos/_plantilla.md`
   pre-llenando lo que ya se sepa (entidades, estados, relaciones) y marca `[[POR LLENAR]]`
   lo que falte.
4. **Presenta un plan corto** (lista de archivos a crear/tocar) y espera el visto bueno.

## Qué crea

### Backend — estructura plana (igual que el resto del backend; NO usar `modules/` ni `repository`)

Archivos con plantillas mínimas y `# TODO` claros:

- `app/models/<entidad>.py` — una clase SQLAlchemy por entidad, con PK por el **tipo GUID
  portable** de `database.py`, `created_at`/`updated_at`, y `# TODO(equipo)` por cada campo
  (nombre y tipo como referencia en comentario). Estados con el tipo `Enum` de SQLAlchemy.
- Añadir los nuevos estados/roles necesarios a `app/enums.py` (fuente única).
- `app/schemas/<modulo>.py` — `XxxCreate`, `XxxUpdate`, `XxxRead`/`XxxDetail` (Pydantic) con
  campos como `# TODO`.
- `app/services/<modulo>.py` — servicio con las reglas y, si el módulo tiene estados, el
  esqueleto de la **máquina de estados siguiendo el patrón de `workflow.py`** (una función
  por transición: permiso → estado origen → precondiciones → cambio → auditoría), con
  `# TODO: confirmar transiciones`.
- `app/routers/<modulo>.py` — `APIRouter` con endpoints declarados, cada uno con
  `Depends(require_capability("<modulo>:<accion>"))` (capacidad nueva a agregar en
  `permissions.py`; si hay duda, `# TODO`), delegando al servicio. Sin lógica.
- `app/tests/test_<modulo>.py` con esqueleto (incluir un caso por transición de estado).

### Frontend — `frontend/src/modules/<modulo>/`

- `types.ts` — tipos espejo de los schemas (con `// TODO`).
- `api.ts` — funciones CRUD/acciones apuntando a los endpoints del recurso (rutas a nivel
  raíz).
- `hooks.ts` — esqueleto de queries/mutations (TanStack Query).
- `components/index.ts` vacío.
- `pages/<Modulo>ListPage.tsx` — esqueleto del patrón **lista + panel de detalle (~480px)**
  con toolbar (búsqueda, filtros, contador).
- `pages/<Modulo>FormPage.tsx` — esqueleto de formulario (RHF + Zod); full-screen con
  secciones si la captura es compleja; panel lateral si es simple.

## Después de crear (NO en automático; listarlo como pendiente)

- Registrar el router en `app/main.py` y la ruta/menú por rol en el front (`nav.ts`).
- Agregar las capacidades nuevas a `services/permissions.py`.
- Crear la migración con la skill `migraciones-sqlserver`.
- Completar `docs/modulos/<modulo>.md` y registrar endpoints previstos en
  `docs/API-CONTRACT.md` (skill `documentacion-proyecto`).

## Reglas

- **Cero lógica de negocio**: solo esqueleto y TODOs.
- Nombres de entidades, campos y valores de estado consistentes con el código actual
  (snake_case en inglés), sin cambios sorpresa.
- Respetar la regla de espejo back/front y la estructura del `CLAUDE.md` raíz.
- Todo endpoint nace con su guard de capacidad.
- Al terminar, entregar la lista de pasos manuales pendientes.
