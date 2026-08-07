/** Panel de detalle del Proveedor: datos + contacto + banco + CUMPLIMIENTO anidado.
 *
 * El cumplimiento es una sub-entidad 1:N que se consulta y se da de alta aquí mismo
 * (patrón "lista relacionada + form inline"). Solo alta: el backend no edita ni borra
 * cumplimientos, cada registro es el resultado de una revisión externa.
 */

import { useState } from "react";

import { CLEARANCE_LABELS, formatDate, formatDateTime } from "@/shared/lib/labels";
import { Badge } from "@/shared/ui/Badge";

import { labelCumplimiento, toneCumplimiento } from "../clearance";
import { useCreateCumplimiento, useCumplimientos } from "../hooks";
import { toISODate, vacioANull } from "../types";
import type { CumplimientoFormValues, Supplier } from "../types";
import { CumplimientoInlineForm } from "./CumplimientoInlineForm";

interface ProveedorDetailPanelProps {
  proveedor: Supplier;
  canEdit: boolean;
  canRecordClearance: boolean;
  onEdit: () => void;
}

export function ProveedorDetailPanel({
  proveedor,
  canEdit,
  canRecordClearance,
  onEdit,
}: ProveedorDetailPanelProps) {
  const cumplimientos = useCumplimientos(proveedor.id);
  const crear = useCreateCumplimiento(proveedor.id);
  const [registrando, setRegistrando] = useState(false);

  const items = cumplimientos.data ?? [];
  const efectivo = proveedor.clearance.effective_status;

  const onRegistrar = async (data: CumplimientoFormValues) => {
    await crear.mutateAsync({
      status: data.status,
      clearance_date: toISODate(data.clearance_date),
      valid_until: toISODate(data.valid_until),
      compliance_reference: vacioANull(data.compliance_reference),
      notes: vacioANull(data.notes),
    });
    setRegistrando(false);
  };

  return (
    <>
      <div className="dh">
        <div className="dh-row">
          <div>
            <div className="dh-name">{proveedor.legal_name}</div>
            <div className="dh-sub">
              <Badge
                tone={proveedor.status === "active" ? "green" : "gray"}
                label={proveedor.status === "active" ? "Activo" : "Inactivo"}
              />
              <Badge tone={toneCumplimiento(efectivo)} label={labelCumplimiento(efectivo)} />
              {proveedor.rfc && <span className="td-mono">{proveedor.rfc}</span>}
            </div>
          </div>
          {canEdit && (
            <button type="button" className="btn btn-sm" onClick={onEdit}>
              Editar
            </button>
          )}
        </div>
      </div>

      <div className="db">
        <div className="sec">Identificación</div>
        <div className="fl">Razón social</div>
        <div className="fv">{proveedor.legal_name}</div>
        <div className="fl">RFC</div>
        <div className="fv mono">{proveedor.rfc ?? "—"}</div>
        <div className="fl">Estado</div>
        <div className="fv">{proveedor.status === "active" ? "Activo" : "Inactivo"}</div>

        <div className="sec">Contacto</div>
        <div className="fl">Nombre</div>
        <div className="fv">{proveedor.contact_name ?? "—"}</div>
        <div className="fl">Correo</div>
        <div className="fv link">{proveedor.email ?? "—"}</div>
        <div className="fl">Teléfono</div>
        <div className="fv">{proveedor.phone ?? "—"}</div>

        <div className="sec">Datos bancarios</div>
        <div className="fl">Banco</div>
        <div className="fv">{proveedor.bank_name ?? "—"}</div>
        <div className="fl">Cuenta</div>
        <div className="fv mono">{proveedor.bank_account ?? "—"}</div>
        <div className="fl">CLABE</div>
        <div className="fv mono">{proveedor.clabe ?? "—"}</div>

        <div className="sec">
          <span>Cumplimiento ({items.length})</span>
          {canRecordClearance && !registrando && (
            <button type="button" className="btn btn-xs" onClick={() => setRegistrando(true)}>
              + Registrar
            </button>
          )}
        </div>

        <div className="fv muted" style={{ marginBottom: 10 }}>
          Situación vigente: <strong>{labelCumplimiento(efectivo)}</strong>
          {proveedor.clearance.valid_until && (
            <> · vence {formatDate(proveedor.clearance.valid_until)}</>
          )}
          {proveedor.clearance.is_expired && " (vencido)"}
        </div>

        {registrando && (
          <CumplimientoInlineForm
            submitting={crear.isPending}
            onSubmit={onRegistrar}
            onCancel={() => setRegistrando(false)}
          />
        )}

        {cumplimientos.isLoading && <div className="state-msg">Cargando cumplimientos…</div>}
        {cumplimientos.isError && (
          <div className="state-msg error">No se pudieron cargar los cumplimientos.</div>
        )}
        {!cumplimientos.isLoading && !cumplimientos.isError && items.length === 0 && (
          <div className="fv muted">Sin registros de cumplimiento.</div>
        )}

        {items.map((c) => (
          <div className="rel-item" key={c.id}>
            <div>
              <div className="rel-name">
                {CLEARANCE_LABELS[c.status] ?? c.status}
              </div>
              <div className="rel-sub">
                {c.clearance_date ? formatDate(c.clearance_date) : "sin fecha"}
                {c.valid_until && <> · vigente hasta {formatDate(c.valid_until)}</>}
                {c.compliance_reference && <> · ref. {c.compliance_reference}</>}
              </div>
              {c.notes && (
                <div className="rel-sub" style={{ fontStyle: "italic" }}>
                  {c.notes}
                </div>
              )}
              <div className="rel-sub" style={{ color: "var(--text3)" }}>
                Registrado {formatDateTime(c.created_at)}
              </div>
            </div>
            <Badge tone={toneCumplimiento(c.status)} label={labelCumplimiento(c.status)} />
          </div>
        ))}
      </div>
    </>
  );
}
