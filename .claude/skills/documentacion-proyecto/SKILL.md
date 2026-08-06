---
name: documentacion-proyecto
description: >
  Mantiene actualizada la documentación viva del Sistema de Gestión de Pagos y Flujo de
  Efectivo (Monte Esmeralda) en docs/ (arquitectura, API-CONTRACT, GITHUB_WORKFLOW,
  glosario, fichas de módulo). Úsala SIEMPRE al terminar cualquier tarea de desarrollo
  (endpoint nuevo o modificado, entidad o migración, pantalla, cambio de estados o de
  reglas, decisión técnica), antes de abrir un PR, o cuando se pida "actualiza la
  documentación", "documenta esto" o "deja registro". Regla del proyecto: un cambio sin su
  documentación actualizada NO está terminado; el código y su documentación viajan en el
  mismo PR.
---

# Skill: documentacion-proyecto

La documentación de este proyecto es **viva**: se actualiza a la par del código, no al
final. Esta skill define QUÉ documento tocar según el tipo de cambio y CÓMO escribirlo.

## Mapa: tipo de cambio → documento a actualizar

| Si el cambio es... | Actualiza... |
|---|---|
| Endpoint nuevo, modificado o eliminado | `docs/API-CONTRACT.md` (permiso/capacidad, reglas, ejemplos, errores) |
| Entidad nueva, campo nuevo, migración | `docs/modulos/<modulo>.md` (sección de entidades y estados) |
| Cambio en la máquina de estados o transiciones | `docs/modulos/<modulo>.md` (diagrama/tabla de transiciones) + nota en `docs/API-CONTRACT.md` si afecta endpoints |
| Pantalla nueva o rediseñada | `docs/modulos/<modulo>.md` (sección pantallas: qué muestra, qué roles la usan) |
| Decisión técnica o de arquitectura | `docs/arquitectura.md` como nuevo **ADR** (contexto → decisión → consecuencias), numerado consecutivo |
| Integración/almacenamiento nuevo o cambiado | `docs/arquitectura.md` (ADR si hubo decisión) + `docs/modulos/<modulo>.md` |
| Término de negocio nuevo o aclarado | `docs/glosario.md` |
| Cambio al flujo de trabajo Git/PRs | `docs/GITHUB_WORKFLOW.md` |
| Cambio a reglas globales del proyecto | `CLAUDE.md` raíz (¡primero!) y los `CLAUDE.md` locales (`backend/`, `frontend/`) si aplica |

## Cómo escribir

- **En español**, claro y breve. La documentación es para todo el equipo, incluidos
  perfiles no técnicos: explica el "por qué", no solo el "qué".
- No dupliques la fuente técnica: el OpenAPI de FastAPI ya documenta las firmas exactas;
  `API-CONTRACT.md` agrega negocio, permisos y ejemplos legibles. La ficha del módulo
  agrega decisiones, pendientes y lo aprendido al implementar.
- Marca lo no resuelto como `[[POR LLENAR: ...]]` — nunca lo inventes.
- Si detectas que el código contradice un documento, NO "corrijas" en silencio: repórtalo
  como inconsistencia a resolver.

## Checklist al cerrar una tarea (antes del PR)

1. ¿Toqué endpoints? → `API-CONTRACT.md` actualizado.
2. ¿Toqué el modelo de datos? → ficha del módulo actualizada (y migración referida).
3. ¿Cambié la máquina de estados? → transiciones actualizadas en la ficha del módulo.
4. ¿Tomé una decisión técnica con alternativas? → ADR nuevo en `arquitectura.md`.
5. ¿Apareció vocabulario nuevo? → `glosario.md`.
6. ¿La ficha `docs/modulos/<modulo>.md` refleja el estado real del módulo?
7. Incluir los archivos de `docs/` modificados EN EL MISMO PR que el código.
