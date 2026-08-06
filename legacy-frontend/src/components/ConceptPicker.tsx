"use client";

import type { Concept } from "@/lib/types";

const SECTION_LABELS: Record<string, string> = {
  ING: "INGRESOS",
  EGR: "EGRESOS — COSTOS",
  GAS: "GASTOS",
  ACT: "ACTIVOS",
};

interface Props {
  concepts: Concept[]; // should be leaves only
  value: string;
  onChange: (id: string) => void;
  id?: string;
  placeholder?: string;
}

/**
 * Concept selector. Only leaf concepts are selectable; each option shows the
 * full hierarchical path (Group › Subgroup › Concept) so visually identical
 * leaf names in different groups stay distinguishable. Options are grouped by
 * top-level section.
 */
export function ConceptPicker({
  concepts,
  value,
  onChange,
  id,
  placeholder = "— Seleccionar concepto —",
}: Props) {
  const leaves = concepts.filter((c) => !c.is_header);
  const sections = Array.from(new Set(leaves.map((c) => c.section)));

  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {sections.map((section) => (
        <optgroup key={section} label={SECTION_LABELS[section] || section}>
          {leaves
            .filter((c) => c.section === section)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {pathLabel(c)}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

function pathLabel(c: Concept): string {
  // Drop the leading section name so the option reads as the group path.
  if (c.path) {
    const parts = c.path.split(" › ");
    return parts.slice(1).join(" › ") || c.name;
  }
  return c.parent_name ? `${c.name} (${c.parent_name})` : c.name;
}
