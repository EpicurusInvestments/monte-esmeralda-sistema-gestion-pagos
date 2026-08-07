/** Layout del área privada: header (usuario + logout) + sidebar por rol + contenido.
 *
 * El sidebar ya filtra con `navForRole(role)` de `nav.ts` (espejo de `permissions.py`), pero
 * las entradas AÚN no enlazan: sus pantallas se migran en incrementos posteriores, así que
 * se muestran en estado "por migrar". Al montar cada pantalla, convertirlas en <Link>.
 */

import { Button } from "primereact/button";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/shared/lib/auth";
import { ROLE_LABELS } from "@/shared/lib/labels";
import { navForRole } from "@/shared/lib/nav";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // El guard `RequireAuth` garantiza sesión; esto es solo para satisfacer el tipado.
  if (!user) return null;

  const items = navForRole(user.role);

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "0.75rem 1.25rem",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <strong>Gestión de Pagos y Flujo de Efectivo — Monte Esmeralda</strong>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ textAlign: "right", lineHeight: 1.3 }}>
            <span style={{ display: "block" }}>{user.full_name}</span>
            <small style={{ color: "#6b7280" }}>{ROLE_LABELS[user.role]}</small>
          </span>
          <Button
            label="Salir"
            icon="pi pi-sign-out"
            severity="secondary"
            outlined
            size="small"
            onClick={onLogout}
          />
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <nav
          aria-label="Menú principal"
          style={{
            width: 260,
            flexShrink: 0,
            padding: "1rem",
            borderRight: "1px solid #e5e7eb",
            background: "#fafafa",
          }}
        >
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {items.map((item) => (
              <li
                key={item.href}
                style={{
                  padding: "0.5rem 0.25rem",
                  color: "#9ca3af",
                  fontSize: "0.9375rem",
                }}
                title="Pantalla por migrar"
              >
                {item.label}
              </li>
            ))}
          </ul>
        </nav>

        <main style={{ flex: 1, padding: "1.5rem" }}>{children}</main>
      </div>
    </div>
  );
}
