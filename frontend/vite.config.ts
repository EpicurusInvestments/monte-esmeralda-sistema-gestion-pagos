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
    // `forks` en vez del pool de hilos por defecto: con jsdom + PrimeReact (que inyecta su
    // CSS en tiempo de ejecución) los workers de hilos morían de forma intermitente con
    // "Worker exited unexpectedly". Cada archivo corre en su propio proceso y es estable.
    pool: "forks",
  },
});
