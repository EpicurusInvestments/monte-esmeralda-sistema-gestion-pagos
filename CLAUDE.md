# CLAUDE.md — Sistema de Gestión de Pagos y Flujo de Efectivo (Monte Esmeralda)

> Este archivo es la **fuente de verdad** que Claude Code lee automáticamente al iniciar
> en este repositorio. Define qué es el proyecto, cómo se trabaja y qué reglas son
> inquebrantables. Si algo cambia en el proyecto, se actualiza aquí primero.
>
> Cómo leerlo: las líneas `[[POR LLENAR: ...]]` son datos que el equipo debe completar;
> mientras no estén, Claude Code **pregunta** en lugar de asumir. Hay `CLAUDE.md`
> adicionales en `backend/` y `frontend/` con reglas locales de cada capa.

## 1. Resumen del proyecto

**Sistema de Gestión de Pagos y Flujo de Efectivo – Monte Esmeralda**: aplicación web
interna y a la medida para el control de **pagos a proveedores con aprobación por
niveles** del desarrollo inmobiliario **Monte Esmeralda**. Una persona captura una
Solicitud de Pago, esta pasa por revisión operativa (Supervisor) y aprobación financiera
(CFO), y queda lista para Tesorería. Todo el ciclo es auditado punta a punta.

- **Cliente:** Mi Depto Inmobiliaria S.A. de C.V. (Real Estate).
- **Proyecto/dominio:** fraccionamiento Monte Esmeralda (~1,600 viviendas), Tepeji del
  Río, Hidalgo, México.
- **Origen:** proyecto **heredado** de un desarrollador anterior; el código actual (backend
  y modelo de datos) es la referencia y **no se reescribe desde cero**, se continúa de
  forma incremental.
- **Alcance actual (Paquete 1):** Fundación + Solicitudes de Pago. NO incluye todavía
  tesorería/remesas, flujo de efectivo, reportería fiscal ni contabilidad; eso es
  **Paquete 2 en adelante** (ver sección 5).
- **Responsable técnico:** Yazmani Reyes (continúa el desarrollo tras la transferencia).
- **Repositorio:** https://github.com/EpicurusInvestments/monte-esmeralda-sistema-gestion-pagos

### Principios de diseño del sistema (no se negocian)

1. **Aprobación por niveles como columna vertebral:** captura → revisión operativa
   (Supervisor) → aprobación financiera (CFO) → visibilidad de Tesorería. Cada etapa tiene
   su rol y sus permisos.
2. **Una sola puerta para cambiar estados:** todo cambio de estado de una Solicitud pasa
   por el servicio `workflow.py`. Los routers y el frontend **nunca** mutan el estado por
   su cuenta.
3. **Auditoría no opcional:** cada transición se registra en `audit_events` con snapshot
   antes/después. La bitácora es de solo-inserción (append-only).
4. **Seguridad forzada en el servidor:** los permisos por rol viven en `permissions.py` y
   se validan en el backend. El frontend solo **oculta** controles para UX; nunca es la
   fuente de verdad.
5. **Catálogos como fuente única:** el catálogo de Conceptos es un árbol jerárquico; solo
   las hojas (no encabezados) son asignables a una Solicitud.
6. **Actores externos NO acceden al sistema:** los proveedores existen solo como datos
   (captura interna). No hay portal externo.

## 2. Reglas de oro (cumplimiento obligatorio)

1. **Desarrollo incremental por frentes/módulos.** Se trabaja un frente —y dentro de él,
   un módulo/pantalla— a la vez, siguiendo el plan (sección 5). Nunca generar "toda la
   app" ni varios frentes en paralelo sin petición explícita.
2. **Planear antes de programar.** Ante cualquier tarea, proponer un plan corto (archivos
   a crear/tocar y por qué) y esperar aprobación antes de escribir código de negocio.
3. **El código actual es la referencia.** El modelo de datos, la máquina de estados de
   `workflow.py` y las reglas de `permissions.py` se **continúan**, no se reinventan. Si
   algo parece incorrecto o ambiguo, se pregunta; no se "mejora" por cuenta propia.
4. **Respetar la arquitectura por capas.** Presentación → API (routers) → Negocio
   (services) → Datos (models). La lógica de negocio vive en `services/`, fuera de routers
   y componentes React.
5. **Seguridad y auditoría no son opcionales.** RBAC en cada endpoint mediante
   `permissions.py`; toda transición de estado deja registro en `audit_events`.
