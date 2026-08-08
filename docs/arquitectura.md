# Arquitectura — Sistema de Gestión de Pagos y Flujo de Efectivo (Monte Esmeralda)

> Documento vivo. Registra las decisiones de arquitectura como **ADR** (Architecture
> Decision Record) en formato ligero: contexto → decisión → consecuencias. Se numeran de
> forma consecutiva y no se borran; si una decisión se revierte, se agrega un ADR nuevo que
> la supersede. Actualízalo con la skill `documentacion-proyecto`.

## Panorama

Aplicación web interna para el control de **Solicitudes de Pago con aprobación por
niveles** del desarrollo inmobiliario Monte Esmeralda (Mi Depto Inmobiliaria). Arquitectura
por capas:

```
Frontend (React/TS)  →  API (FastAPI routers)  →  Negocio (services)  →  Datos (SQLAlchemy)
                                                        │
                                              Almacenamiento (storage.py, S3-compatible)
```

- **Backend:** FastAPI + Pydantic v2 + SQLAlchemy 2.x + Alembic; JWT (HS256) + bcrypt.
- **Frontend:** en migración al stack de GRC-OIR (Vite + PrimeReact + TanStack Query + RHF
  + Zod).
- **Datos:** SQLite en desarrollo; SQL Server (AWS RDS) en producción.

## ADRs

### ADR-001 — Continuar el backend heredado, no reescribirlo
- **Contexto:** el proyecto se hereda de otro desarrollador. El backend (modelo de datos,
  máquina de estados, RBAC, auditoría) está bien construido y con 32 pruebas en verde.
- **Decisión:** continuar el backend de forma incremental; no reescribirlo ni
  reestructurarlo. El código actual es la fuente de verdad.
- **Consecuencias:** se preserva valor y estabilidad; las mejoras se hacen módulo por
  módulo. Se conserva la estructura plana del backend (`routers/services/models/schemas`).

### ADR-002 — Migrar el frontend al stack de GRC-OIR
- **Contexto:** el frontend actual es Next.js hecho a mano, sin librería de componentes ni
  manejo de datos/formularios estándar, y con una vulnerabilidad conocida de Next.js. Se
  busca paridad con el proyecto GRC-OIR para reutilizar skills, patrones y sistema de
  diseño.
- **Decisión:** reconstruir el frontend en **Vite + React + TS + PrimeReact + TanStack
  Query + RHF + Zod** (Frente 3), dejando el backend intacto como API estable. Se reutilizan
  `api.ts`, `types.ts`, `labels.ts` y `nav.ts`.
- **Consecuencias:** se descarta el frontend actual (y sus smoke tests, a reescribir); a
  cambio, un solo stack y sistema de diseño entre ambos proyectos. La vulnerabilidad de
  Next.js se resuelve de raíz al migrar.

### ADR-003 — SQLite en dev, SQL Server (AWS RDS) en prod, con un solo juego de migraciones
- **Contexto:** el código venía apuntando a PostgreSQL; el estándar del equipo (y de
  GRC-OIR) es SQL Server en AWS. En local conviene SQLite para no depender de una BD
  externa.
- **Decisión:** dev = SQLite; prod = SQL Server con **pyodbc + ODBC Driver 18**. Un mismo
  juego de migraciones Alembic debe correr en ambos motores, usando tipos genéricos de
  SQLAlchemy.
- **Consecuencias:** las migraciones evitan tipos exclusivos de un dialecto; se adapta la
  configuración de conexión (Frente 2). Instancia RDS compartida con GRC-OIR (otra base):
  cuidado con operaciones destructivas.

### ADR-004 — PKs con tipo GUID portable
- **Contexto:** se necesitan UUID como PK que funcionen igual en SQLite y SQL Server.
- **Decisión (resuelta en el Frente 2):** mantener el `TypeDecorator` GUID portable de
  `database.py`, que persiste como `CHAR(36)` / `VARCHAR(36)`, **en lugar** del
  `UNIQUEIDENTIFIER` nativo de SQL Server.
- **Razón:** da portabilidad limpia entre SQLite (dev) y SQL Server (prod) con un mismo
  modelo y un mismo juego de migraciones. Verificado creando el esquema real en RDS sin
  problemas (ver ADR-010). El ahorro de bytes de `UNIQUEIDENTIFIER` (16 vs. 36) no justifica
  romper esa portabilidad.
- **Consecuencias:** los PKs son `VARCHAR(36)` en SQL Server; los UUID se generan en la
  aplicación con `new_uuid()`, no en la base.

### ADR-005 — Máquina de estados centralizada en `workflow.py`
- **Contexto:** la Solicitud de Pago transita por múltiples estados con reglas y permisos
  por etapa.
- **Decisión:** `app/services/workflow.py` es la **única** puerta para cambiar el estado de
  una Solicitud. Cada transición valida permiso, estado de origen y precondiciones, y
  registra auditoría.
- **Consecuencias:** routers y frontend nunca mutan el estado directamente; las reglas
  viven en un solo lugar, testeable y auditable.

