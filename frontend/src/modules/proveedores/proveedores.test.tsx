/** Pruebas del módulo Proveedores (api mockeado): lista, detalle con cumplimientos
 * anidados, y el RBAC de UI (editar proveedor vs. registrar cumplimiento, que son
 * capacidades DISTINTAS con roles distintos).
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";

import { Providers } from "@/app/providers";
import { routes } from "@/app/router";
import { api, getToken } from "@/shared/lib/api";
import type { Clearance, Supplier, User } from "@/shared/lib/types";

vi.mock("@/shared/lib/api", () => {
  class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return {
    ApiError,
    getToken: vi.fn(),
    // `auth.tsx` registra aquí el handler de sesión expirada (interceptor 401).
    setOnUnauthorized: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    api: {
      login: vi.fn(),
      me: vi.fn(),
      listSuppliers: vi.fn(),
      createSupplier: vi.fn(),
      updateSupplier: vi.fn(),
      listClearances: vi.fn(),
      createClearance: vi.fn(),
    },
  };
});

const ADMIN: User = {
  id: "u-admin",
  email: "admin@monteesmeralda.mx",
  full_name: "Administrador del Sistema",
  role: "admin",
  is_active: true,
};

/** Admin de Campo: SÍ tiene supplier:create/edit, pero NO clearance:create. */
const CAMPO: User = {
  id: "u-campo",
  email: "campo@monteesmeralda.mx",
  full_name: "Fabián Campo",
  role: "field_admin",
  is_active: true,
};

/** Supervisor: solo supplier:view → todo en solo lectura. */
const SUPERVISOR: User = {
  id: "u-sup",
  email: "supervisor@monteesmeralda.mx",
  full_name: "Sofía Supervisora",
  role: "supervisor",
  is_active: true,
};

function proveedor(over: Partial<Supplier> & Pick<Supplier, "id" | "legal_name">): Supplier {
  return {
    rfc: null,
    contact_name: null,
    email: null,
    phone: null,
    bank_name: null,
    bank_account: null,
    clabe: null,
    status: "active",
    created_at: "2026-01-10T12:00:00Z",
    updated_at: "2026-01-10T12:00:00Z",
    clearance: {
      has_record: false,
      status: null,
      effective_status: "none",
      valid_until: null,
      is_expired: false,
    },
    ...over,
  };
}

const PROVEEDORES: Supplier[] = [
  proveedor({
    id: "s-1",
    legal_name: "Aceros del Bajío S.A. de C.V.",
    rfc: "ABA120315XY9",
    contact_name: "Luis Aguirre",
    email: "luis@aceros.mx",
    clearance: {
      has_record: true,
      status: "cleared",
      effective_status: "cleared",
      valid_until: "2026-12-31",
      is_expired: false,
    },
  }),
  proveedor({
    id: "s-2",
    legal_name: "Cementos Peñón",
    rfc: "CPE050101AB1",
    clearance: {
      has_record: true,
      status: "cleared",
      effective_status: "expired",
      valid_until: "2025-01-01",
      is_expired: true,
    },
  }),
  proveedor({ id: "s-3", legal_name: "Inactivo S.A.", status: "inactive" }),
];

const CUMPLIMIENTOS: Clearance[] = [
  {
    id: "cl-1",
    supplier_id: "s-1",
    status: "cleared",
    clearance_date: "2026-01-05",
    valid_until: "2026-12-31",
    compliance_reference: "REV-2026-01",
    notes: "Documentación completa.",
    created_by: "u-admin",
    created_at: "2026-01-05T10:00:00Z",
  },
];

function renderApp(initialPath: string) {
  function AppRoutes() {
    return useRoutes(routes);
  }
  return render(
    <Providers>
      <MemoryRouter initialEntries={[initialPath]}>
        <AppRoutes />
      </MemoryRouter>
    </Providers>,
  );
}

function sesion(user: User) {
  vi.mocked(getToken).mockReturnValue("token");
  vi.mocked(api.me).mockResolvedValue(user);
}

function panelDetalle() {
  const el = document.querySelector(".detail-pane");
  if (!el) throw new Error("No se encontró el panel de detalle");
  return within(el as HTMLElement);
}

beforeEach(() => {
  vi.mocked(getToken).mockReturnValue(null);
  vi.mocked(api.me).mockReset();
  vi.mocked(api.listSuppliers).mockReset();
  vi.mocked(api.listClearances).mockReset();
  vi.mocked(api.createClearance).mockReset();
  vi.mocked(api.listSuppliers).mockResolvedValue(PROVEEDORES);
  vi.mocked(api.listClearances).mockResolvedValue(CUMPLIMIENTOS);
});