6. **Documentación a la par del código.** Cada avance actualiza `docs/` (ver sección 10 y
   skill `documentacion-proyecto`). Un cambio sin su documentación NO está terminado.
7. **Cambios pequeños y revisables.** Commits y PRs chicos, enfocados a un frente/módulo.
8. **Nunca credenciales en código ni en archivos versionados.** Secretos solo en `.env`
   local o gestor de secretos.
9. **Cuando dudes, pregunta.** Datos `[[POR LLENAR]]`, alcance ambiguo o decisiones con
   consecuencias → preguntar, no asumir.

## 3. Stack tecnológico (decidido)

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | **React + TypeScript + Vite** | En migración (Frente 3): el andamiaje ya vive en `frontend/`; las pantallas se migran por incrementos desde `legacy-frontend/` (Next.js retirado). Objetivo: paridad con GRC-OIR. TS estricto. |
| Librería UI | **PrimeReact** | Misma que GRC-OIR (DataTable potente, patrón lista + panel de detalle). |
| Datos/formularios (frontend) | **TanStack Query + React Hook Form + Zod** | Igual que GRC-OIR. |
| Backend | **Python + FastAPI** | **Se mantiene intacto.** Pydantic v2, SQLAlchemy 2.x, Alembic. JWT (HS256) + bcrypt. |
| Base de datos | **Local: SQLite** · **Producción: Microsoft SQL Server en AWS** | Driver de producción: **pyodbc** + ODBC Driver 18 (Frente 2 ✅ hecho y verificado contra RDS; Postgres/psycopg2 ya se retiró). Se elige con `DB_BACKEND` (`sqlite` \| `sqlserver`). Endpoint y credenciales solo por `.env`. |
| Almacenamiento de adjuntos | Abstracción compatible con S3 (`services/storage.py`) | Local: disco (`uploads/`). Producción: bucket S3 (a futuro). |
| Identidad | JWT propio (correo + contraseña, bcrypt) | NO usa SSO. RBAC por rol. |
| Entorno local | Ejecución directa (venv + uvicorn / npm) | Hay `docker-compose.yml`, pero en local se trabaja con SQLite sin contenedor de BD. |
| Runtimes | Python **3.12** · Node **20 LTS** | |

## 4. Estructura del repositorio

```
monte-esmeralda-sistema-gestion-pagos/
├── CLAUDE.md                  # este archivo (reglas globales)
├── docker-compose.yml
├── .gitignore
├── .claude/skills/            # skills del proyecto (sección 9)
├── backend/                   # FastAPI — SE MANTIENE INTACTO
│   ├── CLAUDE.md              # reglas del backend
│   ├── requirements.txt
│   ├── alembic/               # migraciones (env.py + versions/)
│   └── app/
│       ├── main.py            # factory FastAPI + CORS + routers
│       ├── config.py          # settings (pydantic-settings, .env)
│       ├── database.py        # engine/session + tipo GUID portable
│       ├── deps.py            # dependencias (usuario actual, sesión)
│       ├── enums.py           # Role, SolicitudStatus, RequestType, etc.
│       ├── labels.py          # etiquetas legibles (es-MX) de roles y capacidades
│       ├── catalog.py         # datos semilla del árbol de Conceptos
│       ├── errors.py          # errores de dominio + handlers
│       ├── security.py        # JWT + hashing bcrypt
│       ├── seed.py            # datos semilla (usuarios, conceptos, etc.)
│       ├── models/            # 8 entidades ORM
│       ├── schemas/           # Pydantic (auth, user, supplier, concept, solicitud)
│       ├── routers/           # endpoints por recurso
│       ├── services/          # LÓGICA DE NEGOCIO (workflow, permissions, audit, …)
│       └── tests/             # pytest (unitarias + integración)
├── frontend/                  # Vite + React + TS + PrimeReact — EN MIGRACIÓN (Frente 3)
│   ├── CLAUDE.md              # reglas del frontend
│   └── src/
│       ├── app/               # main.tsx, providers, router, layout
│       ├── modules/           # un módulo por recurso (espeja backend); se va llenando
│       └── shared/            # ui/ (tema) y lib/ (api, types, labels, nav)
├── legacy-frontend/           # Next.js RETIRADO — solo referencia visual mientras se
│                              # migran las pantallas; NO se desarrolla ni se levanta
└── docs/                      # DOCUMENTACIÓN VIVA (se crea en Frente 4)
    ├── arquitectura.md
    ├── API-CONTRACT.md
    ├── GITHUB_WORKFLOW.md
    ├── glosario.md
    └── modulos/               # un .md por módulo
```

