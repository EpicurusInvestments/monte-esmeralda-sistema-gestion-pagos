/** Administración de usuarios — patrón lista + panel de detalle.
 *
 * Pantalla solo para `user:manage` (Admin). El guard `RequireCapability` del router bloquea el
 * acceso directo por URL y el sidebar no muestra la entrada al resto de los roles; el backend
 * responde 403 de todas formas, así que esto es únicamente UX.
 *
 * Búsqueda y filtros son LOCALES: `GET /users` no acepta parámetros (devuelve todos los
 * usuarios ordenados por nombre).
 */

import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { useMemo, useState } from "react";

import { useAuth } from "@/shared/lib/auth";
import { ROLE_LABELS } from "@/shared/lib/labels";
import { canManageUsers } from "@/shared/lib/nav";
import { useResizableDetail } from "@/shared/lib/useResizableDetail";
import { Badge } from "@/shared/ui/Badge";
import { DetailResizeHandle } from "@/shared/ui/DetailResizeHandle";

import { RolesPermisosPanel } from "../components/RolesPermisosPanel";
import { UsuarioDetailPanel } from "../components/UsuarioDetailPanel";
import { UsuarioForm } from "../components/UsuarioForm";
import {
  useActualizarUsuario,
  useCrearUsuario,
  useRolesPermisos,
  useUsuarios,
} from "../hooks";
import type { ActualizarUsuarioPayload, CrearUsuarioPayload } from "../hooks";
import { ROLE_OPTIONS } from "../types";
import type { Role, UserDetail, UsuarioFormValues } from "../types";

/** El panel derecho es uno solo: muestra el detalle del usuario, un formulario, o la matriz de
 *  roles y permisos. `roles` conserva la selección, así que al cerrarla se vuelve al usuario. */
type Modo = "view" | "new" | "edit" | "roles";

/** `GET /users` no filtra: los tres estados se resuelven en cliente sobre `is_active`. */
type FiltroEstado = "activos" | "inactivos" | "todos";

const ESTADO_OPTIONS: { value: FiltroEstado; label: string }[] = [
  { value: "activos", label: "Estado: activos" },
  { value: "inactivos", label: "Estado: inactivos" },
  { value: "todos", label: "Estado: todos" },
];

const ROL_OPTIONS = ROLE_OPTIONS.map((o) => ({ ...o, label: `Rol: ${o.label}` }));

/** Form → payload de alta. El rol ya viene validado por Zod contra los 8 valores. */
function aPayloadCrear(data: UsuarioFormValues): CrearUsuarioPayload {
  return {
    email: data.email.trim(),
    full_name: data.full_name.trim(),
    role: data.role as Role,
    password: data.password,
  };
}

/** Form → payload de edición. El correo NO viaja (el backend no lo acepta) y la contraseña
 *  solo cuando se escribió: en blanco significa «déjala como está». */
function aPayloadActualizar(data: UsuarioFormValues): ActualizarUsuarioPayload {
  const payload: ActualizarUsuarioPayload = {
    full_name: data.full_name.trim(),
    role: data.role as Role,
    is_active: data.is_active,
  };
  if (data.password) payload.password = data.password;
  return payload;
}

