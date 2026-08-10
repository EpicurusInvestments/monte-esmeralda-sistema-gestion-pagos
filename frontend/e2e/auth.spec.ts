/** Autenticación: entrar, salir y el rechazo de credenciales inválidas. */

import { expect, test } from "@playwright/test";

import { USUARIOS, login, logout } from "./helpers";

test("sin sesión, cualquier ruta privada manda al login", async ({ page }) => {
  await page.goto("/solicitudes");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
});

test("credenciales inválidas muestran el error y no crean sesión", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill(USUARIOS.admin.email);
  await page.locator("#password").fill("contrasena-incorrecta");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText("Credenciales inválidas")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Salir" })).toBeHidden();
});

test("login y logout: cada rol aterriza en su pantalla de inicio", async ({ page }) => {
  await login(page, "supervisor");
  // ROLE_HOME del Supervisor.
  await expect(page).toHaveURL(/\/aprobaciones$/);
  await expect(page.locator(".cat-title")).toHaveText("Bandeja de Aprobaciones");
  await expect(page.locator(".user-role")).toHaveText("Supervisor");

  await logout(page);
  await expect(page).toHaveURL(/\/login$/);

  // La sesión quedó realmente cerrada: volver atrás no reabre el área privada.
  await page.goto("/aprobaciones");
  await expect(page).toHaveURL(/\/login$/);
});

test("el Admin de Campo aterriza en la lista de solicitudes y puede capturar", async ({
  page,
}) => {
  await login(page, "campo");
  await expect(page).toHaveURL(/\/solicitudes$/);
  await expect(page.getByRole("button", { name: "+ Nueva solicitud" })).toBeVisible();
});