> **Nota sobre estructura:** el backend conserva su distribución actual (plana por tipo:
> `routers/`, `services/`, `models/`, `schemas/`), porque se mantiene intacto. El frontend,
> al reconstruirse en el Frente 3, adopta la estructura por módulos de GRC-OIR
> (`src/modules/<modulo>/` espejando el backend). **Regla de espejo** aplicable al
> frontend nuevo: cada módulo de negocio se llama igual en back y en front.

## 5. Plan de entregas y flujo de trabajo

Frentes de trabajo (incrementales; cada uno deja el sistema en verde):

| Frente | Descripción | Estado |
|---|---|---|
| **F1 — Higiene, versionado y arranque** | Renombrado, limpieza del baseline, JWT propio, repo en GitHub, arranque local verificado. | ✅ Hecho |
| **F2 — Adaptación del backend a SQL Server** | Driver pyodbc + cadena `mssql+pyodbc`, tipo GUID, revisión de migración Alembic, prueba contra AWS. Local sigue en SQLite. | ✅ Hecho |
| **F3 — Migración del frontend** | Reconstruir el frontend en Vite + React + TS + PrimeReact + TanStack Query + RHF + Zod. Backend intacto. Reusa `api.ts`, `types.ts`, `labels.ts`, `nav.ts`. Andamiaje (Vite + PrimeReact) aterrizado; migración de pantallas en progreso. | 🔄 En curso |
| **F4 — Documentación y skills** | Adaptar `CLAUDE.md` (raíz/back/front) y skills de GRC-OIR; generar `docs/`. | En curso |
| **F5 — Funcionalidad nueva (Paquete 2)** | Endurecimiento; tesorería/remesas; matriz de flujo de efectivo; reportería; fiscal (a futuro). | Pendiente |

> Los Frentes F2 y F3 tocan áreas distintas (backend vs. frontend) y pueden avanzar en
> **paralelo**.

### Flujo para desarrollar cada módulo/tarea

1. Ficha de alcance en `docs/modulos/<modulo>.md`.
2. Si hay cambios de datos: modelo + migración (skill `migraciones-sqlserver`).
3. Backend: repository/service → schemas → router (skill `backend-fastapi`).
4. Pruebas del backend.
5. Frontend: types → api → hooks → components → pages (skill `frontend-react`).
6. **Actualizar documentación** (skill `documentacion-proyecto`).
7. Revisión final (skill `revision-modulo`) → PR pequeño.

## 6. Modelo de datos: convenciones y estados

**Entidades (8):** `users`, `suppliers`, `supplier_clearances`, `concepts`, `solicitudes`
(entidad central), `attachments`, `comments`, `audit_events`.

- **PKs:** UUID mediante un tipo GUID portable (`TypeDecorator`) que funciona en SQLite y
  SQL Server. **Resuelto (ADR-004):** se mantiene portable — `CHAR(36)` en SQLite,
  `VARCHAR(36)` en SQL Server; **no** se usa `UNIQUEIDENTIFIER`.
- **Nombres:** snake_case en inglés tal como el código actual (`net_amount`,
  `final_concept_id`, `supervisor_reviewed_by`). No traducir ni renombrar campos
  existentes.
- **Timestamps:** `created_at` (y `updated_at` donde aplique). `solicitudes` lleva además
  `submitted_at`, `supervisor_reviewed_at`, `cfo_reviewed_at` y las FKs `captured_by`,
  `supervisor_reviewed_by`, `cfo_reviewed_by`.
- **Enums:** definidos como `str, enum.Enum` en `enums.py`. En SQL Server se implementan
  como `VARCHAR` (+ `CHECK` donde convenga). Valores exactos, no se cambian.
- **Conceptos:** árbol auto-referenciado (`parent_id`); solo hojas (`is_header = false`)
  son asignables. Validación en `concept_service.validate_leaf`.
- **Auditoría:** `audit_events` es polimórfica (`entity_type` + `entity_id`, sin FK
  directa) y de solo-inserción, con `before_json`/`after_json`.

**Roles (8):** `admin`, `field_admin`, `supervisor`, `cfo`, `treasurer`, `ceo`,
`accountant`, `engineer`. Capacidades definidas en `services/permissions.py` (fuente de
verdad). Visibilidad especial: Tesorería solo ve solicitudes `supervisor_approved`,
`cfo_approved` y `deferred`.

