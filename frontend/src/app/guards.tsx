/** Guards de ruta.
 *
 * `RequireAuth`  → protege el área privada: sin sesión manda a /login.
 * `PublicOnly`   → para /login: con sesión activa manda a la home del rol.
 *
 * Ambos esperan a que `loading` termine antes de decidir, para que al recargar la página con
 * un token válido NO se vea un parpadeo hacia /login mientras se revalida contra /auth/me.
 */

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/shared/lib/auth";
import { resolveRoleHome } from "@/shared/lib/roleHome";
import { FullPageLoader } from "@/shared/ui/FullPageLoader";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader label="Validando sesión…" />;
  if (!user) {
    // `from` queda disponible para volver al destino original cuando existan más rutas.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <FullPageLoader label="Validando sesión…" />;
  if (user) return <Navigate to={resolveRoleHome(user.role)} replace />;
  return <>{children}</>;
}
