/** Hooks de datos del módulo Solicitudes (TanStack Query sobre el cliente central).
 *
 * La visibilidad la aplica el BACKEND (`can_view_solicitud`): Tesorería solo ve
 * `supervisor_approved` / `cfo_approved` / `deferred`, y el Admin de Campo solo las que
 * capturó. El frontend no filtra por rol: pide y muestra lo que le devuelven.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, uploadAttachment } from "@/shared/lib/api";
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

/** Refresca SOLO el detalle de esa solicitud.
 *
 * Adjuntos y comentarios no se muestran en la lista, así que no hace falta reconsultarla. Y
 * no se invalida `[SOLICITUDES_KEY]` además del detalle: como es su PREFIJO, invalidar los dos
 * provocaría dos GET idénticos del detalle.
 */
function useInvalidarDetalle(id: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [SOLICITUDES_KEY, "detalle", id] });
}

export function useUploadAttachment(solicitudId: string) {
  const invalidar = useInvalidarDetalle(solicitudId);
  return useMutation({
    mutationFn: (file: File) => uploadAttachment(solicitudId, file),
    onSuccess: invalidar,
  });
}

export function useAddComment(solicitudId: string) {
  const invalidar = useInvalidarDetalle(solicitudId);
  return useMutation({
    mutationFn: (body: string) => api.addComment(solicitudId, body),
    onSuccess: invalidar,
  });
}

export function useUpdateSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SolicitudCreatePayload> }) =>
      api.updateSolicitud(id, data),
    // Editar cambia datos visibles en la lista (monto, proveedor, fecha), así que se invalida
    // la raíz `[SOLICITUDES_KEY]`, que por ser prefijo alcanza también al detalle.
    onSuccess: () => qc.invalidateQueries({ queryKey: [SOLICITUDES_KEY] }),
  });
}
