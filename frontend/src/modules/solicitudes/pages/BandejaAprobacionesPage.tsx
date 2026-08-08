/** Bandeja de Aprobaciones (Supervisor) — solicitudes en estado `submitted`.
 *
 * Es la pantalla de inicio del Supervisor (`ROLE_HOME`). Desde el detalle asigna el concepto
 * final, aprueba, rechaza o solicita corrección; al actuar, la solicitud cambia de estado y
 * sale de la bandeja.
 *
 * El backend ya restringe las acciones a `solicitud:supervisor_review` y al estado; esta
 * pantalla solo fija el filtro.
 */

import { SolicitudesWorkspace } from "../components/SolicitudesWorkspace";

export function BandejaAprobacionesPage() {
  return (
    <SolicitudesWorkspace
      estadoFijo="submitted"
      titulo="Bandeja de Aprobaciones"
      subtitulo={
        <>
          Solicitudes <strong>enviadas</strong> que esperan revisión operativa. Confirma el
          concepto final y aprueba, rechaza o pide corrección.
        </>
      }
      etiquetaContador="pendientes"
      ariaTabla="Bandeja de aprobaciones"
      textoSinSeleccion="Selecciona una solicitud para revisarla."
    />
  );
}
