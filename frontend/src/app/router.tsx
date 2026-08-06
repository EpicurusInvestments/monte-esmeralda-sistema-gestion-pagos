/** Router de la app (react-router-dom 6).
 *
 *  /login  → placeholder de autenticación.
 *  /       → layout (header + sidebar) con el placeholder de migración.
 *
 *  Al migrar una pantalla: crear su módulo en `src/modules/<modulo>/` y montar su ruta
 *  aquí, dentro del layout.
 */

import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "@/app/AppLayout";
import { LoginPage } from "@/app/pages/LoginPage";
import { MigrationPlaceholderPage } from "@/app/pages/MigrationPlaceholderPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <AppLayout>
        <MigrationPlaceholderPage />
      </AppLayout>
    ),
  },
]);
