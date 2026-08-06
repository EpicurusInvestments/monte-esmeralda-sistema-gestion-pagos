---
name: integraciones-externas
description: >
  Cómo construir puntos de integración del Sistema de Gestión de Pagos y Flujo de Efectivo
  (Monte Esmeralda) siguiendo el patrón anti-corrupción. Úsala SIEMPRE que se intercambien
  datos con sistemas o archivos externos: hoy el almacenamiento de adjuntos (compatible con
  S3) y, a futuro (Paquete 2), estados de cuenta bancarios / conciliación, exportación de
  lotes de pago y — si el alcance lo incorpora — comprobantes fiscales (CFDI/XML). Garantiza
  que nada externo se filtre al dominio.
---

# Skill: integraciones-externas

Toda frontera con el exterior se expone al dominio mediante una **interfaz limpia
(port/adapter)**: el resto de la app nunca conoce formatos de archivo, SDKs de nube ni
protocolos externos.

## Estado actual del proyecto

- La **única** integración viva en el Paquete 1 es el **almacenamiento de adjuntos**:
  `app/services/storage.py` expone una interfaz compatible con S3 y hoy usa disco local
  (`uploads/`); mañana, un bucket S3, **sin cambiar el dominio**. Es el ejemplo de
  referencia del patrón en este repo.
- El resto de integraciones de esta skill es **a futuro (Paquete 2)** y se detalla como
  guía para cuando se construyan; hoy no existen. `[[POR LLENAR: confirmar alcance del
  Paquete 2]]`

## Estructura de un adaptador (patrón a seguir)

Cuando se agregue una integración nueva, crear una capa anti-corrupción dedicada
(sugerido `backend/app/integrations/<sistema>/`):

```
integrations/<sistema>/
├── port.py         # interfaz en términos del dominio; el negocio depende SOLO de esto
├── adapter.py      # implementación del port
├── mapper.py       # traducción formato externo ↔ modelo del dominio
└── parser.py / writer.py   # lectura/escritura del formato de archivo (si aplica)
```

El servicio de negocio recibe el `port` por inyección → se simula en pruebas y se
reemplaza sin tocar el dominio. (El `storage.py` actual ya sigue esta idea con su
puerto/adaptador local–S3.)

## Integraciones previstas para el Paquete 2 (referencia)

### Estados de cuenta bancarios (entrada)
- Carga manual o por archivo → movimientos para conciliación con los pagos.
- Validar duplicados (banco, fecha, referencia, monto) antes de insertar.
- Banco(s) y formato(s): `[[POR LLENAR]]`.

### Exportación de lotes de pago (salida)
- Generar el archivo/layout del banco a partir de las solicitudes aprobadas seleccionadas
  para pago. Idempotencia: re-exportar no debe duplicar; registrar cada exportación para
  trazabilidad. Formato: `[[POR LLENAR]]`.

### Comprobantes fiscales / CFDI (si el alcance lo incorpora)
- El Paquete 1 **no** maneja timbrado ni CFDI. Si el Paquete 2 lo incorpora, se decidirá
  entonces el alcance (preparación vs. recepción de folio) y se hará por esta capa. No
  construir nada fiscal sin alcance aprobado (registrar la decisión como ADR).

## Reglas generales

- Nunca llamar/parsear formatos externos desde un router o un componente React.
- Toda lectura/escritura de archivos pasa por la capa de integración (hoy, `storage.py`).
- Archivos grandes o procesos de conciliación NO bloquean el request (BackgroundTasks;
  cola si el volumen lo exige), con resultado consultable.
- Errores externos → mapear a errores del dominio claros (qué archivo/registro falló y por
  qué).
- Auditar cargas y exportaciones (quién, cuándo, qué archivo, resultado).
- Credenciales/rutas en configuración (`.env` / Secrets Manager); nada en el código.
- Probar `parser`/`mapper` con ejemplos reales **anonimizados**; probar servicios con
  dobles del `port`.
