# Backlog técnico — Sistema de Gestión de Pagos y Flujo de Efectivo (Monte Esmeralda)

> Lista **viva** de pendientes técnicos y de mejora que fueron surgiendo durante el
> desarrollo. No es el plan de entregas (eso está en la sección 5 del `CLAUDE.md` raíz) ni el
> registro de decisiones tomadas (eso está en [`arquitectura.md`](arquitectura.md) como ADRs).
>
> Cómo leerlo:
> - **[DECISIÓN]** = requiere que el equipo decida algo antes de poder implementarse.
> - El resto son tareas acordadas, pendientes de priorizar.
>
> Al resolver un ítem: quítalo de aquí y, si implicó una decisión de arquitectura, registra el
> ADR correspondiente en `arquitectura.md`.

## Endurecimiento de backend

- **Paginación en `/concepts` y `/suppliers`.** Hoy ambos devuelven el catálogo completo y el
  frontend filtra en cliente (78 conceptos, pocos proveedores). Funciona a este volumen, pero
  no escala y obliga a repetir el filtrado en cada pantalla.
- **Validación de adjuntos (tamaño y tipo) + descarga por streaming.** Hoy no se valida nada
  antes de guardar y la descarga carga el archivo completo en memoria.
- **Bloqueo DURO por cumplimiento vencido del proveedor en la etapa de pago.** En el Paquete 1
  el cumplimiento es informativo (se muestra como advertencia y no impide capturar). Ver la
  regla 3 de [`modulos/proveedores.md`](modulos/proveedores.md).
- **Validación de formato de RFC y CLABE.** El backend solo limita la longitud (`rfc` 20,
  `clabe` 18). El proyecto hermano GRC-OIR tiene una regex de RFC mexicano
  (`^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$`) reutilizable si se adopta.
- **[DECISIÓN] Coherencia del árbol de conceptos.** Nada impide asignar como padre un concepto
  de **otra sección**, ni se detectan **ciclos** (A padre de B y B padre de A). Hoy la única
  salvaguarda es el tope de 20 niveles de `build_path`. Falta decidir si se valida en el
  servicio y con qué regla.
- **[DECISIÓN] `PATCH /concepts`: ¿revalidar la unicidad de `code`?** El `POST` sí verifica que
  el código no exista, pero al editar no se revalida, así que se puede duplicar un código
  cambiándolo.
- **[DECISIÓN] Cumplimientos: ¿permitir corregir un registro, o solo alta?** Hoy son de solo
  alta; un registro equivocado únicamente se supersede con otro más reciente. No hay forma de
  anular ni corregir.
- **Errores de validación sobre campos `Decimal` devuelven 500 en vez de 422.** En
  `app/errors.py` el handler de `RequestValidationError` serializa `exc.errors()`, y para un
  campo `Decimal` con constraint (p.ej. `net_amount: Decimal = Field(gt=0)`) ese detalle
  incluye un `Decimal` que **no es JSON-serializable** → `TypeError` → 500. Repro:
  `POST /solicitudes` con `net_amount="0"` (con `description=""` sí responde 422 correctamente).
  Fix pequeño (serializar los detalles de forma segura); afecta la robustez de la API para
  cualquier cliente, aunque el formulario actual valide antes de enviar.
- **Notificaciones por correo en transiciones clave** (Paquete 2).

## Frontend

- **Interceptor 401 → logout automático.** Hoy un token expirado solo se detecta al arrancar
  (`/auth/me`); un 401 en una llamada posterior no cierra la sesión. Cobra importancia cuando
  haya pantallas consumiendo datos de forma continua.
- **Usar `state.from` del guard** para devolver al usuario al destino original después del
  login. El guard ya lo guarda; nadie lo lee todavía.
- **`TreeTable` para la jerarquía de Conceptos** (plegar/desplegar) y **orden por columna** en
  las listas. Hoy la jerarquía se comunica con el `path` como sublínea.
- **Confirmación (`ConfirmDialog`) al desactivar un proveedor**, idealmente con detección de
  dependencias (solicitudes asociadas). El backend no expone ese chequeo.
- **Revisar la alineación `nav.ts` ↔ `permissions.py`.** Caso conocido: `ceo` tiene
  `supplier:view` pero `/proveedores` no aparece en su menú, así que llega solo por URL.
- **Extender la alineación de PrimeReact al tema** conforme entren más componentes. El tema
  `lara-light-indigo` trae su indigo escrito a mano en decenas de reglas, así que `theme.css`
  solo realinea los componentes ya usados (Button, InputText, Password). Alternativa de fondo:
  compilar un tema propio de PrimeReact.
- **Auto-hospedar IBM Plex.** Hoy las tipografías vienen de la CDN de Google Fonts; en una red
  restringida la app cae a los fallbacks del sistema.
- ~~**`StatusBadge` de los 8 estados de Solicitud**~~ — **hecho** en el Frente 3 (ver ADR-011):
  `shared/ui/StatusBadge.tsx` sobre el `Badge` genérico, con etiqueta y tono de `labels.ts`.
- ~~**Mostrar el badge de cumplimiento del proveedor en el detalle de la Solicitud**~~ —
  **hecho** en la parte 2 de Solicitudes: aparece en el detalle y también al elegir proveedor
  en la captura, con aviso no bloqueante cuando no está vigente.
- **Nota ambiental — las pruebas necesitan RAM suficiente.** `vitest` monta un jsdom por
  archivo con PrimeReact (que inyecta su CSS en tiempo de ejecución), así que con la máquina
  saturada puede abortar con `Worker exited unexpectedly` o `spawn UNKNOWN` (errno −4094) al no
  poder crear procesos. **No es un fallo del proyecto**: con memoria disponible el suite pasa
  completo. Si aparece, libera memoria (navegadores, IDE) en lugar de tocar la config de
  Vitest, que quedó a propósito en sus **defaults** para no penalizar al CI ni al resto del
  equipo.

## Cierre del Frente 3 (limpieza)

Todo esto se ejecuta al terminar la migración del frontend y retirar el frontend heredado.

- **Actualizar `README.md`** al flujo del frontend Vite: `http://localhost:5173` y
  `VITE_API_URL` (hoy describe el arranque de Next.js en `:3000`).
- **Revisar la referencia a `localhost:3000` en `docker-compose.yml`**, ligada a la decisión de
  Docker que sigue diferida (ver «Decisiones pendientes» en
  [`arquitectura.md`](arquitectura.md)).
- **Retirar `legacy-frontend/` del repo.** Se conserva solo como referencia visual mientras se
  migran las pantallas; con él se va la vulnerabilidad de Next.js que hoy queda ahí sin
  desplegarse.
- **Reescribir los smoke tests de Playwright** sobre el frontend nuevo (los del frontend
  heredado quedaron en `legacy-frontend/tests/`).
