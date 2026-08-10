# Módulo: administracion — Administración de usuarios

> Ficha viva del módulo. Se actualiza junto con el código (skill `documentacion-proyecto`).

## Propósito

Gestiona las **cuentas de acceso al sistema**: quién puede entrar y con qué **rol**. El rol es
lo que determina todo lo demás (qué ve cada persona, qué transiciones puede ejecutar), así que
esta pantalla es la puerta de entrada al RBAC del sistema.

Es una pantalla de **solo Admin** (`user:manage`). El resto de los roles no la ve en el menú y
tampoco puede entrar por URL.

## Alcance

- **Incluye:** listar usuarios, búsqueda y filtrado (por rol y por estado), alta con contraseña
  inicial, edición de nombre / rol / estado, **restablecer la contraseña** de un usuario, y la
  **consulta** de la matriz de roles y permisos.
- **No incluye:** borrado físico (no existe `DELETE`; dar de baja es `is_active = false`);
  cambio de correo (es la identidad de la cuenta); **edición** de la matriz de permisos (la
  matriz vive en código; ver Pendientes); autoservicio de contraseña por parte del usuario
  ("olvidé mi contraseña", cambio de la propia); invitaciones por correo; 2FA; ni historial de
  accesos.

## Entidades

`users` (una sola entidad, sin sub-entidades). Campos que expone `UserOut`:

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID (str) | PK |
| `email` | str | **Identidad de la cuenta.** Único; el backend lo normaliza a minúsculas. No editable |
| `full_name` | str | Nombre para mostrar |
| `role` | enum `Role` | Uno de los 8 roles; etiqueta legible en `labels.ts` (`ROLE_LABELS`) |
| `is_active` | bool | `false` = sin acceso (el login responde 401 «La cuenta está inactiva.») |
| `created_at` / `updated_at` | datetime | Solo lectura; los muestra el panel de detalle |

La contraseña **nunca** viaja de vuelta: la tabla guarda `password_hash` (bcrypt) y ningún
endpoint lo devuelve.

## Endpoints

