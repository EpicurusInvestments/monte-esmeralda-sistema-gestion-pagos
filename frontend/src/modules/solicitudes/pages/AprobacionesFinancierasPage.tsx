/** Aprobaciones Financieras (CFO) — solicitudes en estado `supervisor_approved`.
 *
 * Es la pantalla de inicio del CFO (`ROLE_HOME`). Desde el detalle aprueba, difiere, rechaza o
 * solicita corrección; al actuar, la solicitud cambia de estado y sale de la bandeja.
 *
 * El backend ya restringe las acciones a `solicitud:cfo_review` y al estado; esta pantalla
 * solo fija el filtro.
 */

import { SolicitudesWorkspace } from "../components/SolicitudesWorkspace";

export function AprobacionesFinancierasPage() {
  return (
    <SolicitudesWorkspace
      estadoFijo="supervisor_approved"
      titulo="Aprobaciones Financieras"
      subtitulo={
        <>
          Solicitudes <strong>aprobadas por el Supervisor</strong> que esperan aprobación
          financiera. Aprueba, difiere, rechaza o pide corrección.
        </>
      }
      etiquetaContador="pendientes"
      ariaTabla="Aprobaciones financieras"
      textoSinSeleccion="Selecciona una solicitud para autorizarla."
    />
  );
}