### ADR-006 — RBAC por capacidades, validado en el servidor
- **Contexto:** ocho roles con permisos distintos por etapa y por visibilidad.
- **Decisión:** capacidades por rol en `app/services/permissions.py` (fuente de verdad),
  aplicadas con `require_capability` y revalidadas en los servicios. El frontend solo oculta
  controles.
- **Consecuencias:** seguridad consistente; `nav.ts` del frontend debe mantenerse alineado
  con `permissions.py`. No hay permisos a nivel de campo.

### ADR-007 — Auditoría append-only con snapshots
- **Contexto:** se requiere trazabilidad completa del flujo de pagos.
- **Decisión:** toda transición/edición sensible registra un evento en `audit_events`
  (polimórfica: `entity_type` + `entity_id`) vía `services/audit.py`, con `before_json` /
  `after_json`. La bitácora es de solo-inserción.
- **Consecuencias:** historial confiable; nunca se actualiza ni borra un evento.

### ADR-008 — Almacenamiento de adjuntos por abstracción compatible con S3
- **Contexto:** las solicitudes llevan adjuntos (comprobantes) que en el futuro vivirán en
  la nube.
- **Decisión:** todo acceso a archivos pasa por `app/services/storage.py`, con interfaz
  compatible con S3; backend local en dev (`uploads/`), bucket S3 en prod.
- **Consecuencias:** el dominio no conoce el medio de almacenamiento; cambiar a S3 no toca
  la lógica.

### ADR-009 — Texto Unicode (NVARCHAR) y fechas DATETIME2 en SQL Server
- **Contexto:** los datos son en español (acentos, ñ) y el DDL generado para SQL Server
  producía `VARCHAR` para texto y `DATETIME` para fechas/hora. `VARCHAR` en SQL Server no
  es UTF-8 por defecto: depende del collation de la columna y puede corromper acentos y ñ.
- **Decisión:** tres tipos, todos definidos en `database.py` o directos de SQLAlchemy:
  - **Texto acotado:** `Unicode(n)` → `NVARCHAR(n)` en SQL Server, `VARCHAR(n)` en SQLite.
  - **Texto largo:** el helper `unicode_text()`, que aplica
    `UnicodeText().with_variant(mssql.NVARCHAR(None), "mssql")` → **`NVARCHAR(MAX)`** en SQL
    Server, `TEXT` en SQLite. La variante es necesaria porque `UnicodeText` a secas mapea a
    `NTEXT`, que Microsoft tiene **deprecado** y que no admite muchas funciones de cadena.
  - **Fecha/hora:** el helper `datetime2()`, que aplica
    `DateTime().with_variant(mssql.DATETIME2(), "mssql")` → `DATETIME2` en SQL Server,
    `DATETIME` en SQLite.

  Los `Enum` con `native_enum=False` se quedan en `VARCHAR` + `CHECK`: sus valores son ASCII.
  El tipo `GUID` no cambia (ver ADR-004).
- **Consecuencias:** el esquema es portable entre ambos motores y nace correcto en RDS, sin
  necesidad de un `ALTER` posterior. La migración inicial se regeneró con estos tipos
  (RDS aún estaba vacío, así que no se acumuló un ALTER).

### ADR-010 — Esquema verificado contra AWS RDS (SQL Server)
- **Contexto:** el soporte de SQL Server (ADR-003, ADR-009) se había validado solo generando
  DDL en modo offline, sin conexión real. Faltaba confirmarlo contra la instancia de AWS.
- **Decisión / hecho registrado:** el esquema se aplicó **con éxito** en la base
  `MESistemaGestionPagos` (instancia `devapps`, región `us-west-2`) con
  `alembic upgrade head` (revisión `657d9f17a604`): **8 tablas creadas**. El seed y la
  autenticación (`POST /auth/login`) también quedaron verificados contra SQL Server.
- **Consecuencias:** el Frente 2 queda cerrado; la configuración `DB_BACKEND=sqlserver` es
  la ruta de producción validada. **Pendiente menor:** verificar el round-trip de texto con
  acentos y ñ (`NVARCHAR`) desde la UI cuando el frontend esté disponible (Frente 3); hoy
  está comprobado a nivel de tipos y de backend, no de punta a punta.

### ADR-011 — Estructura del frontend nuevo: cliente central + módulos + registro de rutas
- **Contexto:** al migrar la primera pantalla de negocio (Catálogo de Conceptos, Frente 3)
  hubo que fijar dónde viven los llamados a la API, cómo se organiza cada módulo y cómo se
  habilita una pantalla conforme se migra. GRC-OIR usa un `api.ts` por módulo sobre un CRUD
  genérico; aquí el frontend heredado ya traía un **cliente central tipado** que se portó tal
  cual y que refleja una API sin CRUD genérico (rutas a nivel raíz, acciones de flujo).
