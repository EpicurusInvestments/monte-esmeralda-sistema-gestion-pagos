---
name: migraciones-sqlserver
description: >
  Cómo crear, revisar y aplicar migraciones de base de datos del Sistema de Gestión de
  Pagos y Flujo de Efectivo (Monte Esmeralda) con Alembic. El proyecto usa SQLite en
  desarrollo y Microsoft SQL Server en AWS RDS en producción, con UN mismo juego de
  migraciones que debe correr en ambos. Úsala SIEMPRE que se vaya a cambiar el esquema:
  crear o alterar tablas, columnas, índices, llaves foráneas o CHECK constraints de
  estados. El esquema NUNCA se cambia a mano en la base: siempre por migración.
---

# Skill: migraciones-sqlserver

Toda modificación del esquema pasa por Alembic. Nada de cambios manuales en SSMS / Azure
Data Studio ni en un cliente de SQLite. Las migraciones viven en
`backend/alembic/versions/`.

## Regla de oro de este proyecto: una migración, dos dialectos

Dev corre en **SQLite** y prod en **SQL Server**. La misma migración debe aplicar en
ambos. Por eso:

- Usa **tipos genéricos de SQLAlchemy** (los del modelo), no tipos exclusivos del dialecto
  `mssql`. El tipo **GUID portable** de `database.py`, `Unicode`, `Numeric`, `Enum` de
  SQLAlchemy, `Boolean`, `Date`, `DateTime` se renderizan correctamente en cada motor.
- Solo usa ramas por dialecto (`if op.get_bind().dialect.name == "mssql": ...`) cuando sea
  estrictamente necesario, y documenta por qué.
- El tipo `Enum` de SQLAlchemy ya produce `VARCHAR` + CHECK en ambos motores; no hace falta
  escribir el CHECK a mano salvo casos especiales.

## Flujo

1. Ajustar/crear el modelo SQLAlchemy en `backend/app/models/<entidad>.py`, siguiendo las
   convenciones del código actual (nombres en inglés, tipos consistentes).
2. Generar la migración (en tu venv local, apuntando a SQLite):
   ```bash
   alembic revision --autogenerate -m "crear tabla remesas"
   ```
3. **Revisar SIEMPRE** el archivo generado en `backend/alembic/versions/`: la
   autogeneración no detecta bien renombres ni algunos ALTER. Confirmar tipos, nulabilidad,
   FKs, índices, CHECKs y que el `downgrade` revierta correctamente.
4. Aplicar en dev (SQLite): `alembic upgrade head`; verificar que la app levanta y que
   `pytest` pasa.
5. Para SQL Server: apuntar `DATABASE_URL` a la instancia RDS y `alembic upgrade head`
   **solo después de revisar** (ver notas de AWS). En una instancia compartida, con
   cuidado.

## Convenciones de esquema

- **PK**: tipo GUID portable, generado en la app (`new_uuid()`), nombre `<entidad>_id` /
  `id`. En SQL Server se decidirá `CHAR(36)` (lo actual) vs `UNIQUEIDENTIFIER`
  `[[POR LLENAR: decisión del Frente 2]]`.
- **Textos**: `Unicode(n)` (→ `NVARCHAR` en SQL Server) para acentos/ñ sin corromper.
  Longitudes según el campo.
- **Dinero**: `Numeric(14, 2)` (→ `DECIMAL(14,2)`). Nunca `Float`.
- **Booleanos**: `Boolean` (→ `BIT`). **Fechas**: `Date` / `DateTime`.
- **Estados**: `Enum(...)` de SQLAlchemy con los valores EXACTOS de `app/enums.py`. Ejemplo
  de los valores que deben quedar en el CHECK de `solicitudes.status`:
  ```
  ('draft','submitted','correction_requested','supervisor_approved',
   'cfo_approved','deferred','rejected','cancelled')
  ```
  Da nombre explícito a cada constraint (`ck_...`) para facilitar migraciones futuras.
- **FKs explícitas** con `ON DELETE`/`UPDATE` pensado: en datos financieros preferir
  `RESTRICT`/`NO ACTION` salvo acuerdo; evitar cascadas accidentales.
- **Índices**: en FKs y columnas de búsqueda/filtrado frecuentes (folio, estatus, fechas,
  `supplier_id`).
- **Timestamps**: `created_at NOT NULL` (+ `updated_at`, y los `*_reviewed_at`/`*_by` donde
  el modelo lo pida).
- **`audit_events`** es append-only: no agregar triggers/updates sobre ella.

## AWS RDS (notas)

- Conexión por `DATABASE_URL` en `.env` (`mssql+pyodbc://...`), endpoint
  `devapps.cyd2zy4jjmkm.us-west-2.rds.amazonaws.com`, base `MESistemaGestionPagos`,
  puerto 1433, ODBC Driver 18, TLS (`Encrypt` / `TrustServerCertificate` según la
  instancia). **Credenciales solo en `.env` / Secrets Manager, nunca versionadas.**
- **La instancia `devapps` es compartida** (también la usa GRC-OIR, en otra base). No
  ejecutar operaciones destructivas sin cuidado; ante migraciones riesgosas, snapshot de
  RDS primero.
- RDS no da acceso al SO: todo por conexión SQL estándar (Alembic funciona normal).

## Datos iniciales (seeds)

- El proyecto tiene su propio mecanismo de semilla en `backend/app/seed.py`
  (`python -m app.seed`), idempotente. Úsalo para catálogos y usuarios de prueba en vez de
  migraciones de datos, salvo que se acuerde lo contrario.
- Nunca incluir secretos ni datos personales reales en migraciones ni en seeds.

## Reglas

- Una migración por cambio lógico, mensaje descriptivo en español.
- La migración y la ficha del módulo (`docs/modulos/`) se actualizan en el mismo PR.
