# Sistema de Gestión de Pagos y Flujo de Efectivo – Monte Esmeralda

Sistema de **flujo de trabajo** (no es un ERP, ni contabilidad, ni conciliación
bancaria) que captura y enruta **Solicitudes de Pago** a través de la operación
semanal del proyecto residencial Monte Esmeralda.

Este repositorio implementa **únicamente el Paquete 1: Fundación + Solicitudes de
Pago**. No incluye remesas, exportación bancaria, confirmaciones de pago, nómina,
ventas, DTUs, pronósticos ni matriz de flujo de efectivo (ver _Alcance_ abajo).

---

## ¿Qué permite hacer?

1. Crear proveedores y registrar su **cumplimiento** (resultado externo).
2. Mantener el **catálogo jerárquico de conceptos de flujo**.
3. Capturar una **Solicitud de Pago** y adjuntar documentos.
4. Enviarla a revisión del **Supervisor**.
5. El Supervisor asigna/confirma **concepto final** (solo hojas) y aprueba /
   rechaza / solicita corrección.
6. El **CFO** aprueba / rechaza / difiere / solicita corrección.
7. Bandejas de trabajo por rol y **bitácora de auditoría** completa.

---

## Arquitectura

Monolito modular:

| Capa        | Tecnología                                   |
| ----------- | -------------------------------------------- |
| Frontend    | Next.js (App Router) + TypeScript (estricto) |
| Backend     | FastAPI + Python (tipado)                    |
| Base de datos | PostgreSQL (SQLite para pruebas/dev ligero)|
| Archivos    | Abstracción compatible con S3 (disco local en dev) |
| Despliegue  | Docker Compose                               |
| Idioma UI   | Español                                       |

```
.
├── backend/            # FastAPI, SQLAlchemy, Alembic, servicios de flujo, pruebas
│   ├── app/
│   │   ├── models/     # ORM
│   │   ├── schemas/    # Pydantic
│   │   ├── routers/    # API por dominio
│   │   ├── services/   # Reglas de flujo, permisos, auditoría, almacenamiento
│   │   ├── catalog.py  # Catálogo de conceptos (semilla)
│   │   └── seed.py     # Usuarios + catálogo + proveedores demo
│   ├── alembic/        # Migraciones
│   └── tests/          # Pruebas unitarias + integración (pytest)
├── frontend/           # Next.js + TypeScript
│   ├── src/app/        # Pantallas (login, solicitudes, aprobaciones, etc.)
│   ├── src/lib/        # Cliente API, auth, navegación por rol, etiquetas
│   └── tests/          # Pruebas smoke (Playwright)
└── docker-compose.yml
```

---

## Puesta en marcha con Docker (recomendado)

Requiere Docker y Docker Compose.

```bash
docker compose up --build
```

Esto levanta:

- **db**: PostgreSQL 16 (`localhost:5432`)
- **backend**: FastAPI en `http://localhost:8000` (aplica migraciones y siembra
  datos al iniciar). Documentación interactiva en `http://localhost:8000/docs`.
- **frontend**: Next.js en `http://localhost:3000`

Abra `http://localhost:3000` e inicie sesión con cualquiera de los usuarios de
prueba listados abajo.

---

## Ejecución local sin Docker

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Por defecto usa SQLite (./monte_esmeralda.db); no requiere Postgres.
alembic upgrade head          # crea el esquema
python -m app.seed            # siembra usuarios, catálogo y proveedores demo
uvicorn app.main:app --reload # API en http://localhost:8000
```

> Para usar Postgres en local, exporte `DATABASE_URL`
> (`postgresql+psycopg2://usuario:clave@host:5432/bd`) antes de `alembic upgrade`.

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                        # http://localhost:3000
```

---

## Usuarios de prueba (semilla)

| Rol             | Correo                          | Contraseña     |
| --------------- | ------------------------------- | -------------- |
| Admin           | admin@monteesmeralda.mx         | admin123       |
| Admin de Campo  | campo@monteesmeralda.mx         | field123       |
| Supervisor      | supervisor@monteesmeralda.mx    | supervisor123  |
| CFO             | cfo@monteesmeralda.mx           | cfo123         |
| Tesorería       | tesoreria@monteesmeralda.mx     | treasurer123   |
| CEO             | ceo@monteesmeralda.mx           | ceo123         |
| Contabilidad    | contador@monteesmeralda.mx      | accountant123  |
| Ingeniería      | ingeniero@monteesmeralda.mx     | engineer123    |

Cada rol aterriza en su pantalla de inicio (Role Home):

- Supervisor → **Bandeja de Aprobaciones**
- CFO → **Aprobaciones Financieras**
- Admin de Campo → **Captura de Solicitudes**
- Tesorería → **Solicitudes** (solo aprobadas)
- CEO / Contabilidad / Ingeniería → **Vista de Solicitudes**
- Admin → **Administración**

---

## Flujo de trabajo

```
draft ──submit──▶ submitted ──supervisor-approve──▶ supervisor_approved ──cfo-approve──▶ cfo_approved
  ▲                  │  │                                  │  │  │
  │                  │  └─reject──▶ rejected               │  │  └─reject──▶ rejected
  │                  └─request-correction─┐                │  └─defer──▶ deferred
  └──── (editar/reenviar) ◀── correction_requested ◀───────┘ (request-correction)
