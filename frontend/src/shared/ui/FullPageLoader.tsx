/** Estado de carga a pantalla completa (usado mientras se revalida la sesión). */

import { ProgressSpinner } from "primereact/progressspinner";

export function FullPageLoader({ label = "Cargando…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
      }}
    >
      <ProgressSpinner style={{ width: 44, height: 44 }} strokeWidth="4" />
      <span style={{ color: "#6b7280" }}>{label}</span>
    </div>
  );
}
