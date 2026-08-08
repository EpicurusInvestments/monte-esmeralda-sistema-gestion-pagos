/** Hooks de datos del módulo Solicitudes (TanStack Query sobre el cliente central).
 *
 * La visibilidad la aplica el BACKEND (`can_view_solicitud`): Tesorería solo ve
 * `supervisor_approved` / `cfo_approved` / `deferred`, y el Admin de Campo solo las que
 * capturó. El frontend no filtra por rol: pide y muestra lo que le devuelven.
 */

import { useQuery } from "@tanstack/react-query";

import { api } from "@/shared/lib/api";
import type { SolicitudDetail, SolicitudListItem } from "@/shared/lib/types";

import type { SolicitudFiltros } from "./types";

const SOLICITUDES_KEY = "solicitudes";

/** Los filtros forman parte de la queryKey: al cambiarlos se reconsulta al backend. */
export function useSolicitudes(filtros: SolicitudFiltros) {
  return useQuery<SolicitudListItem[]>({
    queryKey: [SOLICITUDES_KEY, filtros],
    queryFn: () => api.listSolicitudes(filtros),
  });
}

export function useSolicitud(id: string | null) {
  return useQuery<SolicitudDetail>({
    queryKey: [SOLICITUDES_KEY, "detalle", id],
    queryFn: () => api.getSolicitud(id as string),
    enabled: id != null,
  });
}
