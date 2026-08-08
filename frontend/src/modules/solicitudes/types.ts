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

import { z } from "zod";

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

/** Estados en los que el backend permite editar (`workflow._EDITABLE_STATUSES`). */
export const EDITABLE_STATUSES: SolicitudStatus[] = ["draft", "correction_requested"];

/** Formulario de captura/edición. Espeja `SolicitudCreate` del backend.
 *
 * `net_amount` se captura como número (InputNumber) y se envía como STRING, porque el
 * backend lo tipa como `Decimal` y así no se pierde precisión en el JSON.
 */
export const solicitudSchema = z.object({
  request_type: z.enum(
    Object.keys(REQUEST_TYPE_LABELS) as [RequestType, ...RequestType[]],
    { errorMap: () => ({ message: "Selecciona el tipo de solicitud." }) },
  ),
  supplier_id: z.string().min(1, "Selecciona un proveedor."),
  description: z
    .string()
    .trim()
    .min(1, "La descripción es obligatoria.")
    .max(2000, "Máximo 2000 caracteres."),
  net_amount: z
    .number({ invalid_type_error: "Captura el monto." })
    .positive("El monto debe ser mayor que cero."),
  proposed_concept_id: z.string().nullable(),
  proposed_payment_week: z.string().trim().max(10, "Máximo 10 caracteres.").optional(),
  document_date: z.date().nullable(),
  due_date: z.date().nullable(),
});

export type SolicitudFormValues = z.infer<typeof solicitudSchema>;

export const SOLICITUD_FORM_DEFAULTS: SolicitudFormValues = {
  request_type: "supplier_invoice",
  supplier_id: "",
  description: "",
  net_amount: 0,
  proposed_concept_id: null,
  proposed_payment_week: "",
  document_date: null,
  due_date: null,
};
