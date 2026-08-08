/** Router de la app (react-router-dom 6).
 *
 *  /login  → público (con sesión activa redirige a la home del rol).
 *  /       → privado (RequireAuth) con el AppLayout; las pantallas cuelgan como hijas.
 *
 *  Al migrar una pantalla: crear su módulo en `src/modules/<modulo>/`, agregarla como hija
 *  de "/" aquí, y sumar su ruta a `RUTAS_MONTADAS` en `shared/lib/roleHome.ts` si es una
 *  home de rol.
 *
 *  Se exporta `routes` (además del router) para poder montarlo con `createMemoryRouter` en
 *  las pruebas.
 */

import { Outlet, createBrowserRouter } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

import { AppLayout } from "@/app/AppLayout";
import { PublicOnly, RequireAuth } from "@/app/guards";
import { LoginPage } from "@/app/pages/LoginPage";
import { MigrationPlaceholderPage } from "@/app/pages/MigrationPlaceholderPage";
import { ConceptosPage } from "@/modules/conceptos/pages/ConceptosPage";
import { ProveedoresPage } from "@/modules/proveedores/pages/ProveedoresPage";
import { SolicitudesPage } from "@/modules/solicitudes/pages/SolicitudesPage";

export const routes: RouteObject[] = [
  {
    path: "/login",
    element: (
      <PublicOnly>
        <LoginPage />
      </PublicOnly>
    ),
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout>
          <Outlet />
        </AppLayout>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <MigrationPlaceholderPage /> },
      { path: "conceptos", element: <ConceptosPage /> },
      { path: "proveedores", element: <ProveedoresPage /> },
      { path: "solicitudes", element: <SolicitudesPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
