/** Ancho ajustable del panel de detalle: arrastrar el borde izquierdo, acotado al rango, y la
 *  preferencia recordada entre recargas (`localStorage: me.detailPaneWidth`).
 *
 * Es la única prueba del proyecto que ejercita el arrastre real: `useResizableDetail.test.tsx`
 * cubre el teclado y el acotado, pero jsdom no implementa `PointerEvent` ni
 * `setPointerCapture`, así que el arrastre solo se puede verificar en un navegador.
 */

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const BASE = 420; // `--detail-width` del tema
const MAX = BASE + 200;

async function anchoDelPanel(page: Page): Promise<number> {
  const caja = await page.locator(".detail-pane").boundingBox();
  if (!caja) throw new Error("No se encontró el panel de detalle");
  return Math.round(caja.width);
}

/** Arrastra el agarre `dx` px en horizontal (negativo = hacia la izquierda = ensancha). */
async function arrastrar(page: Page, dx: number): Promise<void> {
  const agarre = page.locator(".detail-resizer");
  const caja = await agarre.boundingBox();
  if (!caja) throw new Error("No se encontró el agarre del panel");
  const x = caja.x + caja.width / 2;
  const y = caja.y + caja.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 12 });
  await page.mouse.up();
}

test("el panel se ensancha arrastrando, respeta el rango y recuerda el ancho", async ({
  page,
}) => {
  await page.goto("/login");
  await page.locator("#email").fill("admin@monteesmeralda.mx");
  await page.locator("#password").fill("admin123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("button", { name: "Salir" })).toBeVisible();

  await page.goto("/conceptos");
  await expect(page.locator(".detail-pane")).toBeVisible();
  expect(await anchoDelPanel(page)).toBe(BASE);

  // Hacia la izquierda ensancha.
  await arrastrar(page, -120);
  const ensanchado = await anchoDelPanel(page);
  expect(ensanchado).toBeGreaterThan(BASE);
  expect(ensanchado).toBeLessThanOrEqual(MAX);

  // La preferencia sobrevive a la recarga.
  await page.reload();
  await expect(page.locator(".detail-pane")).toBeVisible();
  expect(await anchoDelPanel(page)).toBe(ensanchado);

  // El tope superior es el ancho por defecto + 200px.
  await arrastrar(page, -600);
  expect(await anchoDelPanel(page)).toBe(MAX);

  // Y nunca se hace más angosto que el ancho de diseño.
  await arrastrar(page, 600);
  expect(await anchoDelPanel(page)).toBe(BASE);
});
