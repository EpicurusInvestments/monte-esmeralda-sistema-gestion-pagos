/** Formulario INLINE para registrar un cumplimiento (dentro del detalle del proveedor).
 *
 * Los cumplimientos son de SOLO ALTA: el backend no expone editar ni borrar. Cada registro
 * es el resultado de una revisión externa; el más reciente define el `effective_status` que
 * se muestra en la lista.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { ApiError } from "@/shared/lib/api";

import {
  CLEARANCE_STATUS_OPTIONS,
  CUMPLIMIENTO_FORM_DEFAULTS,
  cumplimientoSchema,
} from "../types";
import type { CumplimientoFormValues } from "../types";

interface CumplimientoInlineFormProps {
  submitting?: boolean;
  onSubmit: (data: CumplimientoFormValues) => Promise<void>;
  onCancel: () => void;
}

export function CumplimientoInlineForm({
  submitting,
  onSubmit,
  onCancel,
}: CumplimientoInlineFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CumplimientoFormValues>({
    resolver: zodResolver(cumplimientoSchema),
    defaultValues: CUMPLIMIENTO_FORM_DEFAULTS,
  });

  const submit = handleSubmit(async (data) => {
    setFormError(null);
    try {
      await onSubmit(data);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "No se pudo registrar el cumplimiento.",
      );
    }
  });

  return (
    <form className="inline-form" onSubmit={submit}>
      <div className="if-title">Registrar cumplimiento</div>

      {formError && (
        <div style={{ marginBottom: 10 }}>
          <Message severity="error" text={formError} />
        </div>
      )}

      <label className="fl fl-required" htmlFor="clearance-status">
        Resultado
      </label>
      <Controller
        name="status"
        control={control}
        render={({ field }) => (
          <Dropdown
            inputId="clearance-status"
            options={[...CLEARANCE_STATUS_OPTIONS]}
            optionLabel="label"
            optionValue="value"
            invalid={!!errors.status}
            style={{ width: "100%" }}
            value={field.value}
            onChange={(e) => field.onChange(e.value)}
          />
        )}
      />
      <div className="fe">{errors.status?.message}</div>

      <div className="r2">
        <div>
          <label className="fl" htmlFor="clearance-date">
            Fecha del cumplimiento
          </label>
          <Controller
            name="clearance_date"
            control={control}
            render={({ field }) => (
              <Calendar
                inputId="clearance-date"
                dateFormat="dd/mm/yy"
                showIcon
                showButtonBar
                style={{ width: "100%" }}
                value={field.value}
                onChange={(e) => field.onChange((e.value as Date | null) ?? null)}
              />
            )}
          />
          <div className="fe">{errors.clearance_date?.message}</div>
        </div>
        <div>
          <label className="fl" htmlFor="valid-until">
            Vigente hasta
          </label>
          <Controller
            name="valid_until"
            control={control}
            render={({ field }) => (
              <Calendar
                inputId="valid-until"
                dateFormat="dd/mm/yy"
                showIcon
                showButtonBar
                style={{ width: "100%" }}
                value={field.value}
                onChange={(e) => field.onChange((e.value as Date | null) ?? null)}
              />
            )}
          />
          <div className="fe">{errors.valid_until?.message}</div>
        </div>
      </div>

      <label className="fl" htmlFor="compliance-reference">
        Referencia
      </label>
      <Controller
        name="compliance_reference"
        control={control}
        render={({ field }) => (
          <InputText
            id="compliance-reference"
            placeholder="Folio u origen de la revisión"
            style={{ width: "100%" }}
            value={field.value ?? ""}
            onChange={field.onChange}
          />
        )}
      />
      <div className="fe">{errors.compliance_reference?.message}</div>

      <label className="fl" htmlFor="clearance-notes">
        Notas
      </label>
      <Controller
        name="notes"
        control={control}
        render={({ field }) => (
          <InputTextarea
            id="clearance-notes"
            rows={2}
            autoResize
            style={{ width: "100%" }}
            value={field.value ?? ""}
            onChange={field.onChange}
          />
        )}
      />
      <div className="fe">{errors.notes?.message}</div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
        <button type="button" className="btn btn-xs" onClick={onCancel} disabled={submitting}>
          Cancelar
        </button>
        <Button
          type="submit"
          size="small"
          label={submitting ? "Guardando…" : "Registrar"}
          disabled={submitting}
          loading={submitting}
        />
      </div>
    </form>
  );
}
