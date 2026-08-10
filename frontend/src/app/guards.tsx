/** Guards de ruta.
 *
 * `RequireAuth`       → protege el área privada: sin sesión manda a /login.
 * `PublicOnly`        → para /login: con sesión activa manda a la home del rol.
 * `RequireCapability` → protege una pantalla por capacidad de rol.
 *
 * Los dos primeros esperan a que `loading` termine antes de decidir, para que al recargar la
 * página con un token válido NO se vea un parpadeo hacia /login mientras se revalida contra
 * /auth/me.
 */

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/shared/lib/auth";
import { resolveRoleHome } from "@/shared/lib/roleHome";
import type { Role } from "@/shared/lib/types";
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

/** Pantalla restringida por capacidad de rol (espejo de `permissions.py`).
 *
 * Se usa DENTRO del área privada, así que la sesión ya está resuelta por `RequireAuth`. En
 * lugar de redirigir en silencio se explica el bloqueo: quien llega aquí lo hizo escribiendo
 * la URL (la entrada del sidebar no le aparece), y un rebote sin mensaje se lee como un error
 * de la app. El backend responde 403 igual: esto es solo UX.
 */
export function RequireCapability({
  can,
  children,
}: {
  can: (role: Role) => boolean;
  children: ReactNode;
}) {
  const { user } = useAuth();

  if (!user) return null; // Inalcanzable: `RequireAuth` ya cubrió el caso sin sesión.
  if (!can(user.role)) {
    return (
      <div className="main-pane">
        <div className="state-msg error">
          No tienes permiso para ver esta pantalla.
          <div style={{ marginTop: 6 }}>
            <span className="fv muted">
              Si crees que deberías tenerlo, pídelo a un administrador.
            </span>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
