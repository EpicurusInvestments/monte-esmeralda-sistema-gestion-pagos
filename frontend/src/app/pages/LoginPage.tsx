/** Inicio de sesión: React Hook Form + Zod contra `POST /auth/login`.
 *
 * Al autenticar redirige a la home del rol (`resolveRoleHome`). Un 401 se muestra como
 * "Credenciales inválidas" sin limpiar ni romper el formulario.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Password } from "primereact/password";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import logoMonteEsmeralda from "@/assets/logo-monte-esmeralda.png";
import { ApiError } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import { resolveRoleHome } from "@/shared/lib/roleHome";

const schema = z.object({
  email: z
    .string()
    .min(1, "El correo es obligatorio")
    .email("Escribe un correo válido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      const user = await login(values.email, values.password);
      navigate(resolveRoleHome(user.role), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.status === 401 ? "Credenciales inválidas" : err.message);
      } else {
        setFormError("No se pudo iniciar sesión. Intenta de nuevo.");
      }
    }
  };

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <img
            className="auth-logo-img"
            src={logoMonteEsmeralda}
            alt="Monte Esmeralda"
          />
          <h1 className="auth-system-name">
            Sistema de Gestión de Pagos y Flujo de Efectivo
          </h1>
          <h2 className="auth-sub">Iniciar sesión</h2>
        </div>

        {formError && (
          <div className="auth-error">
            <Message severity="error" text={formError} />
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="auth-field">
            <label className="fl fl-required" htmlFor="email">
              Correo
            </label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <InputText
                  id="email"
                  type="email"
                  autoComplete="username"
                  invalid={!!errors.email}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
            <div className="fe">{errors.email?.message}</div>
          </div>

          <div className="auth-field">
            <label className="fl fl-required" htmlFor="password">
              Contraseña
            </label>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <Password
                  // `id` va al contenedor; el <label htmlFor> debe apuntar al input.
                  inputId="password"
                  autoComplete="current-password"
                  // `feedback={false}` quita la barra de fortaleza; `toggleMask` muestra el
                  // ojo. El ancho y el centrado del ojo se resuelven en theme.css.
                  feedback={false}
                  toggleMask
                  invalid={!!errors.password}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            <div className="fe">{errors.password?.message}</div>
          </div>

          <Button
            type="submit"
            label={isSubmitting ? "Entrando…" : "Entrar"}
            disabled={isSubmitting}
            loading={isSubmitting}
            style={{ width: "100%" }}
          />
        </form>
      </div>
    </main>
  );
}