**Estados de la Solicitud (8) y máquina de estados** (única en `services/workflow.py`):

- `draft` → `submitted` (**enviar**; dueño/admin; requiere proveedor, descripción, monto
  > 0 y ≥1 adjunto).
- `submitted` → `supervisor_approved` (**aprueba Supervisor**; requiere concepto final que
  sea hoja, monto, proveedor y adjunto).
- `supervisor_approved` → `cfo_approved` (**aprueba CFO**).
- `supervisor_approved` → `deferred` (**difiere** el CFO).
- `submitted`/`supervisor_approved` → `correction_requested` (**solicita corrección**;
  vuelve a editable y se **reenvía** a `submitted`).
- `submitted`/`supervisor_approved` → `rejected` (**rechaza**; terminal).
- `draft`/`correction_requested` → `cancelled` (**cancela** dueño/admin).

Toda transición valida permisos + precondiciones y registra evento de auditoría. Nunca se
altera el estado fuera de `workflow.py`.

## 7. Seguridad

- Autenticación por **JWT (HS256)** con contraseña **bcrypt**. `JWT_SECRET` **solo** por
  variable de entorno; producción **siempre** lo sobrescribe (el default del código es un
  placeholder inseguro de respaldo).
- **RBAC por rol** validado en el servidor (`permissions.py`) en cada endpoint. El frontend
  solo oculta controles.
- **Auditoría** de todas las operaciones de flujo en `audit_events`.
- Validación de toda entrada con Pydantic. HTTPS/TLS y OWASP Top 10 en despliegue.
- Secretos: `.env` en local; **AWS Secrets Manager** recomendado para QA/producción. Nunca
  loguear datos personales/fiscales innecesarios.

## 8. Almacenamiento e integraciones

- **Adjuntos:** capa de abstracción compatible con S3 en `services/storage.py`. En dev usa
  disco local (`uploads/`); en producción, bucket S3. Toda escritura/lectura de archivos
  pasa por esta capa (no acceder al disco/bucket directamente desde routers).
- **Integraciones futuras (Paquete 2):** conciliación bancaria, exportación de lotes de
  pago y módulos fiscales se implementarán detrás de una **capa anti-corrupción** dedicada,
  igual criterio que la de almacenamiento. `[[POR LLENAR: definir al llegar el Paquete 2]]`

## 9. Skills del proyecto (`.claude/skills/`)

Adaptadas de GRC-OIR (Frente 4). Uso previsto:

- **`nuevo-modulo`** — andamiaje de un módulo (back + front) sin lógica de negocio.
- **`backend-fastapi`** — capas, Pydantic, RBAC, auditoría, SQL Server.
- **`frontend-react`** — patrón lista + panel de detalle, forms, PrimeReact, TanStack/RHF/Zod.
- **`migraciones-sqlserver`** — Alembic contra SQL Server en AWS (GUID, CHECK, NVARCHAR).
- **`integraciones-externas`** — adaptadores (almacenamiento, y a futuro bancos/fiscal).
- **`documentacion-proyecto`** — mantiene `docs/` al día con cada cambio.
- **`revision-modulo`** — Definición de Terminado antes de cada PR.

## 10. Documentación viva (obligatoria, a la par del código)

Política: **el código y su documentación viajan en el mismo PR.** Documentos en `docs/`:

- `arquitectura.md` — decisiones de arquitectura (ADR ligero) y diagramas.
- `API-CONTRACT.md` — endpoints, payloads, validaciones y ejemplos (complementa el OpenAPI
  que genera FastAPI).
- `GITHUB_WORKFLOW.md` — ramas, commits, PRs.
- `glosario.md` — términos del dominio.
- `modulos/<modulo>.md` — alcance, estados, pantallas y reglas por módulo.

## 11. Entorno local

