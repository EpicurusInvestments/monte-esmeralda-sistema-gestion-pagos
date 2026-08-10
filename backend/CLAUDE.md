# CLAUDE.md — Backend (Python / FastAPI)

> Reglas locales del backend. Hereda y no contradice el `CLAUDE.md` raíz.
> La referencia de entidades, campos, estados y reglas es **el código actual**: en
> particular la máquina de estados de `app/services/workflow.py` y las capacidades de
> `app/services/permissions.py`. **El backend se continúa de forma incremental; no se
> reescribe ni se reestructura desde cero.**

## Stack

- **FastAPI** + **Pydantic v2** + **SQLAlchemy 2.x** + **Alembic**.
- Autenticación: **JWT (HS256)** con `python-jose`; contraseñas con **bcrypt**.
- Base de datos:
  - **Local/dev:** SQLite (archivo `monte_esmeralda.db`).
  - **Producción (Frente 2 — ✅ verificado contra RDS, ADR-010):** SQL Server en AWS RDS,
    driver **pyodbc (síncrono)** sobre
    **ODBC Driver 18 for SQL Server**. Los endpoints son `def` (sync); FastAPI los corre en
    threadpool. Ser consistente: no mezclar `async def` con acceso pyodbc síncrono.
- Conexión por variables de entorno (ver `.env.example`), seleccionada con `DB_BACKEND`:
  - `DB_BACKEND=sqlite` (default, dev): usa `DATABASE_URL` (p.ej. `sqlite:///./monte_esmeralda.db`).
  - `DB_BACKEND=sqlserver` (prod): la URL `mssql+pyodbc` se construye en `config.py`
    (propiedad `sqlalchemy_url`) vía `odbc_connect`, a partir de `DB_HOST`, `DB_PORT`,
    `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_ENCRYPT`, `DB_TRUST_SERVER_CERTIFICATE`,
    `ODBC_DRIVER`.
  - El engine y las migraciones (Alembic) usan `settings.sqlalchemy_url`.
  - **Usuario y contraseña NUNCA en código ni versionados.**
- Gestor de dependencias: **pip** con `requirements.txt` (versiones fijadas).

## Capas (estructura ACTUAL — plana por tipo, sin `modules/` ni `repository/`)

```
app/
├── main.py         # factory FastAPI: CORS + registro de routers + /health
├── config.py       # settings (pydantic-settings, .env)
├── database.py     # engine/session, Base, tipo GUID portable, get_db
├── deps.py         # dependencias: get_current_user (JWT), require_capability(cap)
├── enums.py        # Role, SolicitudStatus, RequestType, ClearanceStatus, AuditAction
├── labels.py       # etiquetas legibles (es-MX) de roles y capacidades — las consume la UI
├── catalog.py      # datos semilla del árbol de Conceptos
├── errors.py       # errores de dominio + handlers uniformes
├── security.py     # JWT (encode/decode) + hashing bcrypt
├── seed.py         # datos semilla
├── models/         # Capa Datos: entidades SQLAlchemy (8)
├── schemas/        # DTOs Pydantic de entrada y salida
├── routers/        # Capa API: endpoints + guard de permisos. SIN lógica de negocio.
└── services/       # Capa Negocio + acceso a datos: workflow, permissions, audit,
                    # concept_service, folio, storage, supplier_service
```

- El `router` valida permisos (con `require_capability`), recibe/retorna **schemas**
  Pydantic (nunca entidades ORM crudas) y delega en un `service`.
- El `service` concentra reglas, la máquina de estados y las transacciones, y consulta la
  BD mediante la `Session` de SQLAlchemy. **No hay capa `repository` separada**; no la
  introduzcas en el código existente. Módulos nuevos muy complejos podrían justificar una,
  pero es decisión a acordar, no default.
- Nunca saltarse capas ni mutar el estado de una Solicitud fuera de `workflow.py`.

## Convenciones del modelo de datos (del código actual — NO cambiarlas)

- **PKs UUID** mediante el tipo **GUID portable** de `database.py`, que persiste como
  `CHAR(36)` en SQLite y `VARCHAR(36)` en SQL Server. **Resuelto (ADR-004):** se mantiene
  portable; **no** se migra a `UNIQUEIDENTIFIER`. Los UUID se generan en la app (`new_uuid()`).
- **Nombres snake_case en INGLÉS**, tal como el código (`net_amount`, `final_concept_id`,
  `supervisor_reviewed_by`, `proposed_payment_week`). **No traducir ni renombrar** campos
  existentes.
- **Texto (ADR-009):** `VARCHAR` en SQL Server no es UTF-8 por defecto, así que todo texto va
  en Unicode. Corto: `Unicode(n)` (→ `NVARCHAR(n)`). Largo: el helper `unicode_text()` de
  `database.py` (→ `NVARCHAR(MAX)`); **nunca** `UnicodeText` pelado, que produce el `NTEXT`
  deprecado.
- **Fechas (ADR-009):** fecha sola con `Date` (→ `DATE`); fecha/hora con el helper
  `datetime2()` de `database.py` (→ `DATETIME2`), **nunca** `DateTime` pelado.
- **Montos:** `Numeric`/`DECIMAL(14,2)`; en Python se opera con `Decimal`. **Nunca float**
  para dinero (ya se respeta en `workflow.py`).