Contrato y comportamiento verificado en [`../API-CONTRACT.md`](../API-CONTRACT.md#usuarios-users--solo-admin-usermanage).

- `GET /users` — listar (todos, ordenados por nombre), **200**.
- `POST /users` — crear (`email, full_name, role, password`), **201**. Correo duplicado →
  **422** `VALIDATION_ERROR`.
- `PATCH /users/{user_id}` — actualizar (`full_name?, role?, is_active?, password?`), **200**.
  Contraseña vacía o ausente = **no se cambia**.
- `GET /roles-permissions` — matriz legible de roles × capacidades, **solo lectura** (`POST` /
  `PATCH` / `DELETE` → 405). Etiquetas y agrupación vienen del backend (`app/labels.py`).

## Pantallas

**`/administracion`** (`frontend/src/modules/administracion/`). Patrón **lista + panel de
detalle**, igual que Conceptos y Proveedores:

| Zona | Contenido |
|---|---|
| Encabezado | Título y botón **«+ Nuevo usuario»** |
| Toolbar | Búsqueda local por nombre o correo · `Dropdown` de **rol** (los 8 con `ROLE_LABELS`, con «limpiar» = todos) · `Dropdown` de **estado** (Activos / Inactivos / Todos) · contador |
| Lista | `DataTable` (modo compacto): nombre, correo, rol y estado (badge Activo/Inactivo) |
| Panel derecho | Identificación, acceso (rol y estado) y registro (alta / última actualización). Botón **«Editar»**. Su ancho se ajusta arrastrando el borde izquierdo (ver ADR-011) |
| Formulario | Alta/edición en el mismo panel (RHF + Zod) |
| Roles y permisos | Botón junto a «+ Nuevo usuario». Ocupa el mismo panel derecho con la matriz en **solo consulta**; se cierra con la ✕ y se recupera el detalle del usuario que estuviera seleccionado |

**Vista de Roles y permisos** (`RolesPermisosPanel`). Muestra **un rol a la vez**, desplegable,
con sus capacidades agrupadas por área (Solicitudes, Proveedores, Catálogo, Auditoría,
Administración), el código de cada capacidad —el valor que valida el servidor— y el conteo
«N de 17» siempre visible para comparar roles de un vistazo. No es una tabla rol × capacidad
porque son 8 roles × 17 capacidades y el panel mide 420–620px: esa matriz obligaría a scroll
horizontal y a truncar etiquetas. Trae un aviso de que la edición todavía no existe, y **ningún**
control editable. La consulta se dispara solo al abrir el panel (`enabled` del hook) y se cachea
una hora: la matriz no cambia hasta un despliegue.

Diferencias entre los dos modos del formulario (un solo componente, `UsuarioForm`):

| | Alta (`new`) | Edición (`edit`) |
|---|---|---|
| Correo | Editable, obligatorio | **Deshabilitado** (se muestra como contexto; el backend no lo acepta en el `PATCH`) |
| Contraseña | **Obligatoria** (mín. 8) | **Opcional**: en blanco no se cambia; si se escribe, mín. 8 |
| Estado activo | No aparece (el usuario nace activo) | Checkbox «Activo — puede iniciar sesión» |

Comportamiento: la búsqueda y los dos filtros son **locales** (`GET /users` no acepta
parámetros). El correo duplicado se muestra **sobre el campo `email`** sin perder lo capturado.

## Permisos (capacidades)

Fuente de verdad: `backend/app/services/permissions.py`.

| Capacidad | Quién la tiene | Para qué |
|---|---|---|
| `user:manage` | **Solo `admin`** | Listar, crear y actualizar usuarios, y consultar la matriz de roles y permisos |

Tres capas, todas alineadas con `permissions.py`:

1. **Menú:** la entrada «Administración» de `NAV_ITEMS` (`nav.ts`) es `roles: ["admin"]`.
2. **Ruta:** el guard `RequireCapability can={canManageUsers}` (`app/guards.tsx`) explica el
   bloqueo en lugar de rebotar en silencio a quien llegue escribiendo la URL.
3. **Servidor:** los endpoints responden **403** `PERMISSION_DENIED` de todas formas. Las dos
   primeras capas son UX; esta es la que manda.

## Reglas de negocio

1. **El correo es la identidad y no se cambia.** Si alguien cambia de correo, se da de baja la
   cuenta y se crea otra: así la auditoría (`audit_events.actor_id`) sigue apuntando a la
   persona correcta.
2. **Baja lógica, nunca borrado.** `is_active = false` quita el acceso y preserva la integridad
   de las solicitudes que ese usuario capturó o aprobó.
3. **Contraseña de un solo sentido.** Solo se puede *establecer*, nunca leer. El Admin fija la
   inicial y puede restablecerla; el sistema no manda correos.
4. **Mínimo de 8 caracteres: regla del formulario, no del servidor.** El backend acepta
   cualquier longitud. Si algún día se endurece, el sitio a alinear es
   `modules/administracion/types.ts` (`PASSWORD_MIN`).
5. **El rol se cambia en caliente** y aplica en la siguiente petición del usuario afectado (el
   JWT solo lleva el `sub`; el rol se lee de la base en cada llamada).
6. **Las etiquetas de rol están en dos lados, a propósito.** `frontend/src/shared/lib/labels.ts`
   (`ROLE_LABELS`) es lo que el front pinta por su cuenta —tabla de usuarios, chip del header—
   sin pedir nada al servidor; `backend/app/labels.py` es lo que la **API describe** (la matriz de
   permisos y, a futuro, cualquier otro cliente). Hoy los ocho textos son idénticos; si se cambia
   uno, hay que cambiar el otro o el mismo rol se leerá distinto en la tabla y en la matriz.

## Pendientes / decisiones

- **Nada impide que un Admin se desactive o se degrade a sí mismo.** Ni el backend ni la
  pantalla lo bloquean: si es el único Admin, la instalación queda sin quién administre. El
  panel de detalle avisa cuándo estás viendo tu propia cuenta, pero es solo un aviso.
  `[[POR LLENAR: decidir si se bloquea en el servicio (recomendado) o solo en la UI]]`
- **Sin paginación ni orden por columna:** `GET /users` devuelve todo (hoy 8 usuarios
  sembrados) y la pantalla filtra en cliente. Entra en el endurecimiento pendiente de
  listados.
- **Sin política de contraseñas** (complejidad, expiración, reuso) ni bloqueo por intentos
  fallidos. `[[POR LLENAR: definir si el Paquete 2 lo requiere]]`
- **Sin autoservicio:** un usuario no puede cambiar su propia contraseña; hoy depende del
  Admin. Es el pendiente más probable de que lo pida el uso real.
- **La matriz de permisos no se puede editar.** `ROLE_CAPABILITIES` vive en
  `services/permissions.py`, así que cambiar quién puede qué es hoy un cambio de código con
  despliegue. Habilitar la edición desde la pantalla implica moverla a la base de datos, y eso
  arrastra decisiones de fondo (¿se auditan los cambios de permisos? ¿se pueden crear roles
  nuevos? ¿qué pasa con las sesiones activas de un rol que acaba de perder una capacidad?). Ver
  el ítem del BACKLOG.
