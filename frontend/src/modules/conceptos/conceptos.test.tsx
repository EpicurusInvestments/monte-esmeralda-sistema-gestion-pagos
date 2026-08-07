/** Pruebas del módulo Conceptos. `@/shared/lib/api` está mockeado: se verifica el
 * cableado de la pantalla (lista, selección → detalle, filtros y permisos) sin backend.
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";

import { Providers } from "@/app/providers";
import { routes } from "@/app/router";
import { api, getToken } from "@/shared/lib/api";
import type { Concept, User } from "@/shared/lib/types";

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
    setToken: vi.fn(),
    clearToken: vi.fn(),
    api: {
      login: vi.fn(),
      me: vi.fn(),
      listConcepts: vi.fn(),
      createConcept: vi.fn(),
      updateConcept: vi.fn(),
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

const CONTADOR: User = {
  id: "u-cont",
  email: "contador@monteesmeralda.mx",
  full_name: "Carla Contadora",
  role: "accountant",
  is_active: true,
};

function concepto(over: Partial<Concept> & Pick<Concept, "id" | "code" | "name">): Concept {
  return {
    parent_id: null,
    section: "EGR",
    is_header: false,
    sort_order: 0,
    active: true,
    parent_name: null,
    path: over.name,
    ...over,
  };
}

const CONCEPTOS: Concept[] = [
  concepto({
    id: "c-1",
    code: "EGR-100",
    name: "Costos Directos",
    is_header: true,
    section: "EGR",
    path: "Costos Directos",
  }),
  concepto({
    id: "c-2",
    code: "EGR-110",
    name: "Edificación",
    parent_id: "c-1",
    parent_name: "Costos Directos",
    section: "EGR",
    path: "Costos Directos › Edificación",
  }),
  concepto({
    id: "c-3",
    code: "GAS-200",
    name: "Papelería",
    section: "GAS",
    path: "Papelería",
  }),
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

/** Consultas acotadas al panel derecho. Hace falta porque varios textos (el título de la
 *  pantalla, el `path` del concepto) aparecen a propósito también en el sidebar o en la
 *  fila de la tabla. */
function panelDetalle() {
  const el = document.querySelector(".detail-pane");
  if (!el) throw new Error("No se encontró el panel de detalle");
  return within(el as HTMLElement);
}

beforeEach(() => {
  vi.mocked(getToken).mockReturnValue(null);
  vi.mocked(api.me).mockReset();
  vi.mocked(api.listConcepts).mockReset();
  vi.mocked(api.createConcept).mockReset();
  vi.mocked(api.updateConcept).mockReset();
  vi.mocked(api.listConcepts).mockResolvedValue(CONCEPTOS);
});

test("la lista renderiza una fila por concepto", async () => {
  sesion(ADMIN);
  renderApp("/conceptos");

  // El título de la pantalla (el sidebar también dice "Catálogo de Conceptos").
  expect(
    await screen.findByText("Catálogo de Conceptos", { selector: ".cat-title" }),
  ).toBeTruthy();
  expect(await screen.findByText("EGR-100")).toBeTruthy();
  expect(screen.getByText("Costos Directos")).toBeTruthy();
  expect(screen.getByText("Edificación")).toBeTruthy();
  expect(screen.getByText("Papelería")).toBeTruthy();

  // Encabezado vs hoja y estado se muestran como badges.
  expect(screen.getByText("Encabezado")).toBeTruthy();
  expect(screen.getAllByText("Hoja").length).toBe(2);

  // Por defecto pide solo activos.
  expect(api.listConcepts).toHaveBeenCalledWith({ activeOnly: true });
});

test("seleccionar una fila abre el panel de detalle", async () => {
  sesion(ADMIN);
  renderApp("/conceptos");

  // Sin selección: estado vacío del panel.
  expect(await screen.findByText("Selecciona un concepto para ver su detalle.")).toBeTruthy();

  fireEvent.click(await screen.findByText("Edificación"));

  await waitFor(() => {
    expect(panelDetalle().getByText("Ruta en el catálogo")).toBeTruthy();
  });
  // Campos del detalle (acotados al panel: el path también sale en la fila).
  const panel = panelDetalle();
  expect(panel.getByText("Costos Directos › Edificación")).toBeTruthy();
  expect(panel.getByText("EGRESOS — COSTOS")).toBeTruthy();
  expect(panel.getByText("Hoja — asignable a una Solicitud")).toBeTruthy();
  expect(panel.getByText("Costos Directos")).toBeTruthy(); // concepto padre
});

test("sin concept:edit no aparecen 'Nuevo concepto' ni 'Editar'", async () => {
  sesion(CONTADOR);
  renderApp("/conceptos");

  expect(await screen.findByText("EGR-100")).toBeTruthy();
  expect(screen.queryByText("+ Nuevo concepto")).toBeNull();

  fireEvent.click(screen.getByText("Edificación"));
  await waitFor(() => {
    expect(panelDetalle().getByText("Ruta en el catálogo")).toBeTruthy();
  });
  expect(panelDetalle().queryByRole("button", { name: "Editar" })).toBeNull();
});

test("como admin sí aparece 'Nuevo concepto' y abre el formulario", async () => {
  sesion(ADMIN);
  renderApp("/conceptos");

  const nuevo = await screen.findByText("+ Nuevo concepto");
  fireEvent.click(nuevo);

  expect(await screen.findByText("Nuevo concepto")).toBeTruthy();
  expect(screen.getByLabelText("Código")).toBeTruthy();
  expect(screen.getByLabelText("Nombre")).toBeTruthy();
  expect(screen.getByLabelText("Es encabezado — agrupador, no asignable")).toBeTruthy();
});

test("la búsqueda filtra localmente por código o nombre", async () => {
  sesion(ADMIN);
  renderApp("/conceptos");

  await screen.findByText("EGR-100");
  fireEvent.change(screen.getByLabelText("Buscar concepto"), {
    target: { value: "papel" },
  });

  await waitFor(() => {
    expect(screen.queryByText("Edificación")).toBeNull();
  });
  expect(screen.getByText("Papelería")).toBeTruthy();
  // El contador refleja el filtrado.
  expect(screen.getByText("1 de 3")).toBeTruthy();
});

test("el toggle 'Todos' vuelve a consultar con activeOnly=false", async () => {
  sesion(ADMIN);
  renderApp("/conceptos");

  await screen.findByText("EGR-100");
  fireEvent.click(screen.getByRole("button", { name: "Todos" }));

  await waitFor(() => {
    expect(api.listConcepts).toHaveBeenCalledWith({ activeOnly: false });
  });
});

test("el sidebar enlaza Conceptos y lo marca activo en su ruta", async () => {
  sesion(ADMIN);
  renderApp("/conceptos");

  const menu = await screen.findByRole("navigation", { name: "Menú principal" });
  const enlace = within(menu).getByRole("link", { name: "Catálogo de Conceptos" });
  expect(enlace.getAttribute("href")).toBe("/conceptos");
  expect(enlace.getAttribute("aria-current")).toBe("page");
});
