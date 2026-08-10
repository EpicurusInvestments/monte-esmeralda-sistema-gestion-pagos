/** Alta / edición de usuario (React Hook Form + Zod, componentes de PrimeReact).
 *
 * Un solo componente para los dos modos, porque cambian tres detalles y no la estructura:
 *  - `new`  → correo editable y contraseña obligatoria.
 *  - `edit` → correo de SOLO LECTURA (el backend no lo acepta en el `PATCH`), aparece el
 *    estado activo/inactivo y la contraseña es opcional: en blanco no se cambia.
 *
 * El correo duplicado llega como `VALIDATION_ERROR` (422) y se monta sobre el campo `email`
 * con `setError`, sin perder lo capturado.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Password } from "primereact/password";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { ApiError } from "@/shared/lib/api";

import {
  ROLE_OPTIONS,
  USUARIO_FORM_DEFAULTS,
  usuarioCrearSchema,
  usuarioEditarSchema,
} from "../types";
import type { UsuarioFormValues } from "../types";

interface UsuarioFormProps {
  title: string;
  modo: "new" | "edit";
  defaultValues?: Partial<UsuarioFormValues>;
  submitting?: boolean;
  onSubmit: (data: UsuarioFormValues) => Promise<void>;
  onCancel: () => void;
}

export function UsuarioForm({
  title,
  modo,
  defaultValues,
  submitting,
  onSubmit,
  onCancel,
}: UsuarioFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const esAlta = modo === "new";

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UsuarioFormValues>({
    resolver: zodResolver(esAlta ? usuarioCrearSchema : usuarioEditarSchema),
    defaultValues: { ...USUARIO_FORM_DEFAULTS, ...defaultValues },
  });

  const submit = handleSubmit(async (data) => {
    setFormError(null);
    try {
      await onSubmit(data);
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        // El caso típico es el correo duplicado: se muestra sobre el campo.
        setError("email", { type: "server", message: err.message });
      } else if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("No se pudo guardar el usuario. Intenta de nuevo.");
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

        <label className={esAlta ? "fl fl-required" : "fl"} htmlFor="email">
          Correo
        </label>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <InputText
              id="email"
              type="email"
              autoFocus={esAlta}
              maxLength={255}
              // En edición el correo es la identidad de la cuenta y el backend no lo acepta
              // en el PATCH: se muestra, deshabilitado, para dar contexto.
              disabled={!esAlta}
              invalid={!!errors.email}
              style={{ width: "100%" }}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
        <div className="fe">
          {errors.email?.message ?? (!esAlta ? "El correo no se puede modificar." : "")}
        </div>

        <label className="fl fl-required" htmlFor="full_name">
          Nombre completo
        </label>
        <Controller
          name="full_name"
          control={control}
          render={({ field }) => (
            <InputText
              id="full_name"
              autoFocus={!esAlta}
              maxLength={255}
              invalid={!!errors.full_name}
              style={{ width: "100%" }}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
        <div className="fe">{errors.full_name?.message}</div>

        <div className="sec">Acceso</div>

        <label className="fl fl-required" htmlFor="role">
          Rol
        </label>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Dropdown
              inputId="role"
              options={ROLE_OPTIONS}
              optionLabel="label"
              optionValue="value"
              placeholder="Selecciona…"
              invalid={!!errors.role}
              style={{ width: "100%" }}
              value={field.value}
              onChange={(e) => field.onChange(e.value)}
              onBlur={field.onBlur}
            />
          )}
        />
        <div className="fe">{errors.role?.message}</div>

        {!esAlta && (
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Checkbox
                  inputId="is_active"
                  checked={field.value}
                  onChange={(e) => field.onChange(!!e.checked)}
                />
                <label htmlFor="is_active" className="cb-label">
                  Activo — puede iniciar sesión
                </label>
              </div>
            )}
          />
        )}

        <label className={esAlta ? "fl fl-required" : "fl"} htmlFor="password">
          Contraseña
        </label>
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Password
              inputId="password"
              toggleMask
              feedback={false}
              placeholder={esAlta ? "" : "Dejar en blanco para no cambiarla"}
              invalid={!!errors.password}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <div className="fe">{errors.password?.message}</div>
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
