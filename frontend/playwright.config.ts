/** Playwright — smoke end-to-end del frontend Vite.
 *
 * QUÉ HACE FALTA ANTES DE CORRERLOS: el **backend en `:8000`, con `DB_BACKEND=sqlite` y
 * sembrado**. Los e2e crean datos reales (solicitudes, adjuntos, transiciones), así que van
 * SIEMPRE contra la SQLite local, **NUNCA contra AWS/SQL Server**: esa instancia RDS es la base
 * oficial y además está compartida. Ver «Entornos de base de datos» en el README.
 *
 *   cd backend
 *   # .env con DB_BACKEND=sqlite
 *   alembic upgrade head && python -m app.seed
 *   uvicorn app.main:app --reload        # :8000
 *
 *   cd frontend && npm run test:e2e     # levanta Vite solo si no está ya corriendo
 *
 * El frontend lo levanta `webServer` (con `reuseExistingServer`, así que si ya tienes
 * `npm run dev` abierto lo reutiliza en vez de fallar por el puerto ocupado).
 */

import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  // Falla temprano y con instrucciones si el backend no está arriba y sembrado.
  globalSetup: "./e2e/global-setup.ts",
  // Los e2e comparten una sola base SQLite y cambian de sesión: en paralelo se pisarían.
  fullyParallel: false,
  workers: 1,
  // En CI un fallo no debería quedar enmascarado por reintentos infinitos; en local, cero.
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "line" : [["list"]],
  use: {
    baseURL: BASE_URL,
    // Solo se guardan artefactos cuando algo falla: un run verde no deja basura.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
