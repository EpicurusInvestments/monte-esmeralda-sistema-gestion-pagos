/** Layout base: header + sidebar + área de contenido.
 *
 * Andamiaje del Frente 3. El sidebar lista los destinos de `nav.ts` (el mismo que espeja
 * `permissions.py`), pero TODAVÍA no filtra por rol ni navega: el filtrado por rol llega
 * con `auth.tsx` y cada destino se habilita cuando su pantalla se migre.
 */

import type { ReactNode } from "react";

import { NAV_ITEMS } from "@/shared/lib/nav";

export function AppLayout({ children }: { children: ReactNode }) {
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
        <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
          sesión pendiente (Frente 3)
        </span>
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
            {NAV_ITEMS.map((item) => (
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
