# GITHUB_WORKFLOW — Sistema de Gestión de Pagos y Flujo de Efectivo (Monte Esmeralda)

> Repositorio oficial:
> https://github.com/EpicurusInvestments/monte-esmeralda-sistema-gestion-pagos
>
> Cómo trabajamos con Git/GitHub en este proyecto. Documento VIVO.

## Ramas

- `main` — protegida (ver reglas abajo). Solo recibe merges por Pull Request aprobado.
  Siempre desplegable.
- `feature/<frente>-<area>-<descripcion>` — una rama por tarea.
  Ejemplos: `feature/f2-backend-sqlserver`, `feature/f3-frontend-solicitudes`,
  `feature/f4-andamiaje-docs-skills`.
- `fix/<area>-<descripcion>` — correcciones.

## Commits (Conventional Commits, en español)

Formato: `tipo(area): descripción breve en infinitivo`
- `feat(solicitudes): agregar acción de diferimiento del CFO`
- `fix(auth): corregir expiración del token`
- `docs(api): documentar endpoints de proveedores`
- `chore(backend): cambiar driver a pyodbc para SQL Server`
Tipos permitidos: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`.

## Reglas de protección de `main` (configuradas en GitHub)

- **Requiere Pull Request antes del merge**, con **1 aprobación**.
- **Descarta aprobaciones previas** al hacer push de nuevos commits (dismiss stale
  approvals).
- **Requiere resolver todas las conversaciones** antes del merge.
- **Bloquea force pushes** y **prohíbe borrar** la rama.
- Métodos de merge permitidos: **Merge, Squash y Rebase**.
- Aún **no** hay status checks / CI obligatorios (pendiente para cuando exista pipeline).

## Pull Requests

- Un PR por tarea, pequeño y enfocado a UN frente/módulo.
- El PR incluye SIEMPRE: código + pruebas + **documentación actualizada** (`docs/`). Un PR
  sin su documentación no se aprueba (regla de oro 6 del `CLAUDE.md`).
- Descripción del PR: qué cambia, por qué, cómo probarlo, capturas si hay UI.
- Antes de pedir revisión, pasar la skill `revision-modulo`.

## Versionado y entregas

`[[POR LLENAR: esquema de tags/releases por frente/entrega y changelog]]`
