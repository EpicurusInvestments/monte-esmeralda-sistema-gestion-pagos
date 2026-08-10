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
import { PublicOnly, RequireAuth, RequireCapability } from "@/app/guards";
import { LoginPage } from "@/app/pages/LoginPage";
import { MigrationPlaceholderPage } from "@/app/pages/MigrationPlaceholderPage";
import { AdministracionPage } from "@/modules/administracion/pages/AdministracionPage";
import { ConceptosPage } from "@/modules/conceptos/pages/ConceptosPage";
import { ProveedoresPage } from "@/modules/proveedores/pages/ProveedoresPage";
import { AprobacionesFinancierasPage } from "@/modules/solicitudes/pages/AprobacionesFinancierasPage";
import { BandejaAprobacionesPage } from "@/modules/solicitudes/pages/BandejaAprobacionesPage";
import { SolicitudEditarPage } from "@/modules/solicitudes/pages/SolicitudEditarPage";
import { SolicitudNuevaPage } from "@/modules/solicitudes/pages/SolicitudNuevaPage";
import { SolicitudesPage } from "@/modules/solicitudes/pages/SolicitudesPage";
import { canManageUsers } from "@/shared/lib/nav";

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
      { path: "solicitudes/nueva", element: <SolicitudNuevaPage /> },
      { path: "solicitudes/:id/editar", element: <SolicitudEditarPage /> },
      { path: "aprobaciones", element: <BandejaAprobacionesPage /> },
      { path: "aprobaciones-financieras", element: <AprobacionesFinancierasPage /> },
      {
        // Solo `user:manage` (Admin). Sin la capacidad se explica el bloqueo en lugar de
        // rebotar en silencio (ver `RequireCapability`).
        path: "administracion",
        element: (
          <RequireCapability can={canManageUsers}>
            <AdministracionPage />
          </RequireCapability>
        ),
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