- **Enums:** un `str, enum.Enum` por dimensión en `enums.py` (fuente única). En SQL Server
  se implementan como `VARCHAR` (+ `CHECK` donde convenga). Valores exactos, no se cambian.
- **Máquina de estados en `workflow.py`:** las transiciones válidas se validan ahí (con
  permisos + precondiciones). Transición inválida → error de dominio claro
  (`InvalidWorkflowTransition`, etc.).
- **Conceptos:** árbol auto-referenciado (`parent_id`); solo hojas (`is_header = false`) son
  asignables (`concept_service.validate_leaf`).

## Seguridad (RBAC)

- Capacidades por rol en `services/permissions.py` (fuente de verdad, como datos/sets, no
  `if` repartidos). Chequeo con `permissions.has_capability(user, cap)`.
- Los endpoints declaran su guard: `Depends(require_capability("solicitud:submit"))`
  (definido en `deps.py`). El usuario actual se resuelve del **JWT** en
  `get_current_user`, nunca del cliente.
- **Defensa en profundidad:** aunque el router aplique el guard, los servicios de flujo
  vuelven a validar permiso y precondiciones (así está hoy en `workflow.py`). Mantener ese
  doble control.
- **No hay permisos a nivel de campo** en este sistema (a diferencia de GRC-OIR). No los
  introduzcas salvo que se acuerde un alcance nuevo.

## Auditoría

- Toda transición de estado y toda edición sensible registran un evento en `audit_events`
  vía `services/audit.py`: `entity_type`, `entity_id`, `action`, `performed_by`,
  `before_json`, `after_json`, `reason`. La bitácora es **append-only** (nunca update/delete).
- Un endpoint o servicio que cambie una Solicitud sin registrar su evento está incompleto.

## API

- Rutas **a nivel raíz por recurso** (`/auth/...`, `/solicitudes/...`, `/suppliers/...`).
  **Hoy NO hay prefijo `/api/v1`**; no lo agregues sin acordarlo (sería un cambio de
  contrato que impacta al frontend). Versionado = decisión futura.
- OpenAPI activo en `/docs` (no desactivar). Health en `/health`.
- Esquema de errores uniforme mediante el handler central de `errors.py`
  (`{code, message}` + status).
- Cargas de archivo (adjuntos) → endpoint multipart que delega en `services/storage.py`.
  **Pendiente de endurecimiento:** validar tamaño/tipo antes de guardar y servir la descarga
  por streaming (hoy no se valida ni se hace streaming).
- Procesos pesados o con terceros no deben bloquear el request: usar **BackgroundTasks**;
  migrar a cola solo si el volumen lo exige (revisable al llegar al Paquete 2).

## Entorno local

- `python -m venv .venv` (Python **3.12**) + `pip install -r requirements.txt`.
- `.env` con `DATABASE_URL=sqlite:///./monte_esmeralda.db` y tu `JWT_SECRET` propio.
- Crear/actualizar BD: `alembic upgrade head`; sembrar: `python -m app.seed`.
- Correr: `uvicorn app.main:app --reload`. Pruebas: `pytest`.
- **Para trabajar contra SQL Server:** instalar **ODBC Driver 18**, `pip install -r
  requirements.txt`, y en `.env` poner `DB_BACKEND=sqlserver` con las credenciales (nunca
  versionadas). El usuario de BD requiere permiso para crear el esquema
  (`db_ddladmin` / `db_owner`) al correr migraciones. Las migraciones se aplican contra AWS
  **solo tras revisarlas**.

## Entornos de base de datos

Se eligen con `DB_BACKEND` en `.env` (no versionado):

- **`sqlite`** → `backend/monte_esmeralda.db`. Es el modo de desarrollo y el que deben usar los
  smoke e2e del frontend.
- **`sqlserver`** → **SQL Server en AWS RDS** (`MESistemaGestionPagos`), la **base oficial**;
  requiere ODBC Driver 18 y las credenciales en `.env` (nunca en el repo). Es el entorno para
  verificar contra datos reales.

Tres reglas que no se negocian:

1. **`pytest` corre SIEMPRE en SQLite en memoria.** `tests/conftest.py` crea su propio engine
   `sqlite://` y **no** lee `DB_BACKEND` ni `settings.sqlalchemy_url`, así que el `.env` no lo
   afecta. Dos aserciones en ese archivo fallan si alguien reapunta el engine: las pruebas
   hacen `drop_all`/`create_all` y la instancia RDS es oficial **y compartida con GRC-OIR**.
2. **Tras cambiar el `.env`, reinicia `uvicorn`.** `--reload` recarga el código, **no** las
   variables de entorno: sin reiniciar seguirías contra la base anterior.
3. **Nada destructivo contra AWS**: ni pruebas, ni `alembic downgrade`, ni borrados masivos.
   Revisa toda migración autogenerada antes de aplicarla ahí (Alembic emite `DROP` cuando el
   modelo y la base divergen).

Procedimiento completo (incluido el patrón para alternar con dos archivos `.env`) en el
[`README.md`](../README.md#entornos-de-base-de-datos).

## Calidad

- Tipos en todo. Pruebas con **pytest** (casos felices, validaciones de dominio y, sobre
  todo, **transiciones de estado** de `workflow.py`). Hoy pasan 32 pruebas.
- Recomendado (para alinear con GRC-OIR): incorporar **ruff** (lint/format) y **mypy**;
  aún no están configurados en este repo.
