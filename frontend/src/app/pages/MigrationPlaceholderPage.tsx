/** Contenido de la ruta raíz hasta que exista el Dashboard.
 *
 * Las pantallas del Paquete 1 ya están migradas y se llega a ellas por el menú; lo que falta
 * aquí es el **tablero** con métricas y gráficos, que depende de los datos de tesorería y flujo
 * de efectivo (Paquete 2, registrado en `docs/BACKLOG.md`). Cada rol aterriza en su pantalla de
 * inicio (`ROLE_HOME`), así que esta ruta se ve poco: solo al entrar a "/" a propósito.
 */

export function MigrationPlaceholderPage() {
  return (
    <div className="main-pane">
      <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Monte Esmeralda</h1>
      <p style={{ color: "var(--text2)", marginTop: "0.75rem" }}>
        Sistema de Gestión de Pagos y Flujo de Efectivo. Usa el menú de la izquierda para
        entrar a Solicitudes, las bandejas de aprobación, Proveedores o los catálogos.
      </p>
      <p style={{ color: "var(--text3)", marginTop: "0.5rem", fontSize: "var(--fs-sm)" }}>
        Aquí irá el tablero con métricas y gráficos cuando el Paquete 2 aporte los datos de
        tesorería y flujo de efectivo.
      </p>
    </div>
  );
}
