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
- **Edición de la matriz de roles y permisos desde la UI** (módulo propio). Hoy
  `ROLE_CAPABILITIES` (`services/permissions.py`) vive **en código** y es la fuente de verdad;
  ya existe la **consulta** en solo lectura (`GET /roles-permissions`, visible en Administración
  de usuarios). Cambiar quién puede qué exige hoy editar el archivo y desplegar.

  Trabajo necesario:
  1. **Modelo en BD** para la relación rol ↔ capacidad, con su **migración Alembic** (nunca
     fuera de una migración) y el catálogo de capacidades como referencia.
  2. **Sembrar la matriz actual** (los 8 roles × 17 capacidades de hoy) para que el
     comportamiento no cambie al desplegar.
  3. **`permissions.has_capability` lee de BD, con caché.** Hoy es una consulta en memoria en
     cada petición y se ejecuta en todos los endpoints: sin caché, cada llamada pagaría una
     consulta extra.
  4. **Endpoints de escritura** sobre `/roles-permissions` (con `user:manage`, como la consulta).
  5. **UI de edición**, sustituyendo la vista de solo consulta actual.

  Salvaguardas (no opcionales):
  - **Impedir que el Admin se quede sin `user:manage`** o se bloquee el acceso a sí mismo: hay
    que garantizar que siempre exista al menos un rol —con al menos un usuario activo— capaz de
    administrar. Se solapa con el ítem del auto-bloqueo del Admin, más abajo.
  - **Auditar cada cambio** en `audit_events` (quién quitó o dio qué capacidad, y cuándo): es un
    cambio de seguridad, de los que más importa poder reconstruir.
  - **Validar contra el catálogo de capacidades**: solo se aceptan códigos existentes, para que
    no entren permisos inventados que nadie valida.

  Decisiones abiertas antes de implementar: ¿se pueden **crear roles nuevos** o solo reasignar
  capacidades de los 8 actuales? ¿qué pasa con las **sesiones activas** de un rol al que se le
  acaba de quitar una capacidad (aplica en la siguiente petición, o se invalida el token)?
  `[[POR LLENAR: prioridad]]`
- **Un Admin puede desactivarse o degradarse a sí mismo.** `PATCH /users/{id}` no protege la
  última cuenta con `user:manage`: si el único Admin se pone `is_active = false` o se cambia de
  rol, nadie puede volver a administrar usuarios (tampoco hay endpoint para recuperarlo; habría
  que tocar la base). Ver la ficha de
  [`modulos/administracion-usuarios.md`](modulos/administracion-usuarios.md).
- **Sin política de contraseñas ni autoservicio.** El backend acepta cualquier longitud (el
  mínimo de 8 lo pone hoy el formulario), no hay expiración ni bloqueo por intentos fallidos, y
  un usuario no puede cambiar su propia contraseña: depende del Admin.
- **Servicio de notificaciones por correo** (Paquete 2). Avisar por correo a los implicados en
  **cada cambio de estado** de una Solicitud, a lo largo de todo el tren de etapas, para que el
  flujo no dependa de que alguien entre a revisar su bandeja.

  Quién recibe qué (los estados son los exactos de `SolicitudStatus`):

  | Transición | Se notifica a | Por qué |
  |---|---|---|
  | → `submitted` (envío o reenvío tras corrección) | **Supervisor** | Tiene algo que revisar y aprobar |
  | → `supervisor_approved` | **CFO** | Le toca la revisión financiera |
  | → `correction_requested` (desde Supervisor o CFO) | **Capturista** (`captured_by`, típicamente Admin de Campo) | Su solicitud volvió a editable y hay que corregirla y reenviarla |
  | → `rejected` | **Capturista** | Cierre negativo, terminal |
  | → `deferred` (lo difiere el CFO) | **Capturista** | Queda en espera, no rechazada |
  | → `cfo_approved` | **Capturista** y **Tesorería** | Listo para pago: es cuando Tesorería la ve |
  | → `cancelled` | Implicados hasta ese punto | Cierre por decisión del dueño/Admin |

  **Dónde se dispara:** en `services/workflow.py`, que ya es la única puerta de los cambios de
  estado — cada transición ya valida permisos y escribe en `audit_events`, así que el aviso es
  un paso más del mismo lugar y ninguna ruta puede olvidarse de notificar. El envío en sí va
  **detrás de una capa desacoplada** (SMTP o proveedor de correo) con plantillas, mismo criterio
  que `services/storage.py` para adjuntos: el dominio pide «notifica este evento» y no sabe cómo
  se manda. Conviene que el envío no bloquee ni pueda tumbar la transición (cola o, como mínimo,
  fallo silencioso registrado): un correo caído no debe impedir aprobar un pago.

  **Requiere definir antes de implementar:** (a) proveedor de correo y credenciales (por
  `.env` / AWS Secrets Manager, nunca en el repo); (b) plantillas por evento, en español y con
  el folio, monto, proveedor y quién actuó; (c) **destinatarios por transición** — hoy solo se
  conoce el capturista (`captured_by`); Supervisor, CFO y Tesorería son *roles*, así que hay que
  decidir si se notifica a todos los usuarios activos con ese rol, a una lista configurable o a
  un buzón por área. `[[POR LLENAR: proveedor, plantillas y destinatarios]]`

