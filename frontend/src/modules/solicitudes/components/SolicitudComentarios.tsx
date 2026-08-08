/** Comentarios de una Solicitud: lista y alta.
 *
 * Comentar no requiere permiso especial: cualquiera que pueda VER la solicitud puede
 * comentarla (`comments.create_comment` solo valida `can_view_solicitud`). Los comentarios no
 * se editan ni se borran.
 */

import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { useState } from "react";

import { ApiError } from "@/shared/lib/api";
import { formatDateTime } from "@/shared/lib/labels";
import type { Comment } from "@/shared/lib/types";

import { useAddComment } from "../hooks";

interface SolicitudComentariosProps {
  solicitudId: string;
  comments: Comment[];
}

export function SolicitudComentarios({ solicitudId, comments }: SolicitudComentariosProps) {
  const comentar = useAddComment(solicitudId);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onComentar = async () => {
    const body = texto.trim();
    if (!body) return;
    setError(null);
    try {
      await comentar.mutateAsync(body);
      setTexto("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo guardar el comentario.",
      );
    }
  };

  return (
    <>
      {error && (
        <div style={{ marginBottom: 10 }}>
          <Message severity="error" text={error} />
        </div>
      )}

      {comments.length === 0 ? (
        <div className="fv muted">Sin comentarios.</div>
      ) : (
        comments.map((c) => (
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

      <div className="inline-form" style={{ marginTop: 10 }}>
        <label className="fl" htmlFor="comentario-nuevo">
          Nuevo comentario
        </label>
        <InputTextarea
          id="comentario-nuevo"
          rows={2}
          autoResize
          maxLength={1000}
          placeholder="Escribe una nota para el equipo…"
          style={{ width: "100%" }}
          value={texto}
          disabled={comentar.isPending}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <Button
            type="button"
            size="small"
            label={comentar.isPending ? "Guardando…" : "Comentar"}
            disabled={texto.trim() === "" || comentar.isPending}
            loading={comentar.isPending}
            onClick={onComentar}
          />
        </div>
      </div>
    </>
  );
}