export function AdministracionPage() {
  const { user } = useAuth();
  const canEdit = user ? canManageUsers(user.role) : false;

  const [q, setQ] = useState("");
  const [rol, setRol] = useState<string | null>(null);
  const [estado, setEstado] = useState<FiltroEstado>("activos");
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [modo, setModo] = useState<Modo>("view");
  const detalleAncho = useResizableDetail();

  const lista = useUsuarios();
  // La matriz se pide solo cuando su panel está abierto (ver `useRolesPermisos`).
  const rolesPermisos = useRolesPermisos({ enabled: modo === "roles" });
  const crear = useCrearUsuario();
  const actualizar = useActualizarUsuario();

  const usuarios = useMemo(() => lista.data ?? [], [lista.data]);

  const items = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (estado === "activos" && !u.is_active) return false;
      if (estado === "inactivos" && u.is_active) return false;
      if (rol && u.role !== rol) return false;
      if (!texto) return true;
      return (
        u.full_name.toLowerCase().includes(texto) || u.email.toLowerCase().includes(texto)
      );
    });
  }, [usuarios, q, rol, estado]);

  const reset = () => {
    setSelected(null);
    setModo("view");
  };

  const onCrear = async (data: UsuarioFormValues) => {
    const nuevo = await crear.mutateAsync(aPayloadCrear(data));
    setSelected(nuevo);
    setModo("view");
  };

  const onActualizar = async (data: UsuarioFormValues) => {
    if (!selected) return;
    const upd = await actualizar.mutateAsync({
      id: selected.id,
      data: aPayloadActualizar(data),
    });
    setSelected(upd);
    setModo("view");
  };

  // ── panel derecho ─────────────────────────────────────────────────────────
  let detalle;
  if (modo === "roles") {
    detalle = (
      <RolesPermisosPanel
        roles={rolesPermisos.data?.roles ?? []}
        totalCapacidades={rolesPermisos.data?.capabilities.length ?? 0}
        cargando={rolesPermisos.isLoading}
        error={rolesPermisos.isError}
        onClose={() => setModo("view")}
      />
    );
  } else if (modo === "new") {
    detalle = (
      <UsuarioForm
        title="Nuevo usuario"
        modo="new"
        submitting={crear.isPending}
        onSubmit={onCrear}
        onCancel={reset}
      />
    );
  } else if (modo === "edit" && selected) {
    detalle = (
      <UsuarioForm
        title={`Editar: ${selected.full_name}`}
        modo="edit"
        defaultValues={{
          email: selected.email,
          full_name: selected.full_name,
          role: selected.role,
          is_active: selected.is_active,
          // Siempre en blanco: la contraseña no se lee del backend y en blanco no se cambia.
          password: "",
        }}
        submitting={actualizar.isPending}
        onSubmit={onActualizar}
        onCancel={() => setModo("view")}
      />
    );
  } else if (selected) {
    detalle = (
      <UsuarioDetailPanel
        usuario={selected}
        canEdit={canEdit}
        esSesionActual={user?.id === selected.id}
        onEdit={() => setModo("edit")}
      />
    );
  } else {
    detalle = (
      <div className="d-empty">
        <span>Selecciona un usuario para ver su detalle.</span>
      </div>
    );
  }

  return (
    <>
      <div className="cat-header">
        <div>
          <div className="cat-title">Administración de usuarios</div>
          <div className="cat-sub">
            Cuentas de acceso al sistema y su <strong>rol</strong>. El rol define lo que cada
            persona puede ver y hacer; el servidor lo valida en cada operación.
          </div>
        </div>
        {canEdit && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button type="button" className="btn" onClick={() => setModo("roles")}>
              Roles y permisos
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSelected(null);
                setModo("new");
              }}
            >
              + Nuevo usuario
            </button>
          </div>
        )}
      </div>

      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Buscar por nombre o correo…"
          aria-label="Buscar usuario"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <Dropdown
          aria-label="Filtrar por rol"
          options={ROL_OPTIONS}
          optionLabel="label"
          optionValue="value"
          placeholder="Rol: todos"
          showClear
          style={{ minWidth: 230 }}
          value={rol}
          onChange={(e) => setRol((e.value as string | null) ?? null)}
        />

        <Dropdown
          aria-label="Filtrar por estado"
          options={ESTADO_OPTIONS}
          optionLabel="label"
          optionValue="value"
          style={{ minWidth: 160 }}
          value={estado}
          onChange={(e) => {
            setEstado((e.value as FiltroEstado | null) ?? "activos");
            reset();
          }}
        />

        <span className="tb-spacer" />
        <span className="tb-count">
          {items.length} de {usuarios.length}
        </span>
      </div>

      <div className="split">
        <div className="list-pane">
          {lista.isLoading && <div className="state-msg">Cargando usuarios…</div>}
          {lista.isError && (
            <div className="state-msg error">No se pudieron cargar los usuarios.</div>
          )}
          {!lista.isLoading && !lista.isError && items.length === 0 && (
            <div className="state-msg">No hay usuarios para el filtro seleccionado.</div>
          )}
          {!lista.isLoading && !lista.isError && items.length > 0 && (
            <DataTable
              value={items}
              dataKey="id"
              selectionMode="single"
              selection={selected}
              onSelectionChange={(e) => {
                setSelected(e.value as UserDetail);
                setModo("view");
              }}
              scrollable
              scrollHeight="flex"
              size="small"
              aria-label="Usuarios"
            >
              <Column
                header="Nombre"
                body={(u: UserDetail) => <span className="td-main">{u.full_name}</span>}
              />
              <Column
                header="Correo"
                style={{ width: 260 }}
                body={(u: UserDetail) => <span className="td-2">{u.email}</span>}
              />
              <Column
                header="Rol"
                style={{ width: 210 }}
                body={(u: UserDetail) => ROLE_LABELS[u.role]}
              />
              <Column
                header="Estado"
                style={{ width: 110 }}
                body={(u: UserDetail) => (
                  <Badge
                    tone={u.is_active ? "green" : "gray"}
                    label={u.is_active ? "Activo" : "Inactivo"}
                  />
                )}
              />
            </DataTable>
          )}
        </div>

        <DetailResizeHandle {...detalleAncho.handleProps} />
        <aside className="detail-pane" style={{ width: detalleAncho.width }}>
          {detalle}
        </aside>
      </div>
    </>
  );
}
