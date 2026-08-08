/** Solicitudes de Pago — pantalla general: todos los estados, filtros completos y captura.
 *
 * El patrón lista + detalle vive en `SolicitudesWorkspace`, compartido con las bandejas de
 * Supervisor y CFO.
 */

import { SolicitudesWorkspace } from "../components/SolicitudesWorkspace";

export function SolicitudesPage() {
  return (
    <SolicitudesWorkspace
      titulo="Solicitudes"
      subtitulo={
        <>
          Solicitudes de Pago visibles para tu rol. Desde el detalle se capturan, editan y se
          ejecutan las acciones de flujo que correspondan.
        </>
      }
      mostrarNueva
      filtrosCompletos
      ariaTabla="Solicitudes"
      textoSinSeleccion="Selecciona una solicitud para ver su detalle y su historial."
    />
  );
}
