"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  ApiError,
  attachmentDownloadUrl,
  getToken,
  uploadAttachment,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { availableActions } from "@/lib/nav";
import {
  AUDIT_ACTION_LABELS,
  CLEARANCE_LABELS,
  CLEARANCE_TONE,
  REQUEST_TYPE_LABELS,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/labels";
import { ConceptPicker } from "@/components/ConceptPicker";
import { Badge, ErrorBox, InfoRow, Spinner, StatusBadge } from "@/components/ui";
import type { Concept, SolicitudDetail } from "@/lib/types";

export default function SolicitudDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<SolicitudDetail | null>(null);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [reason, setReason] = useState("");
  const [finalConcept, setFinalConcept] = useState("");
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await api.getSolicitud(id);
      setData(d);
      setFinalConcept(d.final_concept_id || d.proposed_concept_id || "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api.listConcepts({ leavesOnly: true }).then(setConcepts).catch(() => undefined);
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <ErrorBox message={error || "No encontrada."} />;

  const isOwner = !!user && data.captured_by === user.id;
  const actions = user
    ? availableActions(user.role, data.status, isOwner)
    : {
        canEdit: false,
        canSubmit: false,
        canUpload: false,
        supervisorActions: false,
        cfoActions: false,
      };

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al ejecutar la acción.");
    } finally {
      setBusy(false);
    }
  }

  async function onUpload() {
    if (files.length === 0) return;
    await run(async () => {
      for (const f of files) await uploadAttachment(id, f);
      setFiles([]);
    });
  }

  async function onAddComment() {
    if (!comment.trim()) return;
    await run(async () => {
      await api.addComment(id, comment.trim());
      setComment("");
    });
  }

  const clearance = data.supplier?.clearance;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>
            {data.folio} <StatusBadge status={data.status} />
          </h1>
          <p className="subtitle">
            {REQUEST_TYPE_LABELS[data.request_type]} · Capturada el{" "}
            {formatDateTime(data.created_at)}
          </p>
        </div>
        <button className="btn-secondary" onClick={() => router.push("/solicitudes")}>
          ← Volver
        </button>
      </div>

      <ErrorBox message={error} />

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18 }}>
        <div>
          {/* Financial info */}
          <div className="panel">
            <h3>Información financiera</h3>
            <InfoRow k="Monto neto" v={<strong>{formatCurrency(data.net_amount)}</strong>} />
            <InfoRow k="Descripción" v={data.description} />
            <InfoRow k="Semana de pago propuesta" v={data.proposed_payment_week || "—"} />
            <InfoRow k="Fecha de documento" v={formatDate(data.document_date)} />
            <InfoRow k="Fecha de vencimiento" v={formatDate(data.due_date)} />
          </div>

          {/* Concept assignment */}
          <div className="panel">
            <h3>Asignación de concepto</h3>
            <InfoRow
              k="Concepto propuesto"
              v={
                data.proposed_concept
                  ? `${data.proposed_concept.code} — ${data.proposed_concept.path}`
                  : "—"
              }
            />
            <InfoRow
              k="Concepto final"
              v={
                data.final_concept ? (
                  `${data.final_concept.code} — ${data.final_concept.path}`
                ) : (
                  <span className="muted">Sin asignar</span>
                )
              }
            />
            {actions.supervisorActions && (
              <div style={{ marginTop: 12 }}>
                <label>Asignar / confirmar concepto final (solo conceptos hoja)</label>
                <ConceptPicker
                  concepts={concepts}
                  value={finalConcept}
                  onChange={setFinalConcept}
                />
                <div className="btn-row" style={{ marginTop: 8 }}>
                  <button
                    className="btn-secondary"
                    disabled={busy || !finalConcept}
                    onClick={() =>
                      run(() => api.assignConcept(id, finalConcept))
                    }
                  >
                    Guardar concepto
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="panel">
            <h3>Documentos adjuntos</h3>
            {data.attachments.length === 0 ? (
              <p className="muted">Sin documentos.</p>
            ) : (
              <table>
                <tbody>
                  {data.attachments.map((a) => (
                    <tr key={a.id}>
                      <td>{a.file_name}</td>
                      <td className="muted">{formatDateTime(a.uploaded_at)}</td>
                      <td>
                        <DownloadLink
                          href={attachmentDownloadUrl(id, a.id)}
                          fileName={a.file_name}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {actions.canUpload && (
              <div style={{ marginTop: 12 }}>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
                <div className="btn-row" style={{ marginTop: 8 }}>
                  <button
                    className="btn-secondary"
                    disabled={busy || files.length === 0}
                    onClick={onUpload}
                  >
                    Subir documento(s)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="panel">
            <h3>Comentarios</h3>
            {data.comments.length === 0 ? (
              <p className="muted">Sin comentarios.</p>
            ) : (
              data.comments.map((c) => (
                <div className="comment" key={c.id}>
                  <div className="meta">
                    {c.author_name || "Usuario"} · {formatDateTime(c.created_at)}
                  </div>
                  <div>{c.body}</div>
                </div>
              ))
            )}
            <div style={{ marginTop: 12 }}>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Añadir un comentario…"
              />
              <div className="btn-row" style={{ marginTop: 8 }}>
                <button className="btn-secondary" disabled={busy} onClick={onAddComment}>
                  Comentar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          {/* Supplier */}
          <div className="panel">
            <h3>Proveedor</h3>
            {data.supplier ? (
              <>
                <InfoRow k="Razón social" v={data.supplier.legal_name} />
                <InfoRow k="RFC" v={data.supplier.rfc || "—"} />
                <InfoRow k="Contacto" v={data.supplier.contact_name || "—"} />
                <InfoRow k="CLABE" v={data.supplier.clabe || "—"} />
                {clearance && (
                  <div style={{ marginTop: 8 }}>
                    <Badge tone={CLEARANCE_TONE[clearance.effective_status] || "gray"}>
                      {CLEARANCE_LABELS[clearance.effective_status] ||
                        clearance.effective_status}
                    </Badge>
                    {clearance.valid_until && (
                      <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                        Vigencia: {formatDate(clearance.valid_until)}
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="muted">—</p>
            )}
          </div>

          {/* Workflow actions */}
          <div className="panel">
            <h3>Acciones</h3>

            {actions.canSubmit && (
              <button
                className="btn-success"
                disabled={busy}
                style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}
                onClick={() => run(() => api.submit(id))}
              >
                Enviar a revisión del Supervisor
              </button>
            )}

            {(actions.supervisorActions || actions.cfoActions) && (
              <div className="field">
                <label>Motivo / nota (para rechazo, corrección o diferimiento)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Motivo…"
                />
              </div>
            )}

            {actions.supervisorActions && (
              <div className="btn-row">
                <button
                  className="btn-success"
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      api.supervisorApprove(id, finalConcept || undefined, reason || undefined)
                    )
                  }
                >
                  Aprobar (operativo)
                </button>
                <button
                  className="btn-warn"
                  disabled={busy}
                  onClick={() => run(() => api.requestCorrection(id, reason || undefined))}
                >
                  Solicitar corrección
                </button>
                <button
                  className="btn-danger"
                  disabled={busy}
                  onClick={() => run(() => api.reject(id, reason || undefined))}
                >
                  Rechazar
                </button>
              </div>
            )}

            {actions.cfoActions && (
              <div className="btn-row">
                <button
                  className="btn-success"
                  disabled={busy}
                  onClick={() => run(() => api.cfoApprove(id, reason || undefined))}
                >
                  Aprobar financieramente
                </button>
                <button
                  className="btn-warn"
                  disabled={busy}
                  onClick={() => run(() => api.defer(id, reason || undefined))}
                >
                  Diferir
                </button>
                <button
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() => run(() => api.requestCorrection(id, reason || undefined))}
                >
                  Solicitar corrección
                </button>
                <button
                  className="btn-danger"
                  disabled={busy}
                  onClick={() => run(() => api.reject(id, reason || undefined))}
                >
                  Rechazar
                </button>
              </div>
            )}

            {actions.canEdit && (
              <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                Esta solicitud puede editarse.{" "}
                <a href={`/solicitudes/${id}/editar`}>Editar campos</a>
              </p>
            )}

            {!actions.canSubmit &&
              !actions.supervisorActions &&
              !actions.cfoActions && (
                <p className="muted">No hay acciones disponibles para su rol en este estado.</p>
              )}
          </div>

          {/* Audit timeline */}
          <div className="panel">
            <h3>Historial de auditoría</h3>
            {data.audit_events.length === 0 ? (
              <p className="muted">Sin eventos.</p>
            ) : (
              <ul className="timeline">
                {data.audit_events.map((e) => (
                  <li key={e.id}>
                    <div>
                      <strong>{AUDIT_ACTION_LABELS[e.action] || e.action}</strong>
                    </div>
                    <div className="when">
                      {formatDateTime(e.created_at)}
                      {e.performed_by_name ? ` · ${e.performed_by_name}` : ""}
                    </div>
                    {e.reason && <div style={{ fontSize: 12 }}>“{e.reason}”</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DownloadLink({ href, fileName }: { href: string; fileName: string }) {
  // Attachments require an Authorization header, so fetch as a blob.
  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    const token = getToken();
    const resp = await fetch(href, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) return;
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <a href={href} onClick={onClick}>
      Descargar
    </a>
  );
}
