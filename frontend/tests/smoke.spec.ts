import { test, expect, Page } from "@playwright/test";

// These smoke tests require the seeded backend and the frontend dev server.
// Credentials come from the backend seed (app/seed.py).

const USERS = {
  field_admin: { email: "campo@monteesmeralda.mx", password: "field123" },
  supervisor: { email: "supervisor@monteesmeralda.mx", password: "supervisor123" },
  cfo: { email: "cfo@monteesmeralda.mx", password: "cfo123" },
};

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: /Iniciar sesión/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"));
}

test("login as field admin lands on capture screen", async ({ page }) => {
  await login(page, USERS.field_admin.email, USERS.field_admin.password);
  await expect(page.getByText("Capturar Solicitud de Pago")).toBeVisible();
});

test("field admin can create and submit a solicitud, then see audit trail", async ({
  page,
}) => {
  await login(page, USERS.field_admin.email, USERS.field_admin.password);
  await page.goto("/solicitudes/nueva");

  // Pick first available supplier.
  await page.waitForSelector("select");
  const supplierSelect = page.locator("select").nth(1); // 0 = tipo, 1 = proveedor
  const options = await supplierSelect.locator("option").all();
  expect(options.length).toBeGreaterThan(1);
  await supplierSelect.selectOption({ index: 1 });

  await page.fill("textarea", "Compra de prueba E2E");
  await page.fill('input[type="number"]', "1234.56");

  // Attach a file.
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "factura.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 smoke test"),
  });

  await page.getByRole("button", { name: /Crear solicitud/i }).click();
  await page.waitForURL(/\/solicitudes\/[0-9a-f-]+$/);

  // Submit to supervisor.
  await page.getByRole("button", { name: /Enviar a revisión/i }).click();
  await expect(page.getByText("Enviada")).toBeVisible();

  // Audit timeline shows creation + submission.
  await expect(page.getByText("Historial de auditoría")).toBeVisible();
  await expect(page.getByText("Creación")).toBeVisible();
});

test("supervisor inbox lists submitted requests", async ({ page }) => {
  await login(page, USERS.supervisor.email, USERS.supervisor.password);
  await expect(
    page.getByRole("heading", { name: "Bandeja de Aprobaciones" })
  ).toBeVisible();
});

test("cfo inbox renders", async ({ page }) => {
  await login(page, USERS.cfo.email, USERS.cfo.password);
  await expect(
    page.getByRole("heading", { name: "Aprobaciones Financieras" })
  ).toBeVisible();
});

test("concept catalog shows hierarchy with headers and leaves", async ({ page }) => {
  await login(page, USERS.field_admin.email, USERS.field_admin.password);
  await page.goto("/conceptos");
  await expect(page.getByText("Catálogo de Conceptos de Flujo")).toBeVisible();
  await expect(page.getByText("EGRESOS — COSTOS").first()).toBeVisible();
  await expect(page.getByText("Edificación").first()).toBeVisible();
});
