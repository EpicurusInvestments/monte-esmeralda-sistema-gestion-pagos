/** Línea de tiempo de la Solicitud: los `audit_events` en orden CRONOLÓGICO.
 *
 * `audit_events` es la bitácora append-only del backend (`services/audit.py`): la fuente de
 * verdad de quién hizo qué y cuándo. Es solo lectura por diseño — nunca se edita ni se borra.
 */

import { AUDIT_ACTION_LABELS, formatDateTime } from "@/shared/lib/labels";
import type { AuditEvent } from "@/shared/lib/types";

/** Orden cronológico (más antiguo primero) sin mutar el arreglo original. */
function enOrden(events: AuditEvent[]): AuditEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export function SolicitudTimeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return <div className="fv muted">Sin eventos registrados.</div>;
  }

  return (
    <ol className="timeline">
      {enOrden(events).map((e) => (
        <li className="timeline-item" key={e.id}>
          <div className="timeline-action">
            {AUDIT_ACTION_LABELS[e.action] ?? e.action}
          </div>
          <div className="timeline-meta">
            {e.performed_by_name ?? "Sistema"} · {formatDateTime(e.created_at)}
          </div>
          {e.reason && <div className="timeline-reason">{e.reason}</div>}
        </li>
      ))}
    </ol>
  );
}
