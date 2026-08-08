/** Tipos del módulo Solicitudes (la entidad central del sistema).
 *
 * Este incremento es de SOLO LECTURA: lista, detalle y línea de tiempo. La captura, las
 * acciones de flujo (enviar/aprobar/rechazar/diferir/corregir), los comentarios y los
 * adjuntos llegan en incrementos posteriores.
 */

export type {
  SolicitudListItem,
  SolicitudDetail,
  SolicitudStatus,
  RequestType,
  AuditEvent,
  Comment,
  Attachment,
} from "@/shared/lib/types";

import { REQUEST_TYPE_LABELS, STATUS_LABELS } from "@/shared/lib/labels";
import type { RequestType, SolicitudStatus } from "@/shared/lib/types";

/** Filtros que resuelve el BACKEND (van como query params a `GET /solicitudes`). */
export interface SolicitudFiltros {
  status?: SolicitudStatus;
  supplier_id?: string;
  request_type?: RequestType;
  /** "YYYY-MM-DD" */
  date_from?: string;
  /** "YYYY-MM-DD" */
  date_to?: string;
}

/** Los 8 estados, para el filtro. El orden refleja el avance del flujo. */
export const STATUS_ORDER: SolicitudStatus[] = [
  "draft",
  "submitted",
  "correction_requested",
  "supervisor_approved",
  "cfo_approved",
  "deferred",
  "rejected",
  "cancelled",
];

export const STATUS_OPTIONS = STATUS_ORDER.map((s) => ({
  value: s,
  label: STATUS_LABELS[s],
}));

export const REQUEST_TYPE_OPTIONS = (
  Object.keys(REQUEST_TYPE_LABELS) as RequestType[]
).map((t) => ({ value: t, label: REQUEST_TYPE_LABELS[t] }));
