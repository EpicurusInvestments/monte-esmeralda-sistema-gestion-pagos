/** Selector de concepto: solo HOJAS activas, agrupadas por sección y con su `path`.
 *
 * Solo las hojas (`is_header = false`) son asignables a una Solicitud
 * (`concept_service.validate_leaf`); los encabezados agrupan. El `path` distingue hojas con
 * el mismo nombre en grupos distintos.
 *
 * Lo usan el formulario de captura/edición (concepto **propuesto**) y las acciones de flujo
 * del Supervisor (concepto **final**).
 */

import { Dropdown } from "primereact/dropdown";
import { useMemo } from "react";

import { useConceptos } from "@/modules/conceptos/hooks";
import type { Concept } from "@/shared/lib/types";

const SECTION_LABELS: Record<string, string> = {
  ING: "INGRESOS",
  EGR: "EGRESOS — COSTOS",
  GAS: "GASTOS",
  ACT: "ACTIVOS",
};

/** Etiqueta de la hoja sin repetir el nombre de la sección (ya es el grupo). */
function etiquetaConcepto(c: Concept): string {
  if (c.path) {
    const partes = c.path.split(" › ");
    const resto = partes.slice(1).join(" › ");
    return `${c.code} — ${resto || c.name}`;
  }
  return c.parent_name ? `${c.code} — ${c.name} (${c.parent_name})` : `${c.code} — ${c.name}`;
}

interface ConceptoSelectProps {
  inputId: string;
  value: string | null;
  onChange: (id: string | null) => void;
  invalid?: boolean;
  placeholder?: string;
  /** Permite limpiar la selección (no aplica cuando el concepto es obligatorio). */
  showClear?: boolean;
}

export function ConceptoSelect({
  inputId,
  value,
  onChange,
  invalid,
  placeholder,
  showClear = true,
}: ConceptoSelectProps) {
  const conceptos = useConceptos({ activeOnly: true });

  const grupos = useMemo(() => {
    const hojas = (conceptos.data ?? []).filter((c) => !c.is_header);
    const secciones = Array.from(new Set(hojas.map((c) => c.section)));
    return secciones.map((s) => ({
      label: SECTION_LABELS[s] ?? s,
      items: hojas
        .filter((c) => c.section === s)
        .map((c) => ({ value: c.id, label: etiquetaConcepto(c) })),
    }));
  }, [conceptos.data]);

  return (
    <Dropdown
      inputId={inputId}
      options={grupos}
      optionLabel="label"
      optionValue="value"
      optionGroupLabel="label"
      optionGroupChildren="items"
      placeholder={
        conceptos.isLoading ? "Cargando conceptos…" : (placeholder ?? "Selecciona un concepto")
      }
      filter
      showClear={showClear}
      invalid={invalid}
      style={{ width: "100%" }}
      value={value}
      onChange={(e) => onChange((e.value as string | null) ?? null)}
    />
  );
}
