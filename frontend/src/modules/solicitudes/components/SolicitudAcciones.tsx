/** Acciones de flujo de una Solicitud, según ESTADO + CAPACIDAD + AUTORÍA.
 *
 * La máquina de estados vive en `services/workflow.py` y es la única puerta para cambiar el
 * estado; aquí solo se ofrecen las transiciones pertinentes. El backend revalida todo, así que
 * si algo se cuela responde 409 (`INVALID_WORKFLOW_TRANSITION`), 422
 * (`MISSING_REQUIRED_ATTACHMENT`, `CONCEPT_REQUIRED`, `CONCEPT_MUST_BE_LEAF`) o 403, y el
 * mensaje del backend se muestra tal cual.
 *
 * Quién puede qué se resuelve con `availableActions` de `nav.ts` (el helper ya alineado con
 * `permissions.py`), no con una regla nueva.
 */

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { useState } from "react";

import { ApiError } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import { availableActions } from "@/shared/lib/nav";
import { useToast } from "@/shared/ui/toast";
import type { SolicitudDetail } from "@/shared/lib/types";

import { EDITABLE_STATUSES } from "../types";
import {
  useAssignConcept,
  useCancel,
  useCfoApprove,
  useDefer,
  useReject,
  useRequestCorrection,
  useSubmit,
  useSupervisorApprove,
} from "../hooks";
import { ConceptoSelect } from "./ConceptoSelect";

type Clave =
  | "submit"
  | "cancel"
  | "assign"
  | "supervisorApprove"
  | "cfoApprove"
  | "defer"
  | "reject"
  | "requestCorrection";

interface Config {
  label: string;
  titulo: string;
  descripcion: string;
  confirmLabel: string;
  /** Motivo: no aplica, opcional u obligatorio (lo exige el negocio, no el backend). */
  motivo: "no" | "opcional" | "obligatorio";
  /** Concepto final: no aplica, siempre obligatorio, o solo si la solicitud aún no tiene. */
  concepto: "no" | "obligatorio" | "siFalta";
  danger?: boolean;
  exito: string;
}

const CONFIG: Record<Clave, Config> = {
  submit: {
    label: "Enviar a revisión",
    titulo: "Enviar a revisión",
    descripcion:
      "La solicitud pasará a revisión del Supervisor y dejará de ser editable. Requiere al menos un adjunto.",
    confirmLabel: "Enviar",
    motivo: "no",
    concepto: "no",
    exito: "Solicitud enviada a revisión.",
  },
  cancel: {
    label: "Cancelar solicitud",
    titulo: "Cancelar solicitud",
    descripcion: "La solicitud quedará cancelada. Es un estado final: no se puede reabrir.",
    confirmLabel: "Cancelar solicitud",
    motivo: "opcional",
    concepto: "no",
    danger: true,
    exito: "Solicitud cancelada.",
  },
  assign: {
    label: "Asignar concepto final",
    titulo: "Asignar concepto final",
    descripcion:
      "Solo las hojas del catálogo son asignables. El concepto final es el que queda para el flujo de efectivo.",
    confirmLabel: "Asignar",
    motivo: "no",
    concepto: "obligatorio",
    exito: "Concepto final asignado.",
  },
  supervisorApprove: {
    label: "Aprobar (Supervisor)",
    titulo: "Aprobación del Supervisor",
    descripcion: "La solicitud pasará a aprobación financiera del CFO.",
    confirmLabel: "Aprobar",
    motivo: "opcional",
    concepto: "siFalta",
    exito: "Solicitud aprobada por el Supervisor.",
  },
  cfoApprove: {
    label: "Aprobar (CFO)",
    titulo: "Aprobación financiera",
    descripcion: "La solicitud quedará aprobada y visible para Tesorería.",
    confirmLabel: "Aprobar",
    motivo: "opcional",
    concepto: "no",
    exito: "Solicitud aprobada por el CFO.",
  },
  defer: {
    label: "Diferir",
    titulo: "Diferir solicitud",
    descripcion: "La solicitud queda diferida: sigue visible para Tesorería, pero sin aprobar.",
    confirmLabel: "Diferir",
    motivo: "opcional",
    concepto: "no",
    exito: "Solicitud diferida.",
  },
  reject: {
    label: "Rechazar",
    titulo: "Rechazar solicitud",
    descripcion: "El rechazo es un estado final. Indica el motivo para la bitácora.",
    confirmLabel: "Rechazar",
    motivo: "obligatorio",
    concepto: "no",
    danger: true,
    exito: "Solicitud rechazada.",
  },
  requestCorrection: {
    label: "Solicitar corrección",
    titulo: "Solicitar corrección",
    descripcion:
      "Vuelve a quien la capturó para que la corrija y la reenvíe. Indica qué debe corregirse.",
    confirmLabel: "Solicitar corrección",
    motivo: "obligatorio",
    concepto: "no",
    exito: "Se solicitó la corrección.",
  },
};

