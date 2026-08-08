/** Tipos del módulo Proveedores, alineados a `schemas/supplier.py`.
 *
 * El sistema NO evalúa proveedores: solo registra el resultado de un cumplimiento externo.
 * `clearance.effective_status` es derivado por el backend y colapsa un cumplimiento vigente
 * pero VENCIDO a "expired" (regla de negocio: vencido cuenta como no vigente).
 */

import { z } from "zod";

export type {
  Supplier,
  Clearance,
  ClearanceSummary,
  ClearanceStatus,
  SupplierStatus,
} from "@/shared/lib/types";

/** Estados del proveedor (código → etiqueta). */
export const SUPPLIER_STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
] as const;

/** Estados capturables de un cumplimiento (el backend solo acepta estos tres). */
export const CLEARANCE_STATUS_OPTIONS = [
  { value: "cleared", label: "Cumplimiento vigente" },
  { value: "pending", label: "Cumplimiento pendiente" },
  { value: "blocked", label: "Bloqueado" },
] as const;

/** Valores de `effective_status` para el filtro de la lista. */
export const EFFECTIVE_STATUS_FILTERS = [
  { value: "cleared", label: "Vigente" },
  { value: "pending", label: "Pendiente" },
  { value: "blocked", label: "Bloqueado" },
  { value: "expired", label: "Vencido" },
  { value: "none", label: "Sin registro" },
] as const;

const opcional = z.string().trim().max(255).optional();

export const proveedorSchema = z.object({
  legal_name: z
    .string()
    .trim()
    .min(1, "La razón social es obligatoria.")
    .max(255, "Máximo 255 caracteres."),
  rfc: z.string().trim().max(20, "Máximo 20 caracteres.").optional(),
  contact_name: opcional,
  // El backend valida `EmailStr`: si viene algo, debe ser un correo válido.
  email: z
    .string()
    .trim()
    .max(255)
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "Correo no válido.")
    .optional(),
  phone: z.string().trim().max(50, "Máximo 50 caracteres.").optional(),
  bank_name: opcional,
  bank_account: z.string().trim().max(50, "Máximo 50 caracteres.").optional(),
  clabe: z.string().trim().max(18, "La CLABE tiene 18 dígitos.").optional(),
  status: z.enum(["active", "inactive"]),
});

export type ProveedorFormValues = z.infer<typeof proveedorSchema>;

export const PROVEEDOR_FORM_DEFAULTS: ProveedorFormValues = {
  legal_name: "",
  rfc: "",
  contact_name: "",
  email: "",
  phone: "",
  bank_name: "",
  bank_account: "",
  clabe: "",
  status: "active",
};

export const cumplimientoSchema = z.object({
  status: z.enum(["cleared", "pending", "blocked"], {
    errorMap: () => ({ message: "Selecciona el resultado del cumplimiento." }),
  }),
  clearance_date: z.date().nullable(),
  valid_until: z.date().nullable(),
  compliance_reference: opcional,
  notes: z.string().trim().max(1000).optional(),
});

export type CumplimientoFormValues = z.infer<typeof cumplimientoSchema>;

export const CUMPLIMIENTO_FORM_DEFAULTS: CumplimientoFormValues = {
  status: "cleared",
  clearance_date: null,
  valid_until: null,
  compliance_reference: "",
  notes: "",
};

/** Fecha → "YYYY-MM-DD" en horario local. Vive en `shared/lib/dates` porque también lo
 *  usan los filtros de Solicitudes; se re-exporta para no cambiar los imports existentes. */
export { toISODate } from "@/shared/lib/dates";

/** Texto vacío → null (el backend distingue "" de ausente; `EmailStr` rechaza ""). */
export function vacioANull(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}
