/** Presentación del cumplimiento: `effective_status` → etiqueta y tono de badge.
 *
 * Vive fuera de los componentes para no romper Fast Refresh (un archivo de componentes solo
 * debe exportar componentes) y para que la lista y el detalle usen exactamente el mismo
 * criterio.
 *
 * `effective_status` lo deriva el backend (`supplier_service.clearance_summary`): un
 * cumplimiento `cleared` pero con `valid_until` pasada se reporta como `expired`.
 */

import { CLEARANCE_LABELS, CLEARANCE_TONE } from "@/shared/lib/labels";
import type { BadgeTone } from "@/shared/ui/Badge";

export function toneCumplimiento(effectiveStatus: string): BadgeTone {
  return (CLEARANCE_TONE[effectiveStatus] as BadgeTone) ?? "gray";
}

export function labelCumplimiento(effectiveStatus: string): string {
  return CLEARANCE_LABELS[effectiveStatus] ?? "Sin registro de cumplimiento";
}