test("la lista renderiza los proveedores con su badge de cumplimiento", async () => {
  sesion(ADMIN);
  renderApp("/proveedores");

  expect(await screen.findByText("Aceros del Bajío S.A. de C.V.")).toBeTruthy();
  expect(screen.getByText("ABA120315XY9")).toBeTruthy();
  expect(screen.getByText("Cementos Peñón")).toBeTruthy();

  // Badges derivados de effective_status (vigente vs. vencido).
  expect(screen.getAllByText("Cumplimiento vigente").length).toBeGreaterThan(0);
  expect(screen.getByText("Cumplimiento vencido")).toBeTruthy();

  // El filtro por defecto es "Activos": el inactivo no aparece.
  expect(screen.queryByText("Inactivo S.A.")).toBeNull();
  expect(screen.getByText("2 de 3")).toBeTruthy();
});

test("seleccionar un proveedor abre el detalle con la sección de cumplimiento", async () => {
  sesion(ADMIN);
  renderApp("/proveedores");

  expect(
    await screen.findByText("Selecciona un proveedor para ver su detalle y su cumplimiento."),
  ).toBeTruthy();

  fireEvent.click(await screen.findByText("Aceros del Bajío S.A. de C.V."));

  // Se espera al conteo, no a "Datos bancarios": ese se pinta de inmediato, mientras que
  // los cumplimientos son una segunda consulta.
  await waitFor(() => {
    expect(panelDetalle().getByText("Cumplimiento (1)")).toBeTruthy();
  });
  const panel = panelDetalle();
  expect(panel.getByText("Datos bancarios")).toBeTruthy();
  expect(panel.getByText("REV-2026-01", { exact: false })).toBeTruthy();
  expect(panel.getByText("Documentación completa.")).toBeTruthy();
  expect(api.listClearances).toHaveBeenCalledWith("s-1");
});

test("con clearance:create (Admin) aparece el formulario inline de cumplimiento", async () => {
  sesion(ADMIN);
  renderApp("/proveedores");

  fireEvent.click(await screen.findByText("Aceros del Bajío S.A. de C.V."));
  await waitFor(() => expect(panelDetalle().getByText("Cumplimiento (1)")).toBeTruthy());

  fireEvent.click(panelDetalle().getByRole("button", { name: "+ Registrar" }));

  expect(await screen.findByText("Registrar cumplimiento")).toBeTruthy();
  expect(panelDetalle().getByLabelText("Resultado")).toBeTruthy();
  expect(panelDetalle().getByLabelText("Referencia")).toBeTruthy();
});

test("sin clearance:create no aparece el form inline, aunque sí se pueda editar", async () => {
  // Admin de Campo: supplier:create/edit SÍ, clearance:create NO.
  sesion(CAMPO);
  renderApp("/proveedores");

  expect(await screen.findByText("+ Nuevo proveedor")).toBeTruthy();

  fireEvent.click(screen.getByText("Aceros del Bajío S.A. de C.V."));
  await waitFor(() => expect(panelDetalle().getByText("Cumplimiento (1)")).toBeTruthy());

  // Puede editar el proveedor…
  expect(panelDetalle().getByRole("button", { name: "Editar" })).toBeTruthy();
  // …pero no registrar cumplimiento.
  expect(panelDetalle().queryByRole("button", { name: "+ Registrar" })).toBeNull();
});

test("sin supplier:edit todo queda en solo lectura", async () => {
  sesion(SUPERVISOR);
  renderApp("/proveedores");

  expect(await screen.findByText("Aceros del Bajío S.A. de C.V.")).toBeTruthy();
  expect(screen.queryByText("+ Nuevo proveedor")).toBeNull();

  fireEvent.click(screen.getByText("Aceros del Bajío S.A. de C.V."));
  await waitFor(() => expect(panelDetalle().getByText("Cumplimiento (1)")).toBeTruthy());

  expect(panelDetalle().queryByRole("button", { name: "Editar" })).toBeNull();
  expect(panelDetalle().queryByRole("button", { name: "+ Registrar" })).toBeNull();
});

test("el filtro de cumplimiento usa effective_status", async () => {
  sesion(ADMIN);
  renderApp("/proveedores");

  await screen.findByText("Aceros del Bajío S.A. de C.V.");
  fireEvent.click(screen.getByRole("button", { name: "Vencido" }));

  await waitFor(() => {
    expect(screen.queryByText("Aceros del Bajío S.A. de C.V.")).toBeNull();
  });
  expect(screen.getByText("Cementos Peñón")).toBeTruthy();
  expect(screen.getByText("1 de 3")).toBeTruthy();
});

test("el sidebar enlaza Proveedores y lo marca activo", async () => {
  sesion(ADMIN);
  renderApp("/proveedores");

  const menu = await screen.findByRole("navigation", { name: "Menú principal" });
  const enlace = within(menu).getByRole("link", { name: "Proveedores" });
  expect(enlace.getAttribute("href")).toBe("/proveedores");
  expect(enlace.getAttribute("aria-current")).toBe("page");
});
