---
name: revision-modulo
description: >
  Checklist de "Definición de Terminado" para revisar un módulo del Sistema de Gestión de
  Pagos y Flujo de Efectivo (Monte Esmeralda) antes de darlo por cerrado o abrir su Pull
  Request. Úsala SIEMPRE que se diga que un módulo "ya está", "lo terminé", "voy a hacer el
  PR" o "revisa el módulo". Verifica capas, fidelidad al código/convenciones, seguridad
  (RBAC), auditoría, máquina de estados, pruebas, migraciones y documentación viva.
---

# Skill: revision-modulo

Recorrer el módulo contra esta lista y reportar cada punto como **OK / Falta / N/A**,
señalando qué corregir (archivo/línea cuando se pueda). No marcar "terminado" si algo
crítico (seguridad, auditoría, migraciones, documentación) falta.

## Fidelidad al código y convenciones
- [ ] Nombres de entidades y campos consistentes con el código (snake_case en inglés); sin
      renombres sorpresa.
- [ ] Estados con los valores exactos de `enums.py` y CHECK constraints nombrados.
- [ ] Transiciones de estado validadas en `services/workflow.py` (o servicio del módulo
      siguiendo ese patrón); precondiciones respetadas (proveedor, monto > 0, adjunto,
      concepto hoja donde aplique). Nada muta el estado fuera del servicio.

## Arquitectura y capas
- [ ] `router` sin lógica ni SQL; `service` con reglas, transacciones y acceso a datos
      (sin capa `repository`); respuestas con schemas (nunca entidades ORM crudas).
- [ ] Frontend espeja la estructura; usa componentes compartidos del patrón (lista + panel
      de detalle, badges de estado).

## Seguridad (no negociable)
- [ ] Cada endpoint con autenticación + `require_capability(...)`; capacidad definida en
      `permissions.py`.
- [ ] Usuario resuelto del **JWT**, nunca del cliente.
- [ ] Defensa en profundidad: el servicio revalida permiso/precondiciones.
- [ ] Entradas validadas (Pydantic); sin PII/datos fiscales en logs; secretos solo en
      entorno.
- [ ] Sin pantallas/endpoints para actores externos (proveedores).

## Auditoría
- [ ] Toda transición/edición sensible registra evento en `audit_events` (append-only) con
      `before`/`after` y `performed_by` vía `services/audit.py`.

## Datos / migraciones
- [ ] Esquema solo por migraciones Alembic revisadas (con `downgrade` correcto).
- [ ] La migración corre en **SQLite (dev) y SQL Server (prod)**: tipos genéricos de
      SQLAlchemy, GUID portable, `Numeric`/DECIMAL.
- [ ] Tipos según **ADR-009**: `Unicode(n)`/NVARCHAR y `unicode_text()`/NVARCHAR(MAX) para
      texto; `Date` y `datetime2()`/DATETIME2 para fechas. **Sin** `UnicodeText` ni
      `DateTime` pelados (producen NTEXT deprecado y DATETIME legado en SQL Server).
- [ ] FKs explícitas + índices en FKs y columnas de filtros/bandejas.

## Integraciones (si aplica)
- [ ] Todo formato/archivo externo pasa por la capa anti-corrupción (hoy `storage.py`);
      routers/componentes no parsean formatos externos.
- [ ] Cargas de archivo con validación de tamaño/tipo y errores claros; idempotencia donde
      aplique.

## Pruebas y calidad
- [ ] Backend: pruebas de casos felices, validaciones y **transiciones de estado**; el set
      completo (`pytest`) sigue en verde.
- [ ] Frontend: `tsc --noEmit`, lint y pruebas; sin `any` injustificado; estados de
      carga/error/vacío manejados.
- [ ] (Recomendado, aún no obligatorio: `ruff` + `mypy` sin errores nuevos.)

## Documentación viva (bloqueante)
- [ ] `docs/API-CONTRACT.md` actualizado con los endpoints del módulo.
- [ ] `docs/modulos/<modulo>.md` refleja el estado real (entidades, estados, pantallas).
- [ ] Decisiones técnicas registradas como ADR en `docs/arquitectura.md`.
- [ ] Términos nuevos en `docs/glosario.md`.

## Pasos finales
- [ ] Router registrado en `app/main.py`; capacidad en `permissions.py`; ruta y menú (por
      rol) en el front (`nav.ts`).
- [ ] PR pequeño y enfocado, con descripción clara y la documentación INCLUIDA.

## Salida esperada
Resumen con: qué está OK, qué falta y un veredicto: **listo para PR** o
**bloqueado por: ...**.
