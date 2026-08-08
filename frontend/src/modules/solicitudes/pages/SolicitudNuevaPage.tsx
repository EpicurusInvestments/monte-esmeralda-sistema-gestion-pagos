/** Captura de una Solicitud de Pago (`POST /solicitudes` → se crea en `draft`).
 *
 * Requiere `solicitud:create` (Admin y Admin de Campo). Si el rol no la tiene, no se pinta el
 * formulario: el backend responde 403 igual, esto es solo UX.
 */

import { useNavigate } from "react-router-dom";

import { useAuth } from "@/shared/lib/auth";
import { toISODate } from "@/shared/lib/dates";
import { canCreateSolicitud } from "@/shared/lib/nav";

import { SolicitudForm } from "../components/SolicitudForm";
import { useCreateSolicitud } from "../hooks";
import type { SolicitudFormValues } from "../types";

/** Texto opcional vacío → null (el backend distingue "" de ausente). */
function vacioANull(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}

export function SolicitudNuevaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const crear = useCreateSolicitud();

  if (!user || !canCreateSolicitud(user.role)) {
    return (
      <div className="main-pane">
        <div className="state-msg">
          Tu rol no puede capturar solicitudes de pago.
        </div>
      </div>
    );
  }

  const onSubmit = async (data: SolicitudFormValues) => {
    const nueva = await crear.mutateAsync({
      request_type: data.request_type,
      supplier_id: data.supplier_id,
      description: data.description,
      // El backend usa Decimal: se manda como string con 2 decimales.
      net_amount: data.net_amount.toFixed(2),
      proposed_concept_id: data.proposed_concept_id,
      proposed_payment_week: vacioANull(data.proposed_payment_week),
      document_date: toISODate(data.document_date),
      due_date: toISODate(data.due_date),
    });
    // Vuelve a la lista con la nueva solicitud ya seleccionada.
    navigate(`/solicitudes?seleccion=${nueva.id}`, { replace: true });
  };

  return (
    <SolicitudForm
      title="Nueva solicitud de pago"
      submitLabel="Crear borrador"
      submitting={crear.isPending}
      onSubmit={onSubmit}
      onCancel={() => navigate("/solicitudes")}
    />
  );
}
