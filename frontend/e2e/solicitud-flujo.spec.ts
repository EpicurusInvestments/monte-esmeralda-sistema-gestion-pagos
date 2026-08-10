/** Camino feliz punta a punta, cambiando de sesión en cada etapa:
 *
 *   Admin de Campo captura → adjunta → envía
 *   Supervisor asigna concepto hoja y aprueba   (sale de su bandeja)
 *   CFO aprueba                                 (queda «Aprobada por CFO»)
 *
 * El test crea su propia solicitud, con una descripción única por corrida, así que se puede
 * repetir sobre la misma base sin limpiar nada y no depende de lo que haya sembrado.
 */

import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  accionDeFlujo,
  elegirDropdown,
  elegirPrimeraOpcion,
  escribirMonto,
  filaPorFolio,
  folioDelDetalle,
  login,
  logout,
  marcaDeCorrida,
  panelDetalle,
} from "./helpers";

// El paquete es ESM (`"type": "module"`), así que no hay `__dirname`: la ruta del fixture se
// resuelve desde la URL del propio módulo.
const ADJUNTO = fileURLToPath(new URL("./fixtures/comprobante.pdf", import.meta.url));

test("de la captura a la aprobación del CFO", async ({ page }) => {
  const descripcion = marcaDeCorrida("Suministro de acero (e2e)");

  // ── 1. Admin de Campo: captura ───────────────────────────────────────────
  await login(page, "campo");
  await page.getByRole("button", { name: "+ Nueva solicitud" }).click();
  await expect(page.getByRole("heading", { name: "Nueva solicitud de pago" })).toBeVisible();

  await elegirDropdown(page, "request_type", "Factura de proveedor");
  const proveedor = await elegirPrimeraOpcion(page, "supplier_id");
  expect(proveedor).not.toEqual("");
  await page.locator("#description").fill(descripcion);
  await escribirMonto(page, "net_amount", "1500");
  // Se comprueba el monto ANTES de guardar: si no entrara, el fallo apuntaría al campo y no a
  // una redirección que no ocurre.
  await expect(page.locator("#net_amount")).toHaveValue("1,500.00");

  await page.getByRole("button", { name: "Crear borrador" }).click();

  // Vuelve a la lista con la nueva solicitud ya seleccionada.
  await expect(page).toHaveURL(/\/solicitudes\?seleccion=/);
  const folio = await folioDelDetalle(page);
  const detalle = panelDetalle(page);
  await expect(detalle.getByText("Borrador", { exact: true })).toBeVisible();
  await expect(detalle.getByText("$1,500.00")).toBeVisible();

  // ── 2. El envío exige adjunto ────────────────────────────────────────────
  const enviar = detalle.getByRole("button", { name: "Enviar a revisión" });
  await expect(enviar).toBeDisabled();
  await expect(
    detalle.getByText("Para enviar a revisión hace falta al menos un adjunto."),
  ).toBeVisible();

  await detalle.locator("#adjunto-archivo").setInputFiles(ADJUNTO);
  await detalle.getByRole("button", { name: "Subir" }).click();
  await expect(detalle.getByText("Adjuntos (1)")).toBeVisible();
  await expect(detalle.getByText("comprobante.pdf")).toBeVisible();

  // Con el adjunto, la acción se habilita.
  await expect(enviar).toBeEnabled();
  await accionDeFlujo(page, "Enviar a revisión", "Enviar");
  await expect(detalle.getByText("Enviada", { exact: true })).toBeVisible();

  await logout(page);

  // ── 3. Supervisor: concepto final + aprobación ───────────────────────────
  await login(page, "supervisor");
  await expect(page).toHaveURL(/\/aprobaciones$/);

  await filaPorFolio(page, folio).click();
  await expect(panelDetalle(page).getByText(descripcion)).toBeVisible();

  // `supervisorApprove` pide el concepto final dentro del propio diálogo cuando falta; solo
  // se ofrecen hojas del catálogo (el backend rechaza los encabezados).
  await accionDeFlujo(page, "Aprobar (Supervisor)", "Aprobar", async () => {
    const concepto = await elegirPrimeraOpcion(page, "accion-concepto");
    expect(concepto).not.toEqual("");
  });

  // Deja de ser asunto del Supervisor: sale de su bandeja.
  await expect(filaPorFolio(page, folio)).toHaveCount(0);

  await logout(page);

  // ── 4. CFO: aprobación financiera ────────────────────────────────────────
  await login(page, "cfo");
  await expect(page).toHaveURL(/\/aprobaciones-financieras$/);

  await filaPorFolio(page, folio).click();
  await expect(panelDetalle(page).getByText("Aprobada por Supervisor")).toBeVisible();

  await accionDeFlujo(page, "Aprobar (CFO)", "Aprobar");
  await expect(filaPorFolio(page, folio)).toHaveCount(0);

  // ── 5. Estado final y bitácora completa ─────────────────────────────────
  await page.goto("/solicitudes");
  await page.getByLabel("Buscar solicitud").fill(folio);
  await filaPorFolio(page, folio).click();

  const final = panelDetalle(page);
  // Se confirma que el detalle abierto ES el nuestro antes de mirar su bitácora.
  expect(await folioDelDetalle(page)).toBe(folio);
  await expect(final.getByText("Aprobada por CFO")).toBeVisible();

  // La bitácora cuenta el recorrido completo, en orden cronológico (lo más antiguo primero).
  await expect(final.locator(".timeline-action")).toHaveText([
    "Creación",
    "Envío a revisión",
    "Aprobación del Supervisor",
    "Aprobación del CFO",
  ]);
});