- **Diseñar el servicio de correo como genérico desde el inicio** (Paquete 2). Las
  notificaciones del flujo no serán su único uso: también hace falta para el **alta de usuarios**
  (bienvenida con sus credenciales o un enlace para fijar la contraseña — hoy el Admin la teclea
  y la comunica por fuera, ver
  [`modulos/administracion-usuarios.md`](modulos/administracion-usuarios.md)), el
  **restablecimiento de contraseña** y avisos futuros (vencimiento de cumplimiento de un
  proveedor, recordatorios de pendientes). Si la capa de envío nace atada al vocabulario de las
  Solicitudes, esos casos obligarían a rehacerla.

## Frontend

- **Perfil propio / cambiar mi contraseña.** Con Administración de usuarios montada, el Admin
  puede restablecer contraseñas de otros, pero nadie puede cambiar la suya. Requiere un endpoint
  nuevo (el `PATCH /users/{id}` exige `user:manage`).
- **Home (`/`) → Dashboard principal.** Hoy es un placeholder («Frontend en migración»). A
  futuro (**Paquete 2**) será un dashboard con métricas, paneles y gráficos interactivos
  (evaluar **Recharts** o **Chart.js**). Requiere datos de tesorería / flujo de efectivo para
  ser útil, así que depende del alcance del Paquete 2.
- ~~**Interceptor 401 → logout automático**~~ — **hecho** en la parte 2 de Solicitudes: el
  cliente central expone `setOnUnauthorized` y `AuthProvider` cierra la sesión ante cualquier
  401 de una llamada autenticada (el login queda excluido, va con `auth: false`).
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
  solo realinea los componentes ya usados (color: Button, InputText, Password; tamaño:
  DataTable, InputText, Dropdown, Calendar, Button). Alternativa de fondo: compilar un tema
  propio de PrimeReact.
- **Variante horizontal del logotipo.** El archivo actual (697×314) es el logo con el nombre
  en dos líneas; el header lo muestra a 80px de alto. Una variante apaisada permitiría el
  mismo peso visual con un header más bajo, que en una app de listas densas es espacio útil.
- **Actualización optimista de las acciones de flujo.** Hoy cada transición espera la
  respuesta y luego refetchea (los botones se deshabilitan mientras tanto). Con optimismo se
  sentiría instantáneo, a cambio de manejar el rollback si el backend rechaza. Mejora
  **opcional**: el flujo actual es correcto, solo menos ágil.
- ~~**Subir el `Toast` a un provider global**~~ — **hecho** al construir las bandejas
  (parte 4b): vive en `shared/ui/toast` (`ToastProvider` + `useToast()`) montado en la raíz. Se
  descubrió además que la versión instalada de PrimeReact **no posiciona el Toast por CSS**, así
  que `theme.css` le fija `position: fixed` y su esquina de forma explícita.
- **Contador de pendientes en las entradas del sidebar.** Las bandejas no muestran cuántas
  solicitudes esperan; el patrón de pantalla ya trae la clase `.side-count` portada de GRC-OIR
  para eso. Mejora **opcional**.
- **Paginación y orden por columna en las listas de Solicitudes.** Las tres vistas
  (`/solicitudes` y las dos bandejas) traen todo y ordenan por lo que devuelve el backend
  (`created_at` descendente). La paginación depende del endurecimiento del backend (ver arriba);
  el orden por columna se solapa con el ítem del `TreeTable`/orden de más arriba.
- **Ocultar la columna «Estado» en las bandejas.** Es redundante: por definición todas las filas
  comparten el mismo estado. Se dejó visible para no meter lógica condicional en la tabla.
  Mejora **cosmética**.
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

- ~~**Actualizar `README.md`** al flujo del frontend Vite~~ — **hecho**: describe el arranque
  local real (`:5173`, `VITE_API_URL`, comandos de calidad), la base de datos vigente
  (SQLite / SQL Server) y ya no promete un flujo Docker inexistente.
- ~~**Retirar `legacy-frontend/` del repo**~~ — **hecho**: se eliminó con `git rm -r` (31
  archivos; el historial sigue en git) y con él salió la vulnerabilidad de Next.js. Se limpiaron
  las referencias que quedaban en `CLAUDE.md` (raíz y frontend), `docs/arquitectura.md`, el skill
  `frontend-react`, el comentario de procedencia de `shared/lib/auth.tsx` y el texto de la
  pantalla raíz.
- ~~**Reescribir los smoke tests de Playwright** sobre el frontend nuevo~~ — **hecho**:
  `frontend/e2e/` con 9 smoke en chromium (login/logout y credenciales inválidas, camino feliz
  punta a punta con cambio de sesión, RBAC y panel redimensionable). Se corren con
  `npm run test:e2e` contra el backend local en `:8000` con `DB_BACKEND=sqlite` sembrado; crean
  sus propios datos, así que son repetibles sin limpiar la base.
- **Decidir la containerización** (`docker-compose.yml`). El archivo quedó del baseline: levanta
  PostgreSQL —retirado en el Frente 2— e intenta construir un frontend que no tiene
  `Dockerfile`, así que **hoy no levanta el sistema**; lleva un comentario de advertencia y el
  README remite al arranque local. No se tocó para no inventar un flujo Docker sin haber
  decidido si se containeriza. Ligado a la decisión de Docker en
  [`arquitectura.md`](arquitectura.md).