- **Decisión:**
  - **Los llamados a la API viven en el cliente central** `src/shared/lib/api.ts` (un objeto
    `api` con un helper `request` común: token, errores `{code, message}` como `ApiError`).
    Los módulos **no** crean su propio `api.ts`; agregar un endpoint es agregar un método ahí.
  - **Cada módulo aporta** `types.ts` (tipos + schema Zod del formulario), `hooks.ts`
    (TanStack Query sobre el cliente central), `components/` y `pages/`, bajo
    `src/modules/<modulo>/`, con el mismo nombre que el recurso del backend.
  - **Las rutas montadas se registran en** `src/shared/lib/mountedRoutes.ts`, fuente única
    consumida por el **sidebar** (una entrada de `nav.ts` se vuelve enlace real solo si su
    ruta está montada; si no, queda visible en estado «por migrar») y por **`roleHome.ts`**
    (la home del rol cae a `/` mientras su pantalla no exista).
  - Lo reutilizable entre módulos va a `src/shared/ui/` (p.ej. `Badge`), sin hardcodear color
    ni tipografía: todo sale de los tokens de `theme.css` (ADR-009 y el primario de marca).
  - **`<StatusBadge>`** (`shared/ui/StatusBadge.tsx`) mapea `STATUS_LABELS` + `STATUS_TONE` de
    `labels.ts` sobre el `<Badge>` genérico y es el **componente único** para los 8 estados de
    la Solicitud: ninguna pantalla arma ese badge a mano ni inventa etiquetas o tonos. Si el
    backend agrega un estado, se agrega en `labels.ts` y todas las pantallas lo toman solas.
- **Prácticas afinadas al migrar Solicitudes** (aplican a todo el frontend):
  - **Un `QueryClient` por instancia, no un singleton de módulo.** Se crea con
    `useState(crearQueryClient)` dentro de `Providers`. Un cliente a nivel de módulo comparte la
    caché entre raíces de React (y, en pruebas, entre casos, generando dependencias de orden).
  - **Acciones de flujo declaradas por configuración.** Las transiciones de la Solicitud se
    describen en una tabla (etiqueta, motivo opcional/obligatorio, si pide concepto, si es
    destructiva) y un **único** `Dialog` + ejecutor las despacha, en vez de un bloque de JSX por
    acción. Agregar una transición es una entrada más. El selector de concepto
    (`ConceptoSelect`: solo hojas, agrupadas por sección y con su `path`) se **comparte** entre
    la captura (concepto propuesto) y la aprobación del Supervisor (concepto final).
  - **Una pantalla configurable en vez de varias parecidas.** `SolicitudesWorkspace` concentra
    el patrón lista + panel de detalle + acciones, y se configura por props: la lista completa
    (todos los estados, filtros y captura) y las **bandejas** por rol (estado fijo, sin filtro
    de estado ni captura) son la misma pantalla con distinta configuración, no tres copias.
  - **Los avisos (`Toast`) viven en un provider global** (`shared/ui/toast`, con `useToast()`).
    El `Toast` de PrimeReact se renderiza donde se monta (`appendTo: "self"`) y la versión
    instalada **no lo posiciona por CSS**, así que dentro de un panel con `overflow: hidden`
    quedaría recortado: se monta en la raíz y `theme.css` le fija la posición explícitamente.
  - **Invalidación sin solapamiento de prefijos.** Las claves de TanStack Query se invalidan por
    prefijo, así que invalidar `["solicitudes"]` **ya alcanza** a
    `["solicitudes","detalle",id]`: hacer las dos cosas dispara **refetches duplicados**. Se usa
    la clave más específica que corresponda al cambio — solo el detalle cuando lo que cambió no
    se ve en la lista (adjuntos, comentarios), y la raíz cuando sí (monto, estado, proveedor).
- **Consecuencias:** migrar una pantalla es un cambio acotado y repetible — método(s) en el
  cliente central, carpeta del módulo, ruta hija en `router.tsx` y una línea en
  `mountedRoutes.ts`. El sidebar y la redirección por rol se habilitan solos. A cambio, el
  cliente central crece con cada recurso; si llegara a estorbar, se dividirá por recurso
  manteniendo un único helper `request`.

---

## Decisiones pendientes

Ver la sección 14 del `CLAUDE.md` raíz. En síntesis: alcance y prioridad del Paquete 2;
endurecimiento (validación de adjuntos, paginación, bloqueo duro por cumplimiento);
estrategia de ambientes/despliegue.

> El tipo del GUID en SQL Server ya **no** es un pendiente: se resolvió en el ADR-004
> (se mantiene `VARCHAR(36)` portable).

- **Docker (diferido):** `docker-compose.yml` aún levanta Postgres e inyecta una
  `DATABASE_URL` de Postgres, y el `Dockerfile` instala `libpq-dev` en vez del ODBC
  Driver 18. Local usa venv+SQLite y prod usa RDS gestionado, así que Docker se
  adaptará en un incremento propio si se decide containerizar. `[[POR LLENAR: decisión]]`
- **Al cerrar el Frente 3 (retiro de `legacy-frontend/`):** actualizar `README.md` —hoy
  describe el arranque del frontend Next.js en `:3000`— al flujo del frontend Vite
  (`:5173`, `VITE_API_URL`), y revisar la referencia a `localhost:3000` en
  `docker-compose.yml` junto con la decisión de Docker de la línea anterior.