export function SolicitudAcciones({ solicitud }: { solicitud: SolicitudDetail }) {
  const s = solicitud;
  const { user } = useAuth();
  const avisos = useToast();

  const [abierta, setAbierta] = useState<Clave | null>(null);
  const [motivo, setMotivo] = useState("");
  const [concepto, setConcepto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enviar = useSubmit(s.id);
  const cancelar = useCancel(s.id);
  const asignar = useAssignConcept(s.id);
  const aprobarSup = useSupervisorApprove(s.id);
  const aprobarCfo = useCfoApprove(s.id);
  const diferir = useDefer(s.id);
  const rechazar = useReject(s.id);
  const corregir = useRequestCorrection(s.id);

  const enCurso =
    enviar.isPending ||
    cancelar.isPending ||
    asignar.isPending ||
    aprobarSup.isPending ||
    aprobarCfo.isPending ||
    diferir.isPending ||
    rechazar.isPending ||
    corregir.isPending;

  if (!user) return null;

  const permisos = availableActions(user.role, s.status, s.captured_by === user.id);
  const sinAdjuntos = s.attachments.length === 0;

  /** Cancelar tiene su PROPIA regla: `workflow.cancel` no exige ninguna capacidad, solo ser
   *  el dueño (o Admin) y que el estado sea editable. No se deriva de `canSubmit`, que además
   *  pide `solicitud:create`: alguien puede poder cancelar sin poder enviar. */
  const puedeCancelar =
    (s.captured_by === user.id || user.role === "admin") &&
    EDITABLE_STATUSES.includes(s.status);

  // ── qué acciones ofrecer ──────────────────────────────────────────────────
  const disponibles: Clave[] = [];
  if (permisos.canSubmit) disponibles.push("submit");
  if (puedeCancelar) disponibles.push("cancel");
  if (permisos.supervisorActions) {
    if (!s.final_concept_id) disponibles.push("assign");
    disponibles.push("supervisorApprove", "requestCorrection", "reject");
  }
  if (permisos.cfoActions) {
    disponibles.push("cfoApprove", "defer", "requestCorrection", "reject");
  }

  if (disponibles.length === 0) {
    return (
      <div className="fv muted">
        No hay acciones disponibles para tu rol en este estado.
      </div>
    );
  }

  const cfg = abierta ? CONFIG[abierta] : null;
  const pideConcepto =
    cfg?.concepto === "obligatorio" || (cfg?.concepto === "siFalta" && !s.final_concept_id);

  const cerrar = () => {
    setAbierta(null);
    setMotivo("");
    setConcepto(null);
    setError(null);
  };

  const abrir = (clave: Clave) => {
    setAbierta(clave);
    setMotivo("");
    setConcepto(null);
    setError(null);
  };

  const ejecutar = async () => {
    if (!abierta || !cfg) return;
    const texto = motivo.trim();
    if (cfg.motivo === "obligatorio" && texto === "") {
      setError("El motivo es obligatorio.");
      return;
    }
    if (pideConcepto && !concepto) {
      setError("Selecciona el concepto final (debe ser una hoja del catálogo).");
      return;
    }
    setError(null);
    try {
      switch (abierta) {
        case "submit":
          await enviar.mutateAsync();
          break;
        case "cancel":
          await cancelar.mutateAsync(texto || undefined);
          break;
        case "assign":
          await asignar.mutateAsync(concepto as string);
          break;
        case "supervisorApprove":
          await aprobarSup.mutateAsync({
            finalConceptId: concepto ?? undefined,
            reason: texto || undefined,
          });
          break;
        case "cfoApprove":
          await aprobarCfo.mutateAsync(texto || undefined);
          break;
        case "defer":
          await diferir.mutateAsync(texto || undefined);
          break;
        case "reject":
          await rechazar.mutateAsync(texto);
          break;
        case "requestCorrection":
          await corregir.mutateAsync(texto);
          break;
      }
      avisos.exito(cfg.exito);
      cerrar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo completar la acción.");
    }
  };

  return (
    <>
      <div className="acciones-flujo" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {disponibles.map((clave) => {
          const c = CONFIG[clave];
          // Enviar sin adjuntos: el backend lo rechaza, así que se avisa antes.
          const bloqueado = clave === "submit" && sinAdjuntos;
          const motivoBloqueo = bloqueado ? "Requiere al menos un adjunto" : undefined;
          const boton = (
            <button
              type="button"
              className={`btn btn-sm${c.danger ? " btn-danger" : ""}`}
              disabled={bloqueado || enCurso}
              title={motivoBloqueo}
              onClick={() => abrir(clave)}
            >
              {c.label}
            </button>
          );
          // Un `button[disabled]` no dispara eventos de ratón, así que su propio `title` no
          // se muestra de forma confiable: el motivo va también en un envoltorio.
          return bloqueado ? (
            <span key={clave} title={motivoBloqueo} style={{ display: "inline-flex" }}>
              {boton}
            </span>
          ) : (
            <span key={clave} style={{ display: "inline-flex" }}>
              {boton}
            </span>
          );
        })}
      </div>

      {sinAdjuntos && permisos.canSubmit && (
        <div className="fv muted" style={{ fontSize: 11, marginTop: 6 }}>
          Para enviar a revisión hace falta al menos un adjunto.
        </div>
      )}

      <Dialog
        header={cfg?.titulo ?? ""}
        visible={abierta !== null}
        style={{ width: "min(92vw, 460px)" }}
        onHide={cerrar}
        draggable={false}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn btn-sm" onClick={cerrar} disabled={enCurso}>
              Volver
            </button>
            <Button
              size="small"
              severity={cfg?.danger ? "danger" : undefined}
              label={enCurso ? "Procesando…" : (cfg?.confirmLabel ?? "")}
              disabled={enCurso}
              loading={enCurso}
              onClick={ejecutar}
            />
          </div>
        }
      >
        {cfg && (
          <>
            <p className="fv muted" style={{ marginTop: 0 }}>
              {cfg.descripcion}
            </p>

            {error && (
              <div style={{ marginBottom: 12 }}>
                <Message severity="error" text={error} />
              </div>
            )}

            {pideConcepto && (
              <>
                <label className="fl fl-required" htmlFor="accion-concepto">
                  Concepto final
                </label>
                <div style={{ marginBottom: 12 }}>
                  <ConceptoSelect
                    inputId="accion-concepto"
                    value={concepto}
                    onChange={setConcepto}
                    invalid={!!error && !concepto}
                    showClear={false}
                  />
                </div>
              </>
            )}

            {cfg.motivo !== "no" && (
              <>
                <label
                  className={`fl${cfg.motivo === "obligatorio" ? " fl-required" : ""}`}
                  htmlFor="accion-motivo"
                >
                  Motivo{cfg.motivo === "opcional" ? " (opcional)" : ""}
                </label>
                <InputTextarea
                  id="accion-motivo"
                  rows={3}
                  autoResize
                  maxLength={1000}
                  style={{ width: "100%" }}
                  value={motivo}
                  disabled={enCurso}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </>
            )}
          </>
        )}
      </Dialog>
    </>
  );
}