```

Reglas clave (validadas en el servidor):

- **Envío** requiere proveedor, tipo, descripción, monto neto y **al menos un
  adjunto**.
- **Aprobación del Supervisor** requiere un **concepto final que sea hoja**
  (no encabezado), monto, proveedor y adjunto.
- **El CFO** solo actúa sobre solicitudes `supervisor_approved`.
- Toda transición y edición financiera/de concepto se **audita**.
- Los permisos se aplican **del lado del servidor**; el frontend solo oculta
  controles por UX.

### Cumplimiento de proveedores

El sistema **no evalúa** a los proveedores: solo registra el resultado de un
cumplimiento externo (`cleared` / `pending` / `blocked`). Un cumplimiento
**vencido** cuenta como _no vigente_ (`expired`). En el Paquete 1 esto **no
bloquea** la captura; se muestra una advertencia. El bloqueo duro se aplicará en
la etapa de pago (paquetes posteriores).

---

## Pruebas

### Backend (pytest) — unitarias + integración

```bash
cd backend
source .venv/bin/activate
pytest
```

Cubre: creación/envío de solicitudes, adjunto obligatorio, aprobación de
Supervisor con concepto hoja (y rechazo de encabezados), CFO solo tras
Supervisor, flujos de rechazo/diferimiento/corrección, creación de eventos de
auditoría y **aplicación de permisos por rol**.

### Frontend (Playwright) — smoke

Requiere backend (sembrado) y servidor de desarrollo del frontend.

```bash
cd frontend
npx playwright install chromium   # primera vez
npm run test:e2e
```

Cubre: login, captura + envío de solicitud, bandeja de Supervisor, bandeja de
CFO y la línea de tiempo de auditoría en el detalle.

---

## API (resumen)

| Método | Ruta                                          | Descripción                          |
| ------ | --------------------------------------------- | ------------------------------------ |
| POST   | `/auth/login`                                 | Inicia sesión (JWT)                  |
| GET    | `/auth/me`                                     | Usuario actual                       |
| GET/POST/PATCH | `/users`                              | Gestión de usuarios (Admin)          |
| GET/POST/PATCH | `/suppliers`                          | Proveedores                          |
| GET/POST | `/suppliers/{id}/clearances`                | Cumplimiento (registro externo)      |
| GET/POST/PATCH | `/concepts`                           | Catálogo de conceptos                |
| GET/POST | `/solicitudes`                              | Listar / crear                       |
| GET/PATCH | `/solicitudes/{id}`                        | Detalle / editar                     |
| POST   | `/solicitudes/{id}/submit`                    | Enviar a revisión                    |
| POST   | `/solicitudes/{id}/assign-concept`            | Asignar concepto final (Supervisor)  |
| POST   | `/solicitudes/{id}/supervisor-approve`        | Aprobación operativa                 |
| POST   | `/solicitudes/{id}/cfo-approve`               | Aprobación financiera                |
| POST   | `/solicitudes/{id}/reject`                    | Rechazar (Supervisor o CFO)          |
| POST   | `/solicitudes/{id}/request-correction`        | Solicitar corrección                 |
| POST   | `/solicitudes/{id}/defer`                     | Diferir (CFO)                        |
| GET/POST | `/solicitudes/{id}/comments`                | Comentarios                          |
| GET/POST | `/solicitudes/{id}/attachments`             | Adjuntos (descarga autenticada)      |
| GET    | `/audit-events`                               | Bitácora de auditoría                |

### Errores estructurados

```json
{ "code": "INVALID_WORKFLOW_TRANSITION", "message": "La solicitud no puede aprobarse en su estado actual." }
```

Códigos: `PERMISSION_DENIED`, `VALIDATION_ERROR`, `INVALID_WORKFLOW_TRANSITION`,
`MISSING_REQUIRED_ATTACHMENT`, `CONCEPT_REQUIRED`, `CONCEPT_MUST_BE_LEAF`,
`SUPPLIER_NOT_FOUND`, `AUTHENTICATION_ERROR`, `NOT_FOUND`.

---

## Seguridad

- Contraseñas con hash **bcrypt**.
- Autenticación con **JWT**.
- Permisos por rol **forzados en el servidor** (no solo ocultos en el frontend).
- Transiciones de flujo validadas en el servidor.
- Cada cambio de estado se audita.
- La descarga de adjuntos **requiere autenticación**.

---

## Alcance (fuera del Paquete 1)

No implementado intencionalmente: remesa, captura de saldo bancario, selección
de pagos, exportación de lote bancario, confirmaciones de pago, matriz de flujo
de efectivo, conciliación histórica, pronósticos, ventas/cobranza,
nómina/asistencia, CFDI/XML, cálculos ISR/IVA/retenciones, gestión de
contratos, DTUs y extracción con IA/OCR.
