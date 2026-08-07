/** Contenido temporal de la ruta raíz mientras se migran las pantallas reales. */

export function MigrationPlaceholderPage() {
  return (
    <div className="main-pane">
      <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Frontend en migración</h1>
      <p style={{ color: "#6b7280", marginTop: "0.75rem" }}>
        Andamiaje del Frente 3 (Vite + React + TypeScript + PrimeReact + TanStack Query +
        React Hook Form + Zod). Las pantallas se migran en incrementos posteriores; el
        frontend anterior queda como referencia en <code>legacy-frontend/</code>.
      </p>
    </div>
  );
}
