"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/nav";
import { ApiError } from "@/lib/api";
import { ErrorBox } from "@/components/ui";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(ROLE_HOME[user.role]);
  }, [user, loading, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const u = await login(email.trim().toLowerCase(), password);
      router.replace(ROLE_HOME[u.role]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>Monte Esmeralda</h1>
        <p className="subtitle">Sistema de Solicitudes de Pago</p>
        <ErrorBox message={error} />
        <div className="field">
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button type="submit" disabled={submitting} style={{ width: "100%", justifyContent: "center" }}>
          {submitting ? "Ingresando…" : "Iniciar sesión"}
        </button>
        <div className="seed-hint">
          Usuarios de prueba (contraseña entre paréntesis):
          <br />
          <code>campo@monteesmeralda.mx</code> (field123) · Admin de Campo
          <br />
          <code>supervisor@monteesmeralda.mx</code> (supervisor123)
          <br />
          <code>cfo@monteesmeralda.mx</code> (cfo123) · <code>admin@monteesmeralda.mx</code> (admin123)
        </div>
      </form>
    </div>
  );
}
