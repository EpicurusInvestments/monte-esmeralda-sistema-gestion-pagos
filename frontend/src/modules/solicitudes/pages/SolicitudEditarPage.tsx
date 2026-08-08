/** Edición de una Solicitud de Pago (`PATCH /solicitudes/{id}`).
 *
 * El backend (`workflow.update_solicitud`) exige TRES cosas: estado editable
 * (`draft` o `correction_requested`), ser el dueño (`captured_by`) o Admin, y tener
 * `solicitud:edit_draft`. Aquí se comprueba lo mismo para no ofrecer un formulario que va a
 * ser rechazado — el backend revalida de todas formas.
 */

import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "@/shared/lib/auth";
import { toISODate } from "@/shared/lib/dates";
import { canCreateSolicitud } from "@/shared/lib/nav";

import { SolicitudForm } from "../components/SolicitudForm";
import { useSolicitud, useUpdateSolicitud } from "../hooks";
import { EDITABLE_STATUSES } from "../types";
import type { SolicitudFormValues } from "../types";

function vacioANull(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}

/** "YYYY-MM-DD" → Date local (para precargar el Calendar sin corrimiento de zona). */
function deISODate(v: string | null): Date | null {
  if (!v) return null;
  const [a, m, d] = v.split("-").map(Number);
  if (!a || !m || !d) return null;
  return new Date(a, m - 1, d);
}

export function SolicitudEditarPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const detalle = useSolicitud(id ?? null);
  const actualizar = useUpdateSolicitud();

  const volver = () => navigate(`/solicitudes?seleccion=${id ?? ""}`);

  if (detalle.isLoading) {
    return (
      <div className="main-pane">
        <div className="state-msg">Cargando la solicitud…</div>
      </div>
    );
  }
  if (detalle.isError || !detalle.data) {
    return (
      <div className="main-pane">
        <div className="state-msg error">No se pudo cargar la solicitud.</div>
      </div>
    );
  }

  const s = detalle.data;
  const esDueño = user?.id === s.captured_by;
  const esAdmin = user?.role === "admin";
  const puedeEditar =
    EDITABLE_STATUSES.includes(s.status) &&
    (esDueño || esAdmin) &&
    !!user &&
    canCreateSolicitud(user.role);

  if (!puedeEditar) {
    const motivo = !EDITABLE_STATUSES.includes(s.status)
      ? "Solo puede editarse en borrador o cuando se solicitó una corrección."
      : "Solo quien la capturó (o un Administrador) puede editarla.";
    return (
      <div className="main-pane">
        <h1 className="cat-title">Solicitud {s.folio}</h1>
        <div className="state-msg">Esta solicitud no es editable. {motivo}</div>
        <div style={{ textAlign: "center" }}>
          <button type="button" className="btn" onClick={volver}>
            Volver a Solicitudes
          </button>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: SolicitudFormValues) => {
    await actualizar.mutateAsync({
      id: s.id,
      data: {
        request_type: data.request_type,
        supplier_id: data.supplier_id,
        description: data.description,
        net_amount: data.net_amount.toFixed(2),
        proposed_concept_id: data.proposed_concept_id,
        proposed_payment_week: vacioANull(data.proposed_payment_week),
        document_date: toISODate(data.document_date),
        due_date: toISODate(data.due_date),
      },
    });
    volver();
  };

  return (
    <SolicitudForm
      title={`Editar solicitud ${s.folio}`}
      submitLabel="Guardar cambios"
      submitting={actualizar.isPending}
      defaultValues={{
        request_type: s.request_type,
        supplier_id: s.supplier_id,
        description: s.description,
        net_amount: Number(s.net_amount),
        proposed_concept_id: s.proposed_concept_id,
        proposed_payment_week: s.proposed_payment_week ?? "",
        document_date: deISODate(s.document_date),
        due_date: deISODate(s.due_date),
      }}
      onSubmit={onSubmit}
      onCancel={volver}
    />
  );
}
