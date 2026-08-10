/** Utilidades compartidas por los smoke e2e.
 *
 * Todo lo que sabe de la UI (cómo se abre un Dropdown de PrimeReact, cómo se inicia sesión,
 * dónde vive el folio) está aquí, para que los tests se lean como el recorrido del usuario y no
 * como una lista de selectores.
 */

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Usuarios semilla (ver `backend/app/seed.py`). Contraseñas de desarrollo, no de producción. */
export const USUARIOS = {
  admin: { email: "admin@monteesmeralda.mx", password: "admin123" },
  campo: { email: "campo@monteesmeralda.mx", password: "field123" },
  supervisor: { email: "supervisor@monteesmeralda.mx", password: "supervisor123" },
  cfo: { email: "cfo@monteesmeralda.mx", password: "cfo123" },
  tesoreria: { email: "tesoreria@monteesmeralda.mx", password: "treasurer123" },
  ingenieria: { email: "ingeniero@monteesmeralda.mx", password: "engineer123" },
} as const;

export type Usuario = keyof typeof USUARIOS;

/** Inicia sesión y espera a que el área privada esté montada (el header con «Salir»). */
export async function login(page: Page, quien: Usuario): Promise<void> {
  const { email, password } = USUARIOS[quien];
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("button", { name: "Salir" })).toBeVisible();
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
}

/** Elige una opción de un `Dropdown` de PrimeReact por su texto.
 *
 * El `inputId` va a un input oculto que NO abre el panel: hay que clicar la raíz `.p-dropdown`.
 * El panel se renderiza en un portal al final del `body`, así que la opción se busca ahí y no
 * dentro del formulario.
 */
export async function elegirDropdown(
  page: Page,
  inputId: string,
  opcion: string | RegExp,
): Promise<void> {
  const raiz = page.locator(`.p-dropdown:has(#${inputId})`);
  await raiz.click();
  const panel = page.locator(".p-dropdown-panel").last();
  await expect(panel).toBeVisible();
  await panel.getByRole("option", { name: opcion }).first().click();
  await expect(panel).toBeHidden();
}

/** Igual que `elegirDropdown`, pero toma la PRIMERA opción disponible (para catálogos cuyo
 *  contenido no queremos fijar en el test: proveedores, conceptos hoja). Devuelve su texto. */
export async function elegirPrimeraOpcion(page: Page, inputId: string): Promise<string> {
  const raiz = page.locator(`.p-dropdown:has(#${inputId})`);
  await raiz.click();
  const panel = page.locator(".p-dropdown-panel").last();
  await expect(panel).toBeVisible();
  const opcion = panel.getByRole("option").first();
  const texto = (await opcion.textContent())?.trim() ?? "";
  await opcion.click();
  await expect(panel).toBeHidden();
  return texto;
}

/** Panel de detalle (columna derecha del patrón lista + detalle). */
export function panelDetalle(page: Page) {
  return page.locator(".detail-pane");
}

/** Folio de la solicitud abierta en el panel de detalle (p. ej. «SP-2026-0007»). */
export async function folioDelDetalle(page: Page): Promise<string> {
  const folio = panelDetalle(page).locator(".dh-name");
  await expect(folio).toBeVisible();
  const texto = (await folio.textContent())?.trim() ?? "";
  expect(texto).toMatch(/^SP-/);
  return texto;
}

/** Fila de la lista por folio (la tabla es un `DataTable` de PrimeReact). */
export function filaPorFolio(page: Page, folio: string) {
  return page.locator(".list-pane tbody tr", { hasText: folio });
}

/** Abre el diálogo de una acción de flujo y confirma. `extra` permite llenar el diálogo
 *  (concepto final, motivo) antes de confirmar. */
export async function accionDeFlujo(
  page: Page,
  accion: string,
  confirmar: string,
  extra?: () => Promise<void>,
): Promise<void> {
  await panelDetalle(page).getByRole("button", { name: accion }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toBeVisible();
  if (extra) await extra();
  await dialogo.getByRole("button", { name: confirmar, exact: true }).click();
  await expect(dialogo).toBeHidden();
}

/** Escribe en un `InputNumber` de PrimeReact.
 *
 * Hace falta el `Control+a` previo: el campo nunca está vacío (arranca formateado en «0.00»),
 * y escribir con el caret al inicio de ese valor NO cambia el número —queda en 0.00 y el
 * formulario rechaza el monto—. Seleccionar todo antes hace que lo escrito lo reemplace.
 */
export async function escribirMonto(page: Page, inputId: string, valor: string): Promise<void> {
  const campo = page.locator(`#${inputId}`);
  await campo.click();
  await campo.press("Control+a");
  await campo.pressSequentially(valor);
}

/** Texto único por corrida, para que los e2e no dependan de una base recién sembrada y se
 *  puedan repetir sin limpiar nada. */
export function marcaDeCorrida(prefijo: string): string {
  const sufijo = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return `${prefijo} ${sufijo}`;
}
