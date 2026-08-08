/** Adjuntos de una Solicitud: lista con descarga y, si procede, carga de documentos.
 *
 * Descargar lo puede cualquiera que vea la solicitud. Subir exige `solicitud:upload`, ser el
 * dueño (o Admin) y que el estado sea `draft` o `correction_requested` — las mismas tres
 * condiciones del backend, que responde 409 si el estado ya no lo permite.
 */

import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { useRef, useState } from "react";

import { ApiError, downloadAttachment } from "@/shared/lib/api";
import { formatDateTime } from "@/shared/lib/labels";
import type { Attachment } from "@/shared/lib/types";

import { useUploadAttachment } from "../hooks";

/** Guarda de cortesía en el cliente para dar un mensaje claro antes de gastar la subida.
 *
 * NO es la validación definitiva: el backend todavía no valida tamaño ni tipo (está en
 * `docs/BACKLOG.md`). Cuando lo haga, su respuesta manda y esto solo evita el viaje.
 */
const MAX_BYTES = 15 * 1024 * 1024;
const EXTENSIONES_OK = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
];

function motivoRechazo(file: File): string | null {
  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `El archivo pesa ${mb} MB y el máximo son 15 MB.`;
  }
  const nombre = file.name.toLowerCase();
  if (!EXTENSIONES_OK.some((ext) => nombre.endsWith(ext))) {
    return "Formato no permitido. Se aceptan PDF, imágenes y documentos de Office.";
  }
  return null;
}

interface SolicitudAdjuntosProps {
  solicitudId: string;
  attachments: Attachment[];
  canUpload: boolean;
}

export function SolicitudAdjuntos({
  solicitudId,
  attachments,
  canUpload,
}: SolicitudAdjuntosProps) {
  const subir = useUploadAttachment(solicitudId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [seleccionado, setSeleccionado] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState<string | null>(null);

  const onElegir = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setSeleccionado(null);
      return;
    }
    const motivo = motivoRechazo(file);
    if (motivo) {
      setError(motivo);
      setSeleccionado(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setSeleccionado(file);
  };

  const onSubir = async () => {
    if (!seleccionado) return;
    setError(null);
    try {
      await subir.mutateAsync(seleccionado);
      setSeleccionado(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo subir el documento.",
      );
    }
  };

  const onDescargar = async (a: Attachment) => {
    setError(null);
    setDescargando(a.id);
    try {
      await downloadAttachment(solicitudId, a.id, a.file_name);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo descargar el documento.",
      );
    } finally {
      setDescargando(null);
    }
  };

  return (
    <>
      {error && (
        <div style={{ marginBottom: 10 }}>
          <Message severity="error" text={error} />
        </div>
      )}

      {attachments.length === 0 ? (
        <div className="fv muted">Sin adjuntos.</div>
      ) : (
        attachments.map((a) => (
          <div className="rel-item" key={a.id}>
            <div>
              <div className="rel-name">{a.file_name}</div>
              <div className="rel-sub">
                {a.content_type ?? "tipo desconocido"} · {formatDateTime(a.uploaded_at)}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-xs"
              disabled={descargando === a.id}
              onClick={() => onDescargar(a)}
            >
              {descargando === a.id ? "Descargando…" : "Descargar"}
            </button>
          </div>
        ))
      )}

      {canUpload && (
        <div className="inline-form" style={{ marginTop: 10 }}>
          <div className="if-title">Adjuntar documento</div>
          <label className="fl" htmlFor="adjunto-archivo">
            Archivo (PDF, imagen u Office; máx. 15 MB)
          </label>
          <input
            id="adjunto-archivo"
            ref={inputRef}
            type="file"
            className="fi"
            style={{ paddingTop: 6 }}
            accept={EXTENSIONES_OK.join(",")}
            disabled={subir.isPending}
            onChange={onElegir}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <Button
              type="button"
              size="small"
              label={subir.isPending ? "Subiendo…" : "Subir"}
              disabled={!seleccionado || subir.isPending}
              loading={subir.isPending}
              onClick={onSubir}
            />
          </div>
        </div>
      )}
    </>
  );
}
