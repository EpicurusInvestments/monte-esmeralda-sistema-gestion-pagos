/** Layout del área privada: header (usuario + logout) + sidebar por rol + contenido.
 *
 * Usa las clases del patrón de pantalla (`shared/ui/theme.css`). El sidebar ya filtra con
 * `navForRole(role)` de `nav.ts` (espejo de `permissions.py`), pero las entradas AÚN no
 * enlazan: sus pantallas se migran en incrementos posteriores, así que se muestran con
 * `.side-item.pending`. Al montar cada pantalla, convertirlas en <Link> y quitar `pending`
 * (el cálculo de `active` contra la ruta actual ya está listo).
 */

import { Button } from "primereact/button";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/shared/lib/auth";
import { ROLE_LABELS } from "@/shared/lib/labels";
import { navForRole } from "@/shared/lib/nav";

/** Iniciales para el avatar ("Ana Tesorería" → "AT"). */
function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // El guard `RequireAuth` garantiza sesión; esto es solo para satisfacer el tipado.
  if (!user) return null;

  const items = navForRole(user.role);

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="logo">
          MONTE<span>ESMERALDA</span>
        </div>
        <div className="header-spacer" />
        <div className="user-chip">
          <span className="user-avatar" aria-hidden="true">
            {initials(user.full_name)}
          </span>
          <span>
            <span className="user-name">{user.full_name}</span>
            <span className="user-role">{ROLE_LABELS[user.role]}</span>
          </span>
        </div>
        <Button
          label="Salir"
          icon="pi pi-sign-out"
          outlined
          size="small"
          onClick={onLogout}
        />
      </header>

      <div className="app-body">
        <nav className="sidebar" aria-label="Menú principal">
          <div className="side-section">
            <div className="side-title">Navegación</div>
            {items.map((item) => {
              const active = pathname === item.href;
              return (
                <div
                  key={item.href}
                  className={`side-item pending${active ? " active" : ""}`}
                  title="Pantalla por migrar"
                  aria-disabled="true"
                >
                  {item.label}
                </div>
              );
            })}
          </div>
        </nav>

        <main className="main">
          <div className="main-pane">{children}</div>
        </main>
      </div>
    </div>
  );
}
