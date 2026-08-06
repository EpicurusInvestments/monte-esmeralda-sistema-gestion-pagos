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
- **Decisión:** usar el `TypeDecorator` GUID de `database.py`, que hoy persiste como
  `CHAR(36)`. Para SQL Server queda pendiente decidir mantener `CHAR(36)` o migrar a
  `UNIQUEIDENTIFIER`. `[[POR LLENAR: decisión del Frente 2]]`
- **Consecuencias:** portabilidad entre motores; posible ajuste de tipo en la migración de
  SQL Server.

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

---

## Decisiones pendientes

Ver la sección 14 del `CLAUDE.md` raíz. En síntesis: tipo del GUID en SQL Server; alcance y
prioridad del Paquete 2; endurecimiento (validación de adjuntos, paginación, bloqueo duro
por cumplimiento); estrategia de ambientes/despliegue.

- **Docker (diferido):** `docker-compose.yml` aún levanta Postgres e inyecta una
  `DATABASE_URL` de Postgres, y el `Dockerfile` instala `libpq-dev` en vez del ODBC
  Driver 18. Local usa venv+SQLite y prod usa RDS gestionado, así que Docker se
  adaptará en un incremento propio si se decide containerizar. `[[POR LLENAR: decisión]]`
