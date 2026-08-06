# Módulo: <nombre> — <título legible>

> Ficha viva del módulo. Copia esta plantilla a `docs/modulos/<modulo>.md` y complétala.
> Marca lo desconocido como `[[POR LLENAR: ...]]`, nunca lo inventes.

## Propósito

Qué resuelve el módulo, en una o dos frases, y para qué roles.

## Alcance

- Incluye: ...
- No incluye (fuera de alcance / futuro): ...

## Entidades

Por cada entidad: nombre (tabla), campos clave y tipos, relaciones (FKs), y notas.

| Entidad | Campos clave | Relaciones | Notas |
|---|---|---|---|
| ... | ... | ... | ... |

## Estados y transiciones (si aplica)

Enumerar los estados y la tabla de transiciones válidas (origen → destino, quién, con qué
precondiciones). Referir al servicio que las implementa.

| Transición | Origen → Destino | Rol | Precondiciones |
|---|---|---|---|
| ... | ... | ... | ... |

## Endpoints

Lista de endpoints del módulo (referir a `docs/API-CONTRACT.md` para el detalle).

## Pantallas

Qué pantallas lo componen, qué muestran y qué roles las usan.

## Permisos (capacidades)

Capacidades involucradas y qué rol las tiene (referir a `services/permissions.py`).

## Reglas de negocio

Validaciones, fórmulas y reglas que el servicio debe garantizar.

## Pendientes / decisiones

`[[POR LLENAR: ...]]`
