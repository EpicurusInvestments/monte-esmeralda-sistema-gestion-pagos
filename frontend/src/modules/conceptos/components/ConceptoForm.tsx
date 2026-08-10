/** Alta / edición de Concepto (React Hook Form + Zod, componentes de PrimeReact).
 *
 * El código es único: si el backend lo rechaza responde `VALIDATION_ERROR` y el mensaje se
 * monta sobre el campo `code` con `setError`, sin perder lo capturado.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { ApiError } from "@/shared/lib/api";

import { CONCEPTO_FORM_DEFAULTS, SECTIONS, conceptoSchema } from "../types";
import type { Concept, ConceptoFormValues } from "../types";

interface ConceptoFormProps {
  title: string;
  /** Conceptos encabezado, para elegir el padre. */
  headers: Concept[];
  defaultValues?: Partial<ConceptoFormValues>;
  submitting?: boolean;
  onSubmit: (data: ConceptoFormValues) => Promise<void>;
  onCancel: () => void;
}

export function ConceptoForm({
  title,
  headers,
  defaultValues,
  submitting,
  onSubmit,
  onCancel,
}: ConceptoFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ConceptoFormValues>({
    resolver: zodResolver(conceptoSchema),
    defaultValues: { ...CONCEPTO_FORM_DEFAULTS, ...defaultValues },
  });

  const parentOptions = [
    { label: "— Sin padre (raíz)", value: null },
    ...headers.map((h) => ({ label: h.path ?? h.name, value: h.id })),
  ];

  const submit = handleSubmit(async (data) => {
    setFormError(null);
    try {
      await onSubmit(data);
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        // El caso típico es el código duplicado: se muestra sobre el campo.
        setError("code", { type: "server", message: err.message });
      } else if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("No se pudo guardar el concepto. Intenta de nuevo.");
      }
    }
  });

  return (
    <form
      onSubmit={submit}
      style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      <div className="dh">
        <div className="dh-name">{title}</div>
      </div>

      <div className="db">
        {formError && (
          <div style={{ marginBottom: 12 }}>
            <Message severity="error" text={formError} />
          </div>
        )}

        <div className="sec">Identificación</div>

        <label className="fl fl-required" htmlFor="code">
          Código
        </label>
        <Controller
          name="code"
          control={control}
          render={({ field }) => (
            <InputText
              id="code"
              autoFocus
              maxLength={40}
              invalid={!!errors.code}
              style={{ width: "100%", fontFamily: "var(--mono)" }}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
        <div className="fe">{errors.code?.message}</div>

        <label className="fl fl-required" htmlFor="name">
          Nombre
        </label>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <InputText
              id="name"
              maxLength={255}
              invalid={!!errors.name}
              style={{ width: "100%" }}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
        <div className="fe">{errors.name?.message}</div>

        <div className="sec">Clasificación</div>

        <label className="fl fl-required" htmlFor="section">
          Sección
        </label>
        <Controller
          name="section"
          control={control}
          render={({ field }) => (
            <Dropdown
              inputId="section"
              options={SECTIONS.map((s) => ({ label: `${s.code} — ${s.label}`, value: s.code }))}
              placeholder="Selecciona…"
              invalid={!!errors.section}
              style={{ width: "100%" }}
              value={field.value}
              onChange={(e) => field.onChange(e.value)}
              onBlur={field.onBlur}
            />
          )}
        />
        <div className="fe">{errors.section?.message}</div>

        <label className="fl" htmlFor="parent_id">
          Concepto padre
        </label>
        <Controller
          name="parent_id"
          control={control}
          render={({ field }) => (
            <Dropdown
              inputId="parent_id"
              options={parentOptions}
              placeholder="— Sin padre (raíz)"
              filter
              showClear
              style={{ width: "100%" }}
              value={field.value}
              onChange={(e) => field.onChange(e.value ?? null)}
              onBlur={field.onBlur}
            />
          )}
        />
        <div className="fe">{errors.parent_id?.message}</div>

        <div className="sec">Presentación</div>

        <Controller
          name="is_header"
          control={control}
          render={({ field }) => (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Checkbox
                inputId="is_header"
                checked={field.value}
                onChange={(e) => field.onChange(!!e.checked)}
              />
              <label htmlFor="is_header" className="cb-label">
                Es encabezado — agrupador, no asignable
              </label>
            </div>
          )}
        />

        <Controller
          name="active"
          control={control}
          render={({ field }) => (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Checkbox
                inputId="active"
                checked={field.value}
                onChange={(e) => field.onChange(!!e.checked)}
              />
              <label htmlFor="active" className="cb-label">
                Activo
              </label>
            </div>
          )}
        />

        <label className="fl" htmlFor="sort_order">
          Orden
        </label>
        <Controller
          name="sort_order"
          control={control}
          render={({ field }) => (
            <InputNumber
              inputId="sort_order"
              min={0}
              showButtons={false}
              invalid={!!errors.sort_order}
              style={{ width: "100%" }}
              inputStyle={{ width: "100%" }}
              value={field.value}
              onValueChange={(e) => field.onChange(e.value ?? 0)}
            />
          )}
        />
        <div className="fe">{errors.sort_order?.message}</div>
      </div>

      <div className="df">
        <button type="button" className="btn btn-sm" onClick={onCancel} disabled={submitting}>
          Cancelar
        </button>
        <Button
          type="submit"
          size="small"
          label={submitting ? "Guardando…" : "Guardar"}
          disabled={submitting}
          loading={submitting}
        />
      </div>
    </form>
  );
}