- **Backend:** `venv` (Python 3.12) + `pip install -r requirements.txt`; `.env` con
  `DATABASE_URL=sqlite:///./monte_esmeralda.db` y tu `JWT_SECRET`. Crear BD con
  `alembic upgrade head` y `python -m app.seed`; correr con `uvicorn app.main:app --reload`
  (http://localhost:8000). Pruebas: `pytest`.
- **Frontend:** `cd frontend` + `npm install` + `npm run dev` (**http://localhost:5173**, el
  puerto de Vite). La base de la API se lee con `import.meta.env.VITE_API_URL`: copia
  `.env.local.example` a `.env.local` con `VITE_API_URL=http://localhost:8000`. Calidad:
  `npm run typecheck`, `npm run lint`, `npm test`.
- El frontend heredado (Next.js) quedó en `legacy-frontend/` solo como referencia visual: **ya
  no se levanta ni se desarrolla**.
- Usuarios semilla documentados en el README.

## 12. Git y flujo de trabajo

Detalle en `docs/GITHUB_WORKFLOW.md`. Resumen: ramas
`feature/<frente>-<area>-<descripcion>` (p.ej. `feature/f2-backend-sqlserver`); Conventional
Commits en español (`feat(solicitudes): ...`, `chore(backend): ...`); un PR por tarea con su
documentación actualizada.

**Protección de la rama `main`** (configurada en GitHub):
- Requiere Pull Request antes del merge, con **1 aprobación**.
- Descarta aprobaciones previas al hacer push de nuevos commits (dismiss stale approvals).
- Requiere resolver todas las conversaciones antes del merge.
- Bloquea force pushes y prohíbe borrar la rama.
- Métodos de merge permitidos: Merge, Squash y Rebase.
- (Aún no hay status checks/CI obligatorios; pendiente para cuando exista pipeline.)

## 13. Lo que NO debe hacer Claude Code (guardarraíles)

- ❌ Reescribir desde cero `workflow.py`, `permissions.py`, los modelos o las migraciones:
  se continúan de forma incremental.
- ❌ Cambiar el estado de una Solicitud fuera de `workflow.py`, o alterar la máquina de
  estados/valores de enums sin acordarlo.
- ❌ Desarrollar varios frentes/módulos a la vez o "toda la app".
- ❌ Programar lógica de negocio sin presentar un plan corto y recibir aprobación.
- ❌ Crear endpoints sin RBAC, o hacer transiciones sin registrar en `audit_events`.
- ❌ Modificar el esquema fuera de una migración Alembic.
- ❌ Poner credenciales (SQL Server, S3, etc.) en código o en archivos versionados.
- ❌ Acceder a disco/bucket fuera de `services/storage.py`.
- ❌ Cerrar una tarea sin actualizar la documentación correspondiente en `docs/`.
- ❌ Crear pantallas o portales para actores externos (proveedores).
- ❌ Inventar datos `[[POR LLENAR]]`: preguntar.

## 14. Decisiones pendientes (resolver con el equipo)

- **Base SQL Server en AWS (Frente 2 — ✅ verificado):** instancia RDS
  `devapps.cyd2zy4jjmkm.us-west-2.rds.amazonaws.com`, base `MESistemaGestionPagos`.
  Esquema aplicado con `alembic upgrade head` (revisión `657d9f17a604`, 8 tablas), más seed
  y `POST /auth/login` comprobados contra SQL Server. Ver ADR-010 en `docs/arquitectura.md`.
  **Usuario y contraseña van SOLO en `.env` local / AWS Secrets Manager — nunca en el
  repositorio ni en este archivo.**
- **Alcance y prioridad del Paquete 2** (tesorería, remesas, flujo de efectivo, reportería,
  fiscal). `[[POR LLENAR]]`
- **Endurecimiento pendiente:** validación de adjuntos (tamaño/tipo) + descarga por
  streaming; paginación/orden en listados; bloqueo **duro** por cumplimiento vencido de
  proveedor; ¿notificaciones por correo en transiciones clave? `[[POR LLENAR: priorizar]]`
- **Vulnerabilidad de Next.js:** ya no afecta al frontend en uso (el nuevo es Vite). Queda
  únicamente en `legacy-frontend/`, que no se levanta ni se despliega; desaparece del repo al
  cerrar el Frente 3 y retirar esa carpeta.

## 15. Glosario rápido

Glosario completo en `docs/glosario.md`. Mínimos: **Solicitud de Pago** unidad central del
flujo; **Folio** identificador único legible de la Solicitud; **Concepto** categoría del
catálogo jerárquico (solo las **hojas** son asignables); **Cumplimiento (clearance)** estado
documental del proveedor; **Supervisor** revisión operativa y asignación de concepto final;
**CFO** aprobación financiera / diferimiento; **Tesorería** consume solicitudes aprobadas;
**Admin de Campo** captura solicitudes; **Máquina de estados** transiciones válidas en
`workflow.py`; **Auditoría (`audit_events`)** bitácora append-only con snapshot
antes/después; **Paquete 1 / Paquete 2** alcance actual (solicitudes) vs. futuro (tesorería
y flujo de efectivo).
