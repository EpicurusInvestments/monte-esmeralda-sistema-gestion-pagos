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
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h1 style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>Iniciar sesión</h1>
        <p style={{ color: "#6b7280", marginTop: 0, marginBottom: "1.5rem" }}>
          Gestión de Pagos y Flujo de Efectivo — Monte Esmeralda
        </p>

        {formError && (
          <div style={{ marginBottom: "1rem" }}>
            <Message severity="error" text={formError} />
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="email" style={{ display: "block", marginBottom: "0.375rem" }}>
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
                  style={{ width: "100%" }}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
            {errors.email && (
              <small style={{ color: "#b91c1c" }}>{errors.email.message}</small>
            )}
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="password" style={{ display: "block", marginBottom: "0.375rem" }}>
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
                  feedback={false}
                  toggleMask
                  invalid={!!errors.password}
                  style={{ width: "100%" }}
                  inputStyle={{ width: "100%" }}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            {errors.password && (
              <small style={{ color: "#b91c1c" }}>{errors.password.message}</small>
            )}
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
