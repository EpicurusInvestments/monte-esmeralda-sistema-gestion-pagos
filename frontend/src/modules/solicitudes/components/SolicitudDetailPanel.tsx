/** Panel de detalle de una Solicitud de Pago — SOLO LECTURA.
 *
 * En este incremento no hay acciones de flujo, ni comentar, ni cargar/descargar adjuntos:
 * adjuntos y comentarios se listan, nada más. El "quién" de cada etapa no se repite aquí
 * (no se muestran los UUID de `*_reviewed_by`): eso lo cuenta la línea de tiempo.
 */

import {
  REQUEST_TYPE_LABELS,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/shared/lib/labels";
import type { SolicitudDetail } from "@/shared/lib/types";
import { StatusBadge } from "@/shared/ui/StatusBadge";

import { SolicitudTimeline } from "./SolicitudTimeline";

/** Etapa del flujo: se muestra la marca de tiempo o "—" si aún no ocurrió. */
function Etapa({ label, at }: { label: string; at: string | null }) {
  return (
    <>
      <div className="fl">{label}</div>
      <div className={at ? "fv" : "fv muted"}>{at ? formatDateTime(at) : "—"}</div>
    </>
  );
}

export function SolicitudDetailPanel({ solicitud }: { solicitud: SolicitudDetail }) {
  const s = solicitud;

  return (
    <>
      <div className="dh">
        <div className="dh-row">
          <div>
            <div className="dh-name td-mono">{s.folio}</div>
            <div className="dh-sub">
              <StatusBadge status={s.status} />
              <span>{REQUEST_TYPE_LABELS[s.request_type]}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="db">
        <div className="sec">Datos de la solicitud</div>
        <div className="fl">Proveedor</div>
        <div className="fv">{s.supplier?.legal_name ?? "—"}</div>
        <div className="fl">RFC</div>
        <div className="fv mono">{s.supplier?.rfc ?? "—"}</div>
        <div className="fl">Tipo</div>
        <div className="fv">{REQUEST_TYPE_LABELS[s.request_type]}</div>
        <div className="fl">Descripción</div>
        <div className="fv">{s.description}</div>
        <div className="fl">Monto neto</div>
        <div className="fv mono">{formatCurrency(s.net_amount)}</div>

        <div className="r2">
          <div>
            <div className="fl">Semana de pago propuesta</div>
            <div className="fv">{s.proposed_payment_week ?? "—"}</div>
          </div>
          <div>
            <div className="fl">Fecha del documento</div>
            <div className="fv">{formatDate(s.document_date)}</div>
          </div>
        </div>
        <div className="fl">Vencimiento</div>
        <div className="fv">{formatDate(s.due_date)}</div>

        <div className="sec">Concepto</div>
        <div className="fl">Propuesto</div>
        <div className="fv muted">{s.proposed_concept?.path ?? "—"}</div>
        <div className="fl">Final (asignado por el Supervisor)</div>
        <div className="fv">{s.final_concept?.path ?? "— (sin asignar)"}</div>

        <div className="sec">Flujo</div>
        <Etapa label="Creada" at={s.created_at} />
        <Etapa label="Enviada a revisión" at={s.submitted_at} />
        <Etapa label="Revisión del Supervisor" at={s.supervisor_reviewed_at} />
        <Etapa label="Revisión del CFO" at={s.cfo_reviewed_at} />

        <div className="sec">Adjuntos ({s.attachments.length})</div>
        <div className="fv muted" style={{ fontSize: 11 }}>
          Descarga y carga de adjuntos: en un próximo incremento.
        </div>
        {s.attachments.length === 0 ? (
          <div className="fv muted">Sin adjuntos.</div>
        ) : (
          s.attachments.map((a) => (
            <div className="rel-item" key={a.id}>
              <div>
                <div className="rel-name">{a.file_name}</div>
                <div className="rel-sub">
                  {a.content_type ?? "tipo desconocido"} · {formatDateTime(a.uploaded_at)}
                </div>
              </div>
            </div>
          ))
        )}

        <div className="sec">Comentarios ({s.comments.length})</div>
        {s.comments.length === 0 ? (
          <div className="fv muted">Sin comentarios.</div>
        ) : (
          s.comments.map((c) => (
            <div className="rel-item" key={c.id}>
              <div>
                <div className="rel-name">{c.author_name ?? "—"}</div>
                <div className="rel-sub">{formatDateTime(c.created_at)}</div>
                <div className="fv" style={{ marginTop: 4, marginBottom: 0 }}>
                  {c.body}
                </div>
              </div>
            </div>
          ))
        )}

        <div className="sec">Línea de tiempo</div>
        <SolicitudTimeline events={s.audit_events} />
      </div>
    </>
  );
}
