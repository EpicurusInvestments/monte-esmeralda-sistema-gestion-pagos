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

| Capa | Tecnología |
| --- | --- |
| Frontend | React + TypeScript (estricto) + Vite + PrimeReact + TanStack Query + React Hook Form + Zod |
| Backend | FastAPI + Python (tipado) |
| Base de datos | **SQLite** en local · **SQL Server (AWS RDS)** en producción, con un solo juego de migraciones (se elige con `DB_BACKEND`) |
| Archivos | Abstracción compatible con S3 (disco local en dev) |
| Despliegue | Ejecución local (venv + Vite). La containerización está **diferida** (ver _Puesta en marcha_) |
| Idioma UI | Español (es-MX) |

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
├── frontend/           # Vite + React + TypeScript + PrimeReact
│   └── src/
│       ├── app/        # Arranque: providers, router, guards, layout, login
│       ├── modules/    # Un módulo por recurso, espejando al backend
│       │               #   (solicitudes, proveedores, conceptos, administracion);
│       │               #   cada uno con types.ts, hooks.ts, components/, pages/
│       └── shared/     # lib/ (cliente API, auth, tipos, etiquetas, navegación)
│                       # y ui/ (tema y componentes del patrón de pantalla)
├── docs/               # Documentación viva (arquitectura, contrato de API, módulos)
└── docker-compose.yml  # Diferido: hoy no es el camino soportado (ver abajo)
```

---

## Puesta en marcha

El camino soportado hoy es **local**: backend con venv + SQLite y frontend con Vite. Son dos
procesos y no requiere Docker ni una base de datos externa.

> **Docker está diferido.** El `docker-compose.yml` del repo quedó del baseline heredado: asume
> PostgreSQL (que ya se retiró en favor de SQLite/SQL Server) y un frontend que ya no existe, y
> el frontend actual no tiene `Dockerfile`. Tal cual, `docker compose up` **no levanta el
> sistema**. Containerizar es una decisión pendiente con su propio incremento; ver «Decisiones
> pendientes» en [`docs/arquitectura.md`](docs/arquitectura.md).

## Ejecución local

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Por defecto usa SQLite (./monte_esmeralda.db); no requiere una BD externa.
alembic upgrade head          # crea el esquema
python -m app.seed            # siembra usuarios, catálogo y proveedores demo
uvicorn app.main:app --reload # API en http://localhost:8000
```

> Para apuntar a **SQL Server** (AWS RDS) en vez de SQLite, ponga `DB_BACKEND=sqlserver` y las
> variables de conexión en `backend/.env` (requiere el **ODBC Driver 18**). Las credenciales van
> solo en `.env` o en AWS Secrets Manager, nunca en el repositorio. Detalle en
> [`backend/CLAUDE.md`](backend/CLAUDE.md) y ADR-003/ADR-010 de
> [`docs/arquitectura.md`](docs/arquitectura.md).

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # VITE_API_URL=http://localhost:8000
npm run dev                        # http://localhost:5173
```

Abra `http://localhost:5173` e inicie sesión con cualquiera de los usuarios de prueba listados
abajo. El backend debe estar corriendo en `:8000` (su CORS ya permite el origen de Vite).

Calidad del frontend:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest
```

---

## Entornos de base de datos

Hay **dos** entornos y se eligen con `DB_BACKEND` en `backend/.env` (que **no se versiona**).

| Para qué | `DB_BACKEND` | Base |
| --- | --- | --- |
| Desarrollo local | `sqlite` | Archivo `backend/monte_esmeralda.db` |
| `pytest` | *(no aplica)* | **SQLite en memoria, siempre** |
| Smoke e2e (Playwright) | `sqlite` | La SQLite local, sembrada |
| **Base oficial** (producción y verificación de verdad) | `sqlserver` | **SQL Server en AWS RDS** (`MESistemaGestionPagos`) |

- **`pytest` ignora el `.env` por completo.** `backend/tests/conftest.py` construye su propio
  engine `sqlite://` (en memoria, con `StaticPool`) y **no** lee `DB_BACKEND` ni
  `settings.sqlalchemy_url`. Aunque tu `.env` esté apuntando a AWS, las pruebas siguen en
  SQLite. Hay dos aserciones en ese archivo que fallan de inmediato si alguien reapunta el
  engine: las pruebas hacen `drop_all`/`create_all` en cada caso, y la instancia RDS es la base
  oficial **y está compartida con GRC-OIR**.
