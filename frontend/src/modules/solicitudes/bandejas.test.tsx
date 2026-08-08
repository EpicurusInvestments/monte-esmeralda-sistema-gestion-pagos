/** Pruebas de las bandejas de Supervisor y CFO (api mockeado).
 *
 * Verifica: cada bandeja consulta y lista SOLO su estado, actuar saca la fila de la bandeja,
 * el sidebar enlaza según rol, y la home por rol lleva a su bandeja.
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";

import { Providers } from "@/app/providers";
import { routes } from "@/app/router";
import { api, getToken } from "@/shared/lib/api";
import type { Concept, SolicitudDetail, SolicitudListItem, User } from "@/shared/lib/types";

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
    setOnUnauthorized: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    uploadAttachment: vi.fn(),
    downloadAttachment: vi.fn(),
    api: {
      login: vi.fn(),
      me: vi.fn(),
      listSolicitudes: vi.fn(),
      getSolicitud: vi.fn(),
      listSuppliers: vi.fn(),
      listConcepts: vi.fn(),
      addComment: vi.fn(),
      submit: vi.fn(),
      cancel: vi.fn(),
      assignConcept: vi.fn(),
      supervisorApprove: vi.fn(),
      cfoApprove: vi.fn(),
      defer: vi.fn(),
      reject: vi.fn(),
      requestCorrection: vi.fn(),
    },
  };
});

const usuario = (id: string, role: User["role"], nombre: string): User => ({
  id,
  email: `${id}@monteesmeralda.mx`,
  full_name: nombre,
  role,
  is_active: true,
});

const SUPERVISOR = usuario("u-sup", "supervisor", "Sofía Supervisora");
const CFO = usuario("u-cfo", "cfo", "Cecilia Finanzas");

const HOJA: Concept = {
  id: "c-hoja",
  code: "EGR-110",
  name: "Edificación",
  parent_id: "c-1",
  section: "EGR",
  is_header: false,
  sort_order: 1,
  active: true,
  parent_name: "Costos Directos",
  path: "EGRESOS › Costos Directos › Edificación",
};

function fila(over: Partial<SolicitudListItem> & Pick<SolicitudListItem, "id" | "folio">) {
  return {
    request_type: "service",
    supplier_id: "s-1",
    supplier_name: "Constructora del Valle",
    final_concept_id: "c-hoja",
    proposed_concept_id: "c-hoja",
    concept_label: "Edificación",
    net_amount: "1000.00",
    status: "submitted",
    document_date: null,
    created_at: "2026-07-20T10:00:00Z",
    ...over,
  } as SolicitudListItem;
}

function detalle(over: Partial<SolicitudDetail> = {}): SolicitudDetail {
  return {
    id: "sol-1",
    folio: "SP-000001",
    request_type: "service",
    supplier_id: "s-1",
    description: "Servicio de grúa",
    net_amount: "1000.00",
    proposed_concept_id: "c-hoja",
    final_concept_id: "c-hoja",
    proposed_payment_week: null,
    document_date: null,
    due_date: null,
    status: "submitted",
    captured_by: "u-campo",
    submitted_at: "2026-07-20T11:00:00Z",
    supervisor_reviewed_by: null,
    supervisor_reviewed_at: null,
    cfo_reviewed_by: null,
    cfo_reviewed_at: null,
    created_at: "2026-07-20T10:00:00Z",
    updated_at: "2026-07-20T11:00:00Z",
    supplier: null,
    proposed_concept: HOJA,
    final_concept: HOJA,
    attachments: [
      {
        id: "att-1",
        solicitud_id: "sol-1",
        file_name: "c.pdf",
        content_type: "application/pdf",
        uploaded_by: "u-campo",
        uploaded_at: "2026-07-20T10:30:00Z",
      },
    ],
    comments: [],
    audit_events: [],
    ...over,
  };
}

function renderApp(path: string) {
  function AppRoutes() {
    return useRoutes(routes);
  }
  return render(
    <Providers>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </Providers>,
  );
}

function panelDetalle() {
  const el = document.querySelector(".detail-pane");
  if (!el) throw new Error("No se encontró el panel de detalle");
  return within(el as HTMLElement);
}

function accionesVisibles(): string[] {
  const cont = document.querySelector(".detail-pane .acciones-flujo");
  return Array.from(cont?.querySelectorAll("button") ?? []).map(
    (b) => b.textContent?.trim() ?? "",
  );
}

beforeEach(() => {
  vi.mocked(getToken).mockReturnValue("token");
  for (const fn of [
    api.me,
    api.listSolicitudes,
    api.getSolicitud,
    api.listSuppliers,
    api.listConcepts,
    api.supervisorApprove,
    api.cfoApprove,
  ]) {
    vi.mocked(fn).mockReset();
  }
  vi.mocked(api.listSuppliers).mockResolvedValue([]);
  vi.mocked(api.listConcepts).mockResolvedValue([HOJA]);
  vi.mocked(api.getSolicitud).mockResolvedValue(detalle());
});

test("la bandeja del Supervisor consulta SOLO el estado submitted", async () => {
  vi.mocked(api.me).mockResolvedValue(SUPERVISOR);
  vi.mocked(api.listSolicitudes).mockResolvedValue([fila({ id: "sol-1", folio: "SP-000001" })]);

  renderApp("/aprobaciones");

  expect(
    await screen.findByText("Bandeja de Aprobaciones", { selector: ".cat-title" }),
  ).toBeTruthy();
  await waitFor(() =>
    expect(api.listSolicitudes).toHaveBeenCalledWith(
      expect.objectContaining({ status: "submitted" }),
    ),
  );
  expect(screen.getByText("SP-000001")).toBeTruthy();
  // Contador con su etiqueta.
  expect(screen.getByText(/1 pendientes/)).toBeTruthy();
  // El filtro de estado no se ofrece: la bandeja lo fija.
  expect(screen.queryByLabelText("Filtrar por estado")).toBeNull();
  // Tampoco el botón de captura.
  expect(screen.queryByText("+ Nueva solicitud")).toBeNull();
});

test("la bandeja del CFO consulta SOLO supervisor_approved", async () => {
  vi.mocked(api.me).mockResolvedValue(CFO);
  vi.mocked(api.listSolicitudes).mockResolvedValue([
    fila({ id: "sol-1", folio: "SP-000001", status: "supervisor_approved" }),
  ]);

  renderApp("/aprobaciones-financieras");

  expect(
    await screen.findByText("Aprobaciones Financieras", { selector: ".cat-title" }),
  ).toBeTruthy();
  await waitFor(() =>
    expect(api.listSolicitudes).toHaveBeenCalledWith(
      expect.objectContaining({ status: "supervisor_approved" }),
    ),
  );
  expect(screen.queryByLabelText("Filtrar por estado")).toBeNull();
});

test("en la bandeja del Supervisor el detalle ofrece SUS acciones", async () => {
  vi.mocked(api.me).mockResolvedValue(SUPERVISOR);
  vi.mocked(api.listSolicitudes).mockResolvedValue([fila({ id: "sol-1", folio: "SP-000001" })]);

  renderApp("/aprobaciones");
  fireEvent.click(await screen.findByText("SP-000001"));
  await waitFor(() => expect(panelDetalle().getByText("Acciones")).toBeTruthy());

  const acciones = accionesVisibles();
  expect(acciones).toContain("Aprobar (Supervisor)");
  expect(acciones).toContain("Rechazar");
  expect(acciones).not.toContain("Aprobar (CFO)");
});

test("al actuar, la solicitud SALE de la bandeja y el panel lo avisa", async () => {
  vi.mocked(api.me).mockResolvedValue(CFO);
  // Primera consulta: la solicitud está en la bandeja. Tras aprobar, ya no.
  vi.mocked(api.listSolicitudes)
    .mockResolvedValueOnce([
      fila({ id: "sol-1", folio: "SP-000001", status: "supervisor_approved" }),
    ])
    .mockResolvedValue([]);
  vi.mocked(api.getSolicitud).mockResolvedValue(
    detalle({ status: "supervisor_approved" }),
  );
  vi.mocked(api.cfoApprove).mockResolvedValue(detalle({ status: "cfo_approved" }));

  renderApp("/aprobaciones-financieras");
  fireEvent.click(await screen.findByText("SP-000001"));
  await waitFor(() => expect(panelDetalle().getByText("Acciones")).toBeTruthy());

  fireEvent.click(panelDetalle().getByRole("button", { name: "Aprobar (CFO)" }));
  await screen.findByText("Aprobación financiera");
  fireEvent.click(
    within(document.querySelector(".p-dialog") as HTMLElement).getByRole("button", {
      name: "Aprobar",
    }),
  );

  await waitFor(() => expect(api.cfoApprove).toHaveBeenCalled());
  // La fila desaparece y el panel avisa en vez de seguir mostrando el detalle.
  expect(await screen.findByText(/ya salió de la bandeja/i)).toBeTruthy();
  expect(screen.queryByText("SP-000001")).toBeNull();
  expect(screen.getByText("No hay solicitudes pendientes en esta bandeja.")).toBeTruthy();
});

test("el sidebar del Supervisor enlaza su bandeja y no la del CFO", async () => {
  vi.mocked(api.me).mockResolvedValue(SUPERVISOR);
  vi.mocked(api.listSolicitudes).mockResolvedValue([]);

  renderApp("/aprobaciones");
  const menu = await screen.findByRole("navigation", { name: "Menú principal" });

  const enlace = within(menu).getByRole("link", { name: "Bandeja de Aprobaciones" });
  expect(enlace.getAttribute("href")).toBe("/aprobaciones");
  expect(enlace.getAttribute("aria-current")).toBe("page");
  expect(within(menu).queryByText("Aprobaciones Financieras")).toBeNull();
});

test("el Supervisor aterriza en su bandeja tras el login", async () => {
  vi.mocked(api.me).mockResolvedValue(SUPERVISOR);
  vi.mocked(api.listSolicitudes).mockResolvedValue([]);

  renderApp("/login");

  expect(
    await screen.findByText("Bandeja de Aprobaciones", { selector: ".cat-title" }),
  ).toBeTruthy();
});

test("el CFO aterriza en Aprobaciones Financieras tras el login", async () => {
  vi.mocked(api.me).mockResolvedValue(CFO);
  vi.mocked(api.listSolicitudes).mockResolvedValue([]);

  renderApp("/login");

  expect(
    await screen.findByText("Aprobaciones Financieras", { selector: ".cat-title" }),
  ).toBeTruthy();
});

test("bandeja vacía: mensaje propio, no el de filtros", async () => {
  vi.mocked(api.me).mockResolvedValue(SUPERVISOR);
  vi.mocked(api.listSolicitudes).mockResolvedValue([]);

  renderApp("/aprobaciones");

  expect(
    await screen.findByText("No hay solicitudes pendientes en esta bandeja."),
  ).toBeTruthy();
});
