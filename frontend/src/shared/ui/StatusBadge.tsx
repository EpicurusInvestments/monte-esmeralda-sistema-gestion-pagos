/** Badge del estado de una Solicitud de Pago.
 *
 * Etiqueta y tono salen de `labels.ts` (`STATUS_LABELS` / `STATUS_TONE`), que espeja los 8
 * valores de `SolicitudStatus` del backend. El front NUNCA inventa estados: si el backend
 * agrega uno, se agrega ahí y este componente lo toma solo.
 */

import { STATUS_LABELS, STATUS_TONE } from "@/shared/lib/labels";
import type { SolicitudStatus } from "@/shared/lib/types";
import { Badge } from "@/shared/ui/Badge";
import type { BadgeTone } from "@/shared/ui/Badge";

export function StatusBadge({ status }: { status: SolicitudStatus }) {
  return (
    <Badge tone={(STATUS_TONE[status] as BadgeTone) ?? "gray"} label={STATUS_LABELS[status]} />
  );
}
