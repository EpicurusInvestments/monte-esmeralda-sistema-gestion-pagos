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
import { Link, useLocation, useNavigate } from "react-router-dom";

import logoMonteEsmeralda from "@/assets/logo-monte-esmeralda.png";
import { useAuth } from "@/shared/lib/auth";
import { ROLE_LABELS } from "@/shared/lib/labels";
import { estaMontada } from "@/shared/lib/mountedRoutes";
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
        <Link to="/" className="logo" aria-label="Inicio">
          <img
            className="logo-img"
            src={logoMonteEsmeralda}
            alt="Monte Esmeralda"
          />
        </Link>
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
              // Solo las pantallas ya migradas navegan; el resto queda visible pero inerte.
              return estaMontada(item.href) ? (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`side-item${active ? " active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ) : (
                <div
                  key={item.href}
                  className="side-item pending"
                  title="Pantalla por migrar"
                  aria-disabled="true"
                >
                  {item.label}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Cada pantalla arma su propio layout dentro de `.main` (cat-header + toolbar +
            split, o un `.main-pane` si es contenido simple con scroll). */}
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
