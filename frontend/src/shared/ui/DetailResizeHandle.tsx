/** Agarre para ajustar el ancho del panel de detalle.
 *
 * Va entre `.list-pane` y `.detail-pane` dentro de `.split`. Toda la lógica (rango,
 * arrastre, persistencia) vive en `useResizableDetail`; aquí solo está el elemento.
 *
 * Es un `separator` enfocable: además del arrastre acepta ←/→ (±16px) y Inicio/Fin, para
 * que no sea una función exclusiva del ratón.
 */

import type { DetailHandleProps } from "@/shared/lib/useResizableDetail";

export function DetailResizeHandle({ dragging, ...props }: DetailHandleProps) {
  return (
    <div
      {...props}
      className={`detail-resizer${dragging ? " dragging" : ""}`}
      role="separator"
      aria-orientation="vertical"
      aria-label="Ajustar ancho del panel de detalle"
      tabIndex={0}
    />
  );
}
