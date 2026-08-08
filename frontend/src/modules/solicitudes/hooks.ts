/** Hooks de datos del módulo Solicitudes (TanStack Query sobre el cliente central).
 *
 * La visibilidad la aplica el BACKEND (`can_view_solicitud`): Tesorería solo ve
 * `supervisor_approved` / `cfo_approved` / `deferred`, y el Admin de Campo solo las que
 * capturó. El frontend no filtra por rol: pide y muestra lo que le devuelven.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/shared/lib/api";
import type { RequestType, SolicitudDetail, SolicitudListItem } from "@/shared/lib/types";

import type { SolicitudFiltros } from "./types";

const SOLICITUDES_KEY = "solicitudes";

/** Payload de alta: `net_amount` va como string (el backend lo tipa `Decimal`). */
export interface SolicitudCreatePayload {
  request_type: RequestType;
  supplier_id: string;
  description: string;
  net_amount: string;
  proposed_concept_id?: string | null;
  proposed_payment_week?: string | null;
  document_date?: string | null;
  due_date?: string | null;
}

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

export function useCreateSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SolicitudCreatePayload) => api.createSolicitud(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SOLICITUDES_KEY] }),
  });
}

export function useUpdateSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SolicitudCreatePayload> }) =>
      api.updateSolicitud(id, data),
    onSuccess: (_res, vars) => {
      // Invalida la lista y el detalle de esa solicitud.
      qc.invalidateQueries({ queryKey: [SOLICITUDES_KEY] });
      qc.invalidateQueries({ queryKey: [SOLICITUDES_KEY, "detalle", vars.id] });
    },
  });
}
