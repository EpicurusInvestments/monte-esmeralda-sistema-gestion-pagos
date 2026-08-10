/** Hooks de datos del módulo Administración de usuarios (TanStack Query sobre `api.ts`).
 *
 * `GET /users` no acepta filtros: devuelve todos los usuarios ordenados por nombre, así que
 * la búsqueda y los filtros de la pantalla son locales y hay una sola query. Las mutaciones
 * invalidan `["usuarios"]`, la única clave del módulo.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/shared/lib/api";
import type { Role, RolesPermissions, UserDetail } from "@/shared/lib/types";

const USUARIOS_KEY = "usuarios";

export function useUsuarios() {
  return useQuery<UserDetail[]>({
    queryKey: [USUARIOS_KEY],
    queryFn: () => api.listUsers(),
  });
}

/** Matriz de roles y capacidades (solo lectura).
 *
 * `enabled` es lo que hace que la consulta salga SOLO al abrir el panel de Roles y permisos:
 * quien entra a administrar usuarios normalmente no la necesita. La matriz vive en código del
 * backend y no cambia hasta un despliegue, así que un `staleTime` largo evita refetches al
 * abrir y cerrar el panel. Clave propia, ajena a `["usuarios"]`: editar un usuario no la
 * altera. */
export function useRolesPermisos(opts: { enabled: boolean }) {
  return useQuery<RolesPermissions>({
    queryKey: ["roles-permisos"],
    queryFn: () => api.getRolesPermissions(),
    enabled: opts.enabled,
    staleTime: 60 * 60 * 1000,
  });
}

function useInvalidateUsuarios() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [USUARIOS_KEY] });
}

export interface CrearUsuarioPayload {
  email: string;
  full_name: string;
  role: Role;
  password: string;
}

/** Campos opcionales del `PATCH`: solo se envía lo que cambia. `password` se omite cuando el
 *  formulario lo deja en blanco (así el backend no la toca). */
export type ActualizarUsuarioPayload = Partial<{
  full_name: string;
  role: Role;
  is_active: boolean;
  password: string;
}>;

export function useCrearUsuario() {
  const invalidate = useInvalidateUsuarios();
  return useMutation({
    mutationFn: (data: CrearUsuarioPayload) => api.createUser(data),
    onSuccess: invalidate,
  });
}

export function useActualizarUsuario() {
  const invalidate = useInvalidateUsuarios();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ActualizarUsuarioPayload }) =>
      api.updateUser(id, data),
    onSuccess: invalidate,
  });
}
