/** Alta / edición de Proveedor (React Hook Form + Zod, componentes de PrimeReact).
 *
 * Los campos opcionales vacíos se envían como `null`, no como "": el backend los tipa como
 * `str | None` y `email` es `EmailStr`, que rechaza la cadena vacía con 422.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { ApiError } from "@/shared/lib/api";

import { PROVEEDOR_FORM_DEFAULTS, SUPPLIER_STATUS_OPTIONS, proveedorSchema } from "../types";
import type { ProveedorFormValues } from "../types";

interface ProveedorFormProps {
  title: string;
  defaultValues?: Partial<ProveedorFormValues>;
  submitting?: boolean;
  onSubmit: (data: ProveedorFormValues) => Promise<void>;
  onCancel: () => void;
}

/** Campo de texto simple del formulario (evita repetir el Controller ocho veces). */
function CampoTexto({
  name,
  label,
  control,
  error,
  required,
  mono,
  maxLength,
  placeholder,
}: {
  name: keyof ProveedorFormValues;
  label: string;
  control: ReturnType<typeof useForm<ProveedorFormValues>>["control"];
  error?: string;
  required?: boolean;
  mono?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <>
      <label className={`fl${required ? " fl-required" : ""}`} htmlFor={name}>
        {label}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <InputText
            id={name}
            maxLength={maxLength}
            placeholder={placeholder}
            invalid={!!error}
            style={{ width: "100%", fontFamily: mono ? "var(--mono)" : undefined }}
            value={(field.value as string | undefined) ?? ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      <div className="fe">{error}</div>
    </>
  );
}

export function ProveedorForm({
  title,
  defaultValues,
  submitting,
  onSubmit,
  onCancel,
}: ProveedorFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProveedorFormValues>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: { ...PROVEEDOR_FORM_DEFAULTS, ...defaultValues },
  });

  const submit = handleSubmit(async (data) => {
    setFormError(null);
    try {
      await onSubmit(data);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "No se pudo guardar el proveedor.",
      );
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
        <CampoTexto
          name="legal_name"
          label="Razón social"
          control={control}
          error={errors.legal_name?.message}
          required
          maxLength={255}
        />
        <CampoTexto
          name="rfc"
          label="RFC"
          control={control}
          error={errors.rfc?.message}
          mono
          maxLength={20}
        />

        <label className="fl fl-required" htmlFor="status">
          Estado
        </label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Dropdown
              inputId="status"
              options={[...SUPPLIER_STATUS_OPTIONS]}
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

        <div className="sec">Contacto</div>
        <CampoTexto
          name="contact_name"
          label="Nombre"
          control={control}
          error={errors.contact_name?.message}
          maxLength={255}
        />
        <CampoTexto
          name="email"
          label="Correo"
          control={control}
          error={errors.email?.message}
          maxLength={255}
          placeholder="proveedor@dominio.mx"
        />
        <CampoTexto
          name="phone"
          label="Teléfono"
          control={control}
          error={errors.phone?.message}
          maxLength={50}
        />

        <div className="sec">Datos bancarios</div>
        <CampoTexto
          name="bank_name"
          label="Banco"
          control={control}
          error={errors.bank_name?.message}
          maxLength={255}
        />
        <CampoTexto
          name="bank_account"
          label="Cuenta"
          control={control}
          error={errors.bank_account?.message}
          mono
          maxLength={50}
        />
        <CampoTexto
          name="clabe"
          label="CLABE"
          control={control}
          error={errors.clabe?.message}
          mono
          maxLength={18}
        />
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
