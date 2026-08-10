/** Formulario de captura / edición de una Solicitud de Pago (full-screen por secciones).
 *
 * Reglas que refleja del backend:
 *  - `description` no vacía y `net_amount` > 0 (se envía como STRING: el backend usa Decimal).
 *  - El concepto propuesto debe ser una HOJA; el selector solo ofrece hojas activas.
 *  - Las fechas viajan como "YYYY-MM-DD" en horario local (`toISODate`).
 *
 * El cumplimiento del proveedor se muestra como AVISO, nunca como bloqueo: en el Paquete 1 un
 * cumplimiento no vigente no impide capturar (el bloqueo duro es de la etapa de pago).
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { labelCumplimiento, toneCumplimiento } from "@/modules/proveedores/clearance";
import { useProveedores } from "@/modules/proveedores/hooks";
import { ApiError } from "@/shared/lib/api";
import { Badge } from "@/shared/ui/Badge";

import { REQUEST_TYPE_OPTIONS, SOLICITUD_FORM_DEFAULTS, solicitudSchema } from "../types";
import { ConceptoSelect } from "./ConceptoSelect";
import type { SolicitudFormValues } from "../types";



interface SolicitudFormProps {
  title: string;
  defaultValues?: Partial<SolicitudFormValues>;
  submitLabel?: string;
  submitting?: boolean;
  onSubmit: (data: SolicitudFormValues) => Promise<void>;
  onCancel: () => void;
}

export function SolicitudForm({
  title,
  defaultValues,
  submitLabel = "Guardar",
  submitting,
  onSubmit,
  onCancel,
}: SolicitudFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const proveedores = useProveedores();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SolicitudFormValues>({
    resolver: zodResolver(solicitudSchema),
    defaultValues: { ...SOLICITUD_FORM_DEFAULTS, ...defaultValues },
  });

  const supplierId = watch("supplier_id");
  const proveedorElegido = (proveedores.data ?? []).find((p) => p.id === supplierId);
  const cumplimiento = proveedorElegido?.clearance.effective_status;

  const opcionesProveedor = useMemo(
    () => (proveedores.data ?? []).map((p) => ({ value: p.id, label: p.legal_name })),
    [proveedores.data],
  );


  const submit = handleSubmit(async (data) => {
    setFormError(null);
    try {
      await onSubmit(data);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "No se pudo guardar la solicitud.",
      );
    }
  });

  return (
    <div className="main-pane">
      <form onSubmit={submit} style={{ maxWidth: 760 }} noValidate>
        <h1 className="cat-title" style={{ marginBottom: 4 }}>
          {title}
        </h1>
        <p className="cat-sub" style={{ marginBottom: 20 }}>
          La solicitud se guarda como <strong>borrador</strong>. Desde su detalle se adjuntan los
          documentos y se envía a revisión (hace falta al menos un adjunto).
        </p>

        {formError && (
          <div style={{ marginBottom: 16 }}>
            <Message severity="error" text={formError} />
          </div>
        )}

        <div className="sec">Datos generales</div>

        <label className="fl fl-required" htmlFor="request_type">
          Tipo de solicitud
        </label>
        <Controller
          name="request_type"
          control={control}
          render={({ field }) => (
            <Dropdown
              inputId="request_type"
              options={REQUEST_TYPE_OPTIONS}
              optionLabel="label"
              optionValue="value"
              invalid={!!errors.request_type}
              style={{ width: "100%" }}
              value={field.value}
              onChange={(e) => field.onChange(e.value)}
            />
          )}
        />
        <div className="fe">{errors.request_type?.message}</div>

        <label className="fl fl-required" htmlFor="supplier_id">
          Proveedor
        </label>
        <Controller
          name="supplier_id"
          control={control}
          render={({ field }) => (
            <Dropdown
              inputId="supplier_id"
              options={opcionesProveedor}
              optionLabel="label"
              optionValue="value"
              placeholder={
                proveedores.isLoading ? "Cargando proveedores…" : "Selecciona un proveedor"
              }
              filter
              invalid={!!errors.supplier_id}
              style={{ width: "100%" }}
              value={field.value || null}
              onChange={(e) => field.onChange(e.value ?? "")}
            />
          )}
        />
        <div className="fe">{errors.supplier_id?.message}</div>

        {cumplimiento && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6 }}>
              <span className="fl" style={{ display: "inline" }}>
                Cumplimiento del proveedor:{" "}
              </span>
              <Badge tone={toneCumplimiento(cumplimiento)} label={labelCumplimiento(cumplimiento)} />
            </div>
            {cumplimiento !== "cleared" && (
              <Message
                severity="warn"
                text="El proveedor no tiene cumplimiento vigente. Puedes capturar la solicitud; el bloqueo se aplica en la etapa de pago."
              />
            )}
          </div>
        )}

        <label className="fl fl-required" htmlFor="description">
          Descripción
        </label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <InputTextarea
              id="description"
              rows={3}
              autoResize
              maxLength={2000}
              invalid={!!errors.description}
              style={{ width: "100%" }}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <div className="fe">{errors.description?.message}</div>

        <div className="sec">Importe y concepto</div>

        <label className="fl fl-required" htmlFor="net_amount">
          Monto neto (MXN)
        </label>
        <Controller
          name="net_amount"
          control={control}
          render={({ field }) => (
            <InputNumber
              inputId="net_amount"
              mode="decimal"
              minFractionDigits={2}
              maxFractionDigits={2}
              min={0}
              invalid={!!errors.net_amount}
              style={{ width: "100%" }}
              inputStyle={{ width: "100%", fontFamily: "var(--mono)" }}
              value={field.value}
              onValueChange={(e) => field.onChange(e.value ?? 0)}
            />
          )}
        />
        <div className="fe">{errors.net_amount?.message}</div>

        <label className="fl" htmlFor="proposed_concept_id">
          Concepto propuesto
        </label>
        <Controller
          name="proposed_concept_id"
          control={control}
          render={({ field }) => (
            <ConceptoSelect
              inputId="proposed_concept_id"
              value={field.value}
              onChange={field.onChange}
              placeholder="— Sin concepto propuesto —"
            />
          )}
        />
        <div className="fe" style={{ minHeight: 14 }}>
          {errors.proposed_concept_id?.message}
        </div>
        <div className="fv muted" style={{ fontSize: 11, marginTop: -6 }}>
          Solo se ofrecen conceptos <strong>hoja</strong> activos: los encabezados agrupan y no
          son asignables. El Supervisor confirma o cambia el concepto final.
        </div>

        <div className="sec">Fechas</div>

        <div className="r2">
          <div>
            <label className="fl" htmlFor="document_date">
              Fecha del documento
            </label>
            <Controller
              name="document_date"
              control={control}
              render={({ field }) => (
                <Calendar
                  inputId="document_date"
                  dateFormat="dd/mm/yy"
                  showIcon
                  showButtonBar
                  style={{ width: "100%" }}
                  value={field.value}
                  onChange={(e) => field.onChange((e.value as Date | null) ?? null)}
                />
              )}
            />
            <div className="fe">{errors.document_date?.message}</div>
          </div>
          <div>
            <label className="fl" htmlFor="due_date">
              Vencimiento
            </label>
            <Controller
              name="due_date"
              control={control}
              render={({ field }) => (
                <Calendar
                  inputId="due_date"
                  dateFormat="dd/mm/yy"
                  showIcon
                  showButtonBar
                  style={{ width: "100%" }}
                  value={field.value}
                  onChange={(e) => field.onChange((e.value as Date | null) ?? null)}
                />
              )}
            />
            <div className="fe">{errors.due_date?.message}</div>
          </div>
        </div>

        <label className="fl" htmlFor="proposed_payment_week">
          Semana de pago propuesta
        </label>
        <Controller
          name="proposed_payment_week"
          control={control}
          render={({ field }) => (
            <InputText
              id="proposed_payment_week"
              placeholder="Ej. 2026-W30"
              maxLength={10}
              style={{ width: "100%" }}
              value={field.value ?? ""}
              onChange={field.onChange}
            />
          )}
        />
        <div className="fe">{errors.proposed_payment_week?.message}</div>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid var(--border)",
          }}
        >
          <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
            Cancelar
          </button>
          <Button
            type="submit"
            label={submitting ? "Guardando…" : submitLabel}
            disabled={submitting}
            loading={submitting}
          />
        </div>
      </form>
    </div>
  );
}
