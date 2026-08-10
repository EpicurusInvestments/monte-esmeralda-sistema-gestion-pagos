# CLAUDE.md — Frontend (React + TypeScript)

> Reglas locales del frontend. Hereda y no contradice el `CLAUDE.md` raíz.
>
> **Estado (Frente 3 cerrado):** este es el frontend del sistema, en el stack de GRC-OIR
> (Vite + React + TS + PrimeReact + TanStack Query + RHF + Zod). Están migradas **todas** las
> pantallas del Paquete 1: login, Solicitudes (lista, captura/edición, detalle con adjuntos,
> comentarios, acciones de flujo y bitácora), las dos bandejas de aprobación, Proveedores con
> cumplimientos, Catálogo de Conceptos y Administración de usuarios. La raíz `/` sigue siendo
> un placeholder hasta que exista el Dashboard (Paquete 2).
>
> El frontend anterior en Next.js **se retiró del repositorio**; su historial queda en git.
> Estas reglas rigen todo lo que se agregue de aquí en adelante.

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
| **Toolbar** | Búsqueda local, filtros (estado, proveedor, tipo, fechas) siempre como `Dropdown` con la etiqueta dentro de la opción (“Estado: activos”), contador |
| **Lista + detalle** | DataTable a la izquierda; **panel de detalle a la derecha** (`--detail-width`, 420px) al seleccionar un renglón, sin perder el contexto de la lista. El ancho se ajusta arrastrando su borde izquierdo (`useResizableDetail` + `DetailResizeHandle`): mínimo el valor por defecto, máximo +200px, y se recuerda en `localStorage` para todas las pantallas |
| **Forms full-screen** | Para capturas complejas (Nueva/Editar Solicitud): pantalla completa por secciones, con adjunto obligatorio antes de enviar |

### Convenciones visuales

- **Badges de estado** para la Solicitud, con los **valores EXACTOS** de `SolicitudStatus`:
  `draft`, `submitted`, `correction_requested`, `supervisor_approved`, `cfo_approved`,
  `deferred`, `rejected`, `cancelled`. El front **nunca inventa estados**; toma etiqueta y
  tono de `labels.ts`.
- **El tamaño es del tema, no de la pantalla.** `theme.css` define una escala única
  (`--fs`, `--fs-mono`, `--fs-sm`, `--fs-xs`, `--fs-th`, `--fs-lg`, `--fs-xl`) y el alto de
  control (`--ctl-h`, `--ctl-pad-x/y`), y **alinea a PrimeReact a esa escala** en un solo
  bloque. Referencia: el buscador de la toolbar y la columna de folio/código/RFC — 13px de
  texto y 34px de alto de control. Ninguna pantalla fija `fontSize` inline ni reparte clases
  `p-inputtext-sm`: el modo *small* de la librería es 14px/42px, o sea **más grande** que la
  referencia. Excepciones que sí destacan: `thead th` (`--fs-th`, en negrita) y `.td-main`
  (dato principal de la fila y cuentas agrupadoras del catálogo: mismo tamaño, más peso).
- Las **DataTable del patrón** van con `size="small"` (`p-datatable-sm`): esa clase aporta
  solo la densidad del padding; el tamaño de letra lo pone el tema.
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
- Base de la API por variable de entorno: `import.meta.env.VITE_API_URL` (en `.env.local`,
  a partir de `.env.local.example`).
- Accesibilidad básica: labels en inputs, foco visible, navegación por teclado.

## Calidad

- `tsc --noEmit`, lint **eslint**, pruebas unitarias con **vitest**.
- Pruebas end-to-end con **Playwright** (reescribir sobre el frontend nuevo las smoke
  tests que hoy existen).
