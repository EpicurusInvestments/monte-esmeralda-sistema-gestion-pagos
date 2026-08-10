/** RBAC visto desde el navegador. El backend valida siempre; esto comprueba que la UI no
 *  ofrezca —ni deje entrar por URL— a lo que el rol no puede.
 */

import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test("sin user:manage no hay entrada de Administración ni acceso por URL", async ({ page }) => {
  await login(page, "ingenieria");

  const menu = page.getByRole("navigation", { name: "Menú principal" });
  await expect(menu).toBeVisible();
  await expect(menu.getByText("Administración")).toHaveCount(0);

  // Escribiendo la ruta a mano, el guard explica el bloqueo (no rebota en silencio).
  await page.goto("/administracion");
  await expect(page.getByText("No tienes permiso para ver esta pantalla.")).toBeVisible();
});

test("el Admin sí ve Administración y llega a la matriz de permisos", async ({ page }) => {
  await login(page, "admin");
  await expect(page).toHaveURL(/\/administracion$/);

  const menu = page.getByRole("navigation", { name: "Menú principal" });
  await expect(menu.getByRole("link", { name: "Administración" })).toBeVisible();

  await page.getByRole("button", { name: "Roles y permisos" }).click();
  const panel = page.locator(".detail-pane");
  await expect(panel.locator(".dh-name")).toHaveText("Roles y permisos");
  // Los 8 roles del sistema, en solo consulta.
  await expect(panel.locator(".rp-role")).toHaveCount(8);
  await expect(panel.getByRole("checkbox")).toHaveCount(0);
});

test("Tesorería solo ve solicitudes que ya pasaron revisión", async ({ page }) => {
  await login(page, "tesoreria");
  await expect(page).toHaveURL(/\/solicitudes$/);

  // Puede que no haya nada aprobado todavía; lo que importa es que NO aparezca otro estado.
  const filas = page.locator(".list-pane tbody tr");
  const total = await filas.count();

  const permitidos = ["Aprobada por Supervisor", "Aprobada por CFO", "Diferida"];
  for (let i = 0; i < total; i++) {
    const estado = (await filas.nth(i).locator(".badge").first().textContent())?.trim() ?? "";
    expect(permitidos).toContain(estado);
  }

  // Tampoco puede capturar.
  await expect(page.getByRole("button", { name: "+ Nueva solicitud" })).toHaveCount(0);
});
