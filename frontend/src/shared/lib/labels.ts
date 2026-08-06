// Spanish labels for enums and helpers for formatting.
import type { RequestType, Role, SolicitudStatus } from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  engineer: "Ingeniería",
  accountant: "Contabilidad",
  field_admin: "Administrador de Campo",
  supervisor: "Supervisor",
  cfo: "Director de Finanzas (CFO)",
  treasurer: "Tesorería",
  ceo: "Director General (CEO)",
};

export const STATUS_LABELS: Record<SolicitudStatus, string> = {
  draft: "Borrador",
  submitted: "Enviada",
  correction_requested: "Corrección solicitada",
  supervisor_approved: "Aprobada por Supervisor",
  cfo_approved: "Aprobada por CFO",
  deferred: "Diferida",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

export const STATUS_TONE: Record<SolicitudStatus, string> = {
  draft: "gray",
  submitted: "blue",
  correction_requested: "amber",
  supervisor_approved: "indigo",
  cfo_approved: "green",
  deferred: "amber",
  rejected: "red",
  cancelled: "gray",
};

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  contractor_estimate: "Estimación de contratista",
  supplier_invoice: "Factura de proveedor",
  reimbursement: "Reembolso",
  government_fee: "Derecho/trámite gubernamental",
  utility: "Servicio público",
  service: "Servicio",
  tax: "Impuesto",
  other: "Otro",
};

export const CLEARANCE_LABELS: Record<string, string> = {
  cleared: "Cumplimiento vigente",
  pending: "Cumplimiento pendiente",
  blocked: "Bloqueado",
  expired: "Cumplimiento vencido",
  none: "Sin registro de cumplimiento",
};

export const CLEARANCE_TONE: Record<string, string> = {
  cleared: "green",
  pending: "amber",
  blocked: "red",
  expired: "red",
  none: "gray",
};

export function formatCurrency(amount: string | number): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(isNaN(n) ? 0 : n);
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  created: "Creación",
  submitted: "Envío a revisión",
  resubmitted: "Reenvío tras corrección",
  supervisor_approved: "Aprobación del Supervisor",
  cfo_approved: "Aprobación del CFO",
  rejected: "Rechazo",
  correction_requested: "Solicitud de corrección",
  deferred: "Diferimiento",
  cancelled: "Cancelación",
  financial_edited: "Edición de información financiera",
  concept_changed: "Cambio de concepto",
};