- **Los e2e también van contra SQLite.** Crean solicitudes, suben adjuntos y ejecutan
  transiciones reales: se corren contra el backend local con `DB_BACKEND=sqlite` y sembrado,
  **nunca** contra AWS.

### Cambiar a la base oficial (SQL Server en AWS)

Es el entorno para verificar contra los datos reales; no para desarrollar ni para probar.

1. En `backend/.env`, pon `DB_BACKEND=sqlserver` y las variables de conexión (`DB_HOST`,
   `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `ODBC_DRIVER`…). Requiere el
   **ODBC Driver 18 for SQL Server** instalado.
2. **Reinicia `uvicorn`.** El `.env` se lee **una sola vez, al arrancar**: `--reload` recarga el
   código pero **no** las variables de entorno. Si no reinicias, seguirás hablando con SQLite y
   creyendo que estás en AWS.
3. Para volver a local, `DB_BACKEND=sqlite` y reinicia otra vez.

Patrón recomendado para alternar sin editar a mano cada vez: mantén dos archivos —`.env` con la
configuración que uses a diario y `.env.sqlserver` (o `.env.sqlite`) con la otra— y copia el que
toque sobre `.env` antes de arrancar. Ninguno se versiona: ambos están cubiertos por
`.gitignore`, y las credenciales reales viven solo ahí o en AWS Secrets Manager.

> **Advertencias sobre la instancia de AWS**
>
> - **Nunca** corras `pytest` ni los e2e apuntando a ella.
> - **Nunca** ejecutes migraciones destructivas (`alembic downgrade`, `drop_all`, borrados
>   masivos): es la base oficial y está **compartida** con otro proyecto.
> - Antes de un `alembic upgrade head` contra AWS, revisa la migración generada: Alembic
>   autogenera `DROP` cuando el modelo y la base divergen.

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
- Admin de Campo → **Solicitudes** (la lista de lo que capturó; «Capturar Solicitud» queda a
  un clic en el menú)
- Tesorería → **Solicitudes** (solo aprobadas)
- CEO / Contabilidad / Ingeniería → **Vista de Solicitudes**
- Admin → **Administración de usuarios**

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

### Frontend (vitest) — unitarias + de integración de pantalla

```bash
cd frontend
npm test
```

Monta las pantallas reales con el router y los providers, con el cliente de API mockeado:
lista y detalle de cada módulo, formularios (validación y payloads), acciones de flujo,
filtros y los bloqueos por rol.

### Frontend (Playwright) — smoke end-to-end

Requiere el **backend corriendo en `:8000` con `DB_BACKEND=sqlite` y sembrado** (los e2e crean
datos reales; ver _Entornos de base de datos_). El servidor de Vite lo levanta Playwright solo si
no lo tienes ya abierto.

```bash
cd frontend
npx playwright install chromium   # solo la primera vez
npm run test:e2e                  # chromium, headless
npm run test:e2e:ui               # modo interactivo para depurar
```

Cubre: login/logout y credenciales inválidas; el camino feliz punta a punta cambiando de sesión
(Admin de Campo captura → adjunta → envía; Supervisor asigna concepto hoja y aprueba; CFO aprueba,
con la bitácora completa al final); RBAC (sin `user:manage` no hay Administración ni acceso por
URL; Tesorería solo ve estados aprobados); y el panel de detalle redimensionable.

Cada test **crea sus propios datos** con una descripción única por corrida, así que se pueden
repetir sobre la misma base sin limpiar nada.

---

## API (resumen)

| Método | Ruta                                          | Descripción                          |
| ------ | --------------------------------------------- | ------------------------------------ |
| POST   | `/auth/login`                                 | Inicia sesión (JWT)                  |
| GET    | `/auth/me`                                     | Usuario actual                       |
| GET/POST/PATCH | `/users`                              | Gestión de usuarios (Admin)          |
| GET    | `/roles-permissions`                          | Matriz de roles y capacidades, solo lectura (Admin) |
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
