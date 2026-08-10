/** Ancho ajustable del panel de detalle: rango, teclado y persistencia.
 *
 * El arrastre con puntero no se prueba aquí: jsdom no implementa `PointerEvent` ni
 * `setPointerCapture`, así que la prueba mediría el mock, no el comportamiento. La lógica
 * de acotado y de guardado sí queda cubierta por la vía de teclado, que comparte el mismo
 * `aplicar()`.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";

import { useResizableDetail } from "@/shared/lib/useResizableDetail";
import { DetailResizeHandle } from "@/shared/ui/DetailResizeHandle";

/** En jsdom no hay hoja de estilos: `--detail-width` no se resuelve y el hook cae al
 *  respaldo de 420px, que es el mismo valor del token en `theme.css`. */
const BASE = 420;
const MAX = BASE + 200;

function Harness() {
  const detalle = useResizableDetail();
  return (
    <div className="split">
      <div className="list-pane" />
      <DetailResizeHandle {...detalle.handleProps} />
      <aside className="detail-pane" style={{ width: detalle.width }} data-testid="pane" />
    </div>
  );
}

function agarre() {
  return screen.getByRole("separator", { name: "Ajustar ancho del panel de detalle" });
}

function anchoPanel(): number {
  return Number.parseFloat(screen.getByTestId("pane").style.width);
}

beforeEach(() => {
  window.localStorage.clear();
});

test("arranca en el ancho por defecto y expone el rango", () => {
  render(<Harness />);

  expect(anchoPanel()).toBe(BASE);
  expect(agarre().getAttribute("aria-valuemin")).toBe(String(BASE));
  expect(agarre().getAttribute("aria-valuemax")).toBe(String(MAX));
  expect(agarre().getAttribute("aria-valuenow")).toBe(String(BASE));
});

test("las flechas ensanchan y angostan, y el valor queda acotado al rango", () => {
  render(<Harness />);

  // ← ensancha (el agarre está a la izquierda del panel).
  fireEvent.keyDown(agarre(), { key: "ArrowLeft" });
  expect(anchoPanel()).toBe(BASE + 16);

  // → devuelve al mínimo y no baja de ahí: el panel nunca se hace más angosto que su
  // ancho de diseño.
  fireEvent.keyDown(agarre(), { key: "ArrowRight" });
  fireEvent.keyDown(agarre(), { key: "ArrowRight" });
  expect(anchoPanel()).toBe(BASE);

  // Fin/Inicio saltan a los extremos; el tope es +200px.
  fireEvent.keyDown(agarre(), { key: "End" });
  expect(anchoPanel()).toBe(MAX);
  fireEvent.keyDown(agarre(), { key: "ArrowLeft" });
  expect(anchoPanel()).toBe(MAX);
  fireEvent.keyDown(agarre(), { key: "Home" });
  expect(anchoPanel()).toBe(BASE);
});

test("el ancho se recuerda entre montajes", () => {
  const { unmount } = render(<Harness />);
  fireEvent.keyDown(agarre(), { key: "End" });
  expect(window.localStorage.getItem("me.detailPaneWidth")).toBe(String(MAX));
  unmount();

  render(<Harness />);
  expect(anchoPanel()).toBe(MAX);
});

test("una preferencia guardada fuera de rango se acota al montar", () => {
  window.localStorage.setItem("me.detailPaneWidth", "5000");
  render(<Harness />);

  expect(anchoPanel()).toBe(MAX);
});
