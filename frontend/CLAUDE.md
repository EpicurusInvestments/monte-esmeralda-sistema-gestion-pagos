# CLAUDE.md — Frontend (React + TypeScript)

> Reglas locales del frontend. Hereda y no contradice el `CLAUDE.md` raíz.
>
> **Estado:** este documento describe el **objetivo del Frente 3** — la reconstrucción del
> frontend en el stack de GRC-OIR (Vite + PrimeReact + TanStack Query + RHF + Zod). Hasta
> que esa migración aterrice, el frontend actual sigue en Next.js hecho a mano; estas reglas
> aplican al frontend nuevo conforme se construye.

## Stack (objetivo)

- **React + TypeScript** (`strict: true`). Bundler: **Vite**.
- Estado de servidor: **TanStack Query**.
- Formularios + validación: **React Hook Form + Zod**.
- Librería de componentes: **PrimeReact** — tabla densa + panel lateral + formularios
  largos por secciones.
- **Sistema de diseño = plantilla de GRC-OIR**, portada en el Frente 3: paleta, estilos y
  tipografía **IBM Plex Sans** (texto) / **IBM Plex Mono** (folios, claves, RFC). Se
  centraliza en el tema, no se hardcodea por pantalla.

## Estructura por módulo (espeja al backend)

```
src/modules/<modulo>/
├── types.ts        # tipos alineados a los DTOs del backend (ideal: generados de OpenAPI)
├── api.ts          # llamadas a los endpoints del recurso
├── hooks.ts        # data fetching (queries/mutations con TanStack Query)
├── components/     # piezas de UI del módulo
└── pages/          # pantallas registradas en el router
```

- Lo reutilizable va a `src/shared/` (componentes del patrón general de pantalla, tabla,
  panel de detalle, badges de estado, cliente HTTP).
- **Se reutiliza del frontend actual** (portándolo, no reescribiéndolo): el cliente
  `api.ts`, `types.ts`, `labels.ts` (etiquetas/tonos de estado) y `nav.ts` (navegación y
  acciones por rol). Son activos que ya reflejan la API y los permisos.

## Patrón general de pantalla (aplicar consistentemente)

| Zona | Contenido |
|---|---|
| **Header** | Título del módulo · usuario activo · logout |
| **Sidebar** | Menú por rol (según `nav.ts`, que espeja `permissions.py`) |
| **Toolbar** | Búsqueda local, filtros (estado, proveedor, tipo, fechas), contador |
| **Lista + detalle** | DataTable a la izquierda; **panel de detalle a la derecha (~480px)** al seleccionar un renglón, sin perder el contexto de la lista |
| **Forms full-screen** | Para capturas complejas (Nueva/Editar Solicitud): pantalla completa por secciones, con adjunto obligatorio antes de enviar |

### Convenciones visuales

- **Badges de estado** para la Solicitud, con los **valores EXACTOS** de `SolicitudStatus`:
  `draft`, `submitted`, `correction_requested`, `supervisor_approved`, `cfo_approved`,
  `deferred`, `rejected`, `cancelled`. El front **nunca inventa estados**; toma etiqueta y
  tono de `labels.ts`.
- **Campos obligatorios** con asterisco.
- Iconografía sobria; badges legibles por encima de íconos crípticos.
- Textos de UI en **español (es-MX)**; moneda **MXN**; fechas en formato local.
- (No aplican los tags de origen de dato «Heredado/Calculado/Timbrado» de GRC-OIR: este
  sistema no tiene esos conceptos.)

## Reglas

- TypeScript estricto; nada de `any` sin justificación escrita.
- Nombres de campos **consistentes con la API** (snake_case en inglés del backend).
  Ideal a futuro: generar tipos desde OpenAPI con **openapi-typescript**; por ahora se
  reutiliza y mantiene `types.ts`.
- El **RBAC del front es solo UX** (mostrar/ocultar acciones según rol); el backend valida
  siempre. `nav.ts` y `availableActions()` deben mantenerse alineados con
  `permissions.py`.
- Manejo explícito de estados de **carga / error / vacío** en cada pantalla.
- Base de la API por variable de entorno: bajo Vite será `import.meta.env.VITE_API_URL`
  (reemplaza al `NEXT_PUBLIC_API_URL` actual de Next.js).
- Accesibilidad básica: labels en inputs, foco visible, navegación por teclado.

## Calidad

- `tsc --noEmit`, lint **eslint**, pruebas unitarias con **vitest**.
- Pruebas end-to-end con **Playwright** (reescribir sobre el frontend nuevo las smoke
  tests que hoy existen).
