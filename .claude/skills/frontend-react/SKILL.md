---
name: frontend-react
description: >
  Convenciones para implementar pantallas del Sistema de Gestión de Pagos y Flujo de
  Efectivo (Monte Esmeralda) con React + TypeScript sobre el stack objetivo del Frente 3
  (Vite + PrimeReact + TanStack Query + React Hook Form + Zod). Úsala SIEMPRE que se vaya a
  escribir o modificar frontend: pantallas, componentes, formularios, tablas, bandejas,
  panel de detalle, llamadas a la API, tipos, hooks o visibilidad por rol. Aplica el patrón
  lista + panel de detalle, forms full-screen, badges de estado y tipado estricto alineado
  a la API. Nota: el frontend heredado (Next.js) se retiró al cerrar el Frente 3; estas reglas
  rigen el frontend actual en `frontend/`.
---

# Skill: frontend-react

Cómo construir pantallas consistentes con el patrón lista + panel de detalle, sobre el
stack de GRC-OIR portado a este proyecto.

## Estructura del módulo (espeja al backend)

```
src/modules/<modulo>/
├── types.ts        # tipos alineados a los DTOs del backend
├── api.ts          # llamadas a los endpoints del recurso (rutas a nivel raíz, sin /api/v1)
├── hooks.ts        # queries / mutations con TanStack Query
├── components/
└── pages/
```

Lo reutilizable va a `src/shared/` y se construye UNA vez: layout (header + sidebar por
rol), tabla (DataTable) con toolbar, **panel de detalle (~480px)**, badges de estado,
modal de confirmación, cliente HTTP. **Se reutilizan del frontend actual** portándolos:
`api.ts`, `types.ts`, `labels.ts` (etiquetas/tonos de estado) y `nav.ts`.

## Patrón de pantalla (aplicarlo siempre)

1. **Lista + detalle**: DataTable a la izquierda (búsqueda local, filtros por estado /
   proveedor / tipo / fechas, contador); al seleccionar un renglón se abre el panel de
   detalle a la derecha (~480px) para ver/actuar sin perder el contexto. Patrón por defecto
   de Solicitudes, Proveedores y Conceptos.
2. **Form full-screen**: para la captura/edición de una Solicitud (Nueva/Editar), con
   secciones y el **adjunto obligatorio** antes de poder enviar.
3. **Bandejas**: listas operativas filtradas por estado según el rol: **Bandeja de
   Aprobaciones** (Supervisor, solicitudes `submitted`) y **Aprobaciones Financieras**
   (CFO, `supervisor_approved`). Las acciones de flujo (aprobar, rechazar, corrección,
   diferir) llaman a los endpoints de `workflow`.
4. **Detalle de Solicitud**: información, adjuntos, comentarios, acciones de flujo según
   rol/estado, y **línea de tiempo** de la auditoría.

## Convenciones visuales

- **Sistema de diseño = plantilla de GRC-OIR** (paleta, estilos, IBM Plex Sans / Mono),
  centralizado en el tema; no hardcodear colores por pantalla.
- **Badges de estado** con los valores EXACTOS de `SolicitudStatus`
  (`draft`, `submitted`, `correction_requested`, `supervisor_approved`, `cfo_approved`,
  `deferred`, `rejected`, `cancelled`); etiqueta y tono desde `labels.ts`. El front nunca
  inventa ni renombra estados.
- **Campos obligatorios** con asterisco.
- Textos es-MX; moneda **MXN**; fechas en formato local.
- (No aplican los "tags de campo" ni el "color por fase" de GRC-OIR: este sistema no tiene
  esos conceptos.)

## Reglas

- TypeScript estricto; nada de `any` sin justificación escrita.
- Nombres de campos consistentes con la API (snake_case en inglés del backend). Ideal a
  futuro: generar tipos desde OpenAPI (`openapi-typescript`); por ahora se mantiene
  `types.ts`.
- **RBAC del front = solo UX** (mostrar/ocultar/deshabilitar según rol); el backend valida
  siempre. `nav.ts` y `availableActions()` se mantienen alineados con `permissions.py`.
- Manejo explícito de carga / error / vacío en cada pantalla.
- Base de la API por entorno: `import.meta.env.VITE_API_URL` (bajo Vite).
- Tras cada mutación, **invalidar las queries** afectadas; deshabilitar el submit mientras
  envía; mostrar los errores del servidor con mensaje claro (incluido el **409** por
  transición de estado inválida).
- Los proveedores son datos: no crear portales ni pantallas para actores externos.

## Cierre

`tsc --noEmit`, lint (eslint) y pruebas (vitest / Playwright e2e) pasan; actualizar la
ficha del módulo en `docs/modulos/` (skill `documentacion-proyecto`); luego
`revision-modulo`.
