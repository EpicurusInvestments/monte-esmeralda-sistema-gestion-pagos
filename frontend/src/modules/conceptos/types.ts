/** Tipos del módulo Conceptos, alineados a `schemas/concept.py` del backend.
 *
 * El catálogo es un árbol auto-referenciado (`parent_id`); solo las HOJAS
 * (`is_header = false`) son asignables a una Solicitud. Esa regla la valida el backend
 * (`concept_service.validate_leaf`); aquí solo se refleja en la UI.
 */

import { z } from "zod";

export type { Concept, ConceptCreatePayload, ConceptUpdatePayload } from "@/shared/lib/types";

/** Secciones del catálogo (código → etiqueta). */
export const SECTIONS = [
  { code: "ING", label: "INGRESOS" },
  { code: "EGR", label: "EGRESOS — COSTOS" },
  { code: "GAS", label: "GASTOS" },
  { code: "ACT", label: "ACTIVOS" },
] as const;

export const SECTION_CODES = SECTIONS.map((s) => s.code);

export function sectionLabel(code: string): string {
  return SECTIONS.find((s) => s.code === code)?.label ?? code;
}

export const conceptoSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "El código es obligatorio.")
    .max(40, "Máximo 40 caracteres."),
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(255, "Máximo 255 caracteres."),
  section: z
    .string()
    .min(1, "Selecciona una sección.")
    .refine((v) => SECTION_CODES.includes(v as (typeof SECTION_CODES)[number]), "Sección no válida."),
  parent_id: z.string().nullable(),
  is_header: z.boolean(),
  active: z.boolean(),
  sort_order: z.number().int("Debe ser un número entero.").min(0, "No puede ser negativo."),
});

export type ConceptoFormValues = z.infer<typeof conceptoSchema>;

export const CONCEPTO_FORM_DEFAULTS: ConceptoFormValues = {
  code: "",
  name: "",
  section: "",
  parent_id: null,
  is_header: false,
  active: true,
  sort_order: 0,
};
