/// <reference types="vitest" />
import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Alias `@/` → `src/` (mismo patrón que GRC-OIR).
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: "jsdom",
    globals: true,
    // Solo las pruebas de `src/`. Los `*.spec.ts` de `e2e/` son de Playwright: si vitest los
    // recogiera, intentaría ejecutarlos en jsdom y fallarían por el import de @playwright/test.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
