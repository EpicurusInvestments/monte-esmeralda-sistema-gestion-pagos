/** Pruebas del módulo Solicitudes (api mockeado): lista, detalle, línea de tiempo,
 * filtro server-side y el alcance de SOLO LECTURA de este incremento.
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";

import { Providers } from "@/app/providers";
import { routes } from "@/app/router";
import { api, getToken } from "@/shared/lib/api";
import type { SolicitudDetail, SolicitudListItem, User } from "@/shared/lib/types";

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
    // Adjuntos: `uploadAttachment` y `downloadAttachment` son exports de nivel
    // superior del cliente, no métodos de `api`.
    uploadAttachment: vi.fn(),
    downloadAttachment: vi.fn(),
    api: {
      login: vi.fn(),
      me: vi.fn(),
      listSolicitudes: vi.fn(),
      getSolicitud: vi.fn(),
      listSuppliers: vi.fn(),
    },
  };
});

const CFO: User = {
  id: "u-cfo",
  email: "cfo@monteesmeralda.mx",
  full_name: "Cecilia Finanzas",
  role: "cfo",
  is_active: true,
};

const LISTA: SolicitudListItem[] = [
  {
    id: "sol-1",
    folio: "SP-2026-0001",
    request_type: "supplier_invoice",
    supplier_id: "s-1",
    supplier_name: "Constructora del Valle S.A. de C.V.",
    final_concept_id: "c-2",
    proposed_concept_id: "c-2",
    concept_label: "Edificación (Costos Directos)",
    net_amount: "125000.50",
    status: "supervisor_approved",
    document_date: "2026-07-15",
    created_at: "2026-07-16T10:00:00Z",
  },
  {
    id: "sol-2",
    folio: "SP-2026-0002",
    request_type: "service",
    supplier_id: "s-2",
    supplier_name: "Materiales y Acabados del Norte",
    final_concept_id: null,
    proposed_concept_id: null,
    concept_label: null,
    net_amount: "4300.00",
    status: "draft",
    document_date: null,
    created_at: "2026-07-18T09:00:00Z",
  },
];

const DETALLE: SolicitudDetail = {
  id: "sol-1",
  folio: "SP-2026-0001",
  request_type: "supplier_invoice",
  supplier_id: "s-1",
  description: "Estimación 3 de obra civil",
  net_amount: "125000.50",
  proposed_concept_id: "c-2",
  final_concept_id: "c-2",
  proposed_payment_week: "2026-W30",
  document_date: "2026-07-15",
  due_date: "2026-08-15",
  status: "supervisor_approved",
  captured_by: "u-campo",
  submitted_at: "2026-07-16T11:00:00Z",
  supervisor_reviewed_by: "u-sup",
  supervisor_reviewed_at: "2026-07-17T15:30:00Z",
  cfo_reviewed_by: null,
  cfo_reviewed_at: null,
  created_at: "2026-07-16T10:00:00Z",
  updated_at: "2026-07-17T15:30:00Z",
  supplier: {
    id: "s-1",
    legal_name: "Constructora del Valle S.A. de C.V.",
    rfc: "CVA120101AB1",
    contact_name: null,
    email: null,
    phone: null,
    bank_name: null,
    bank_account: null,
    clabe: null,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    clearance: {
      has_record: true,
      status: "cleared",
      effective_status: "cleared",
      valid_until: "2026-12-31",
      is_expired: false,
    },
  },
  proposed_concept: {
    id: "c-2",
    code: "EGR-110",
    name: "Edificación",
    parent_id: "c-1",
    section: "EGR",
    is_header: false,
    sort_order: 0,
    active: true,
    parent_name: "Costos Directos",
    path: "EGRESOS › Costos Directos › Edificación",
  },
  final_concept: {
    id: "c-2",
    code: "EGR-110",
    name: "Edificación",
    parent_id: "c-1",
    section: "EGR",
    is_header: false,
    sort_order: 0,
    active: true,
    parent_name: "Costos Directos",
    path: "EGRESOS › Costos Directos › Edificación",
  },
  attachments: [
    {
      id: "att-1",
      solicitud_id: "sol-1",
      file_name: "estimacion-3.pdf",
      content_type: "application/pdf",
      uploaded_by: "u-campo",
      uploaded_at: "2026-07-16T10:45:00Z",
    },
  ],
  comments: [
    {
      id: "com-1",
      solicitud_id: "sol-1",
      author_id: "u-sup",
      author_name: "Sofía Supervisora",
      body: "Concepto confirmado contra el contrato.",
      created_at: "2026-07-17T15:00:00Z",
    },
  ],
  audit_events: [
    {
      id: "ae-2",
      entity_type: "solicitud",
      entity_id: "sol-1",
      action: "supervisor_approved",
      performed_by: "u-sup",
      performed_by_name: "Sofía Supervisora",
      before_json: null,
      after_json: null,
      reason: "Documentación completa.",
      created_at: "2026-07-17T15:30:00Z",
    },
    {
      id: "ae-1",
      entity_type: "solicitud",
      entity_id: "sol-1",
      action: "submitted",
      performed_by: "u-campo",
      performed_by_name: "Fabián Campo",
      before_json: null,
      after_json: null,
      reason: null,
      created_at: "2026-07-16T11:00:00Z",
    },
  ],
};

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

function panelDetalle() {
  const el = document.querySelector(".detail-pane");
  if (!el) throw new Error("No se encontró el panel de detalle");
  return within(el as HTMLElement);
}

/** Abre un Dropdown de PrimeReact por su nombre accesible.
 *
 * `aria-label` termina en un input oculto (`.p-hidden-accessible`) que NO abre el panel:
 * hay que hacer click en la raíz `.p-dropdown`. Se parte del input etiquetado para no
 * depender de la posición del componente en el DOM.
 */
function abrirDropdown(label: string) {
  const raiz = screen.getByLabelText(label).closest(".p-dropdown");
  if (!raiz) throw new Error(`No se encontró el Dropdown "${label}"`);
  fireEvent.click(raiz);
}

beforeEach(() => {
  vi.mocked(getToken).mockReturnValue("token");
  vi.mocked(api.me).mockReset().mockResolvedValue(CFO);
  vi.mocked(api.listSolicitudes).mockReset().mockResolvedValue(LISTA);
  vi.mocked(api.getSolicitud).mockReset().mockResolvedValue(DETALLE);
  vi.mocked(api.listSuppliers).mockReset().mockResolvedValue([]);
});

test("la lista renderiza una fila por solicitud, con folio, monto y estado", async () => {
  renderApp("/solicitudes");

  expect(await screen.findByText("SP-2026-0001")).toBeTruthy();
  expect(screen.getByText("SP-2026-0002")).toBeTruthy();
  expect(screen.getByText("Constructora del Valle S.A. de C.V.")).toBeTruthy();
  expect(screen.getByText("Edificación (Costos Directos)")).toBeTruthy();

  // Badges de estado con las etiquetas de labels.ts.
  expect(screen.getByText("Aprobada por Supervisor")).toBeTruthy();
  expect(screen.getByText("Borrador")).toBeTruthy();

  // Monto formateado como moneda (MXN) — se comprueban los dígitos, no el glifo.
  expect(screen.getByText(/125,000\.50/)).toBeTruthy();

  // Sin filtros, la primera consulta va sin parámetros.
  expect(api.listSolicitudes).toHaveBeenCalledWith({
    status: undefined,
    request_type: undefined,
    supplier_id: undefined,
    date_from: undefined,
    date_to: undefined,
  });

  // La lista va en modo compacto de PrimeReact: el padding de celda sale de esa clase (el
  // tamaño de fuente lo fija el tema). Si alguien quita `size="small"`, las filas se
  // vuelven a inflar.
  expect(document.querySelector(".p-datatable")?.className).toContain("p-datatable-sm");
});

test("seleccionar una fila abre el detalle con su badge de estado", async () => {
  renderApp("/solicitudes");

  expect(
    await screen.findByText("Selecciona una solicitud para ver su detalle y su historial."),
  ).toBeTruthy();

  fireEvent.click(await screen.findByText("SP-2026-0001"));

  await waitFor(() => {
    expect(panelDetalle().getByText("Datos de la solicitud")).toBeTruthy();
  });
  const panel = panelDetalle();
  expect(api.getSolicitud).toHaveBeenCalledWith("sol-1");
  expect(panel.getByText("Aprobada por Supervisor")).toBeTruthy();
  expect(panel.getByText("Estimación 3 de obra civil")).toBeTruthy();
  expect(panel.getByText("CVA120101AB1")).toBeTruthy();
  expect(panel.getAllByText("EGRESOS › Costos Directos › Edificación").length).toBe(2);
  // Adjuntos y comentarios, solo lectura.
  expect(panel.getByText("estimacion-3.pdf")).toBeTruthy();
  expect(panel.getByText("Concepto confirmado contra el contrato.")).toBeTruthy();
});

test("la línea de tiempo muestra los eventos en orden cronológico con su etiqueta", async () => {
  renderApp("/solicitudes");
  fireEvent.click(await screen.findByText("SP-2026-0001"));
  await waitFor(() => expect(panelDetalle().getByText("Línea de tiempo")).toBeTruthy());

  const items = document.querySelectorAll(".timeline-item");
  expect(items.length).toBe(2);
  // Cronológico: el envío (16 jul) antes de la aprobación (17 jul), aunque lleguen al revés.
  expect(items[0].textContent).toContain("Envío a revisión");
  expect(items[0].textContent).toContain("Fabián Campo");
  expect(items[1].textContent).toContain("Aprobación del Supervisor");
  expect(items[1].textContent).toContain("Sofía Supervisora");
  // El motivo se muestra cuando existe.
  expect(items[1].textContent).toContain("Documentación completa.");
});

test("cambiar el filtro de estado reconsulta al backend", async () => {
  renderApp("/solicitudes");
  await screen.findByText("SP-2026-0001");

  // Abrir el Dropdown de estado y elegir "Enviada".
  abrirDropdown("Filtrar por estado");
  fireEvent.click(await screen.findByText("Enviada"));

  await waitFor(() => {
    expect(api.listSolicitudes).toHaveBeenCalledWith(
      expect.objectContaining({ status: "submitted" }),
    );
  });
});

test("el panel arma sus secciones según el rol: CFO sobre una aprobada por Supervisor", async () => {
  // La matriz completa de acciones por estado/rol se prueba en `solicitud-acciones.test.tsx`;
  // aquí solo se comprueba que el panel las monta y respeta el rol.
  renderApp("/solicitudes");
  fireEvent.click(await screen.findByText("SP-2026-0001"));
  await waitFor(() => expect(panelDetalle().getByText("Línea de tiempo")).toBeTruthy());

  // Acciones del CFO en `supervisor_approved`.
  expect(panelDetalle().getByRole("button", { name: "Aprobar (CFO)" })).toBeTruthy();
  expect(panelDetalle().getByRole("button", { name: "Diferir" })).toBeTruthy();
  // …y NADA de captura ni de Supervisor: el CFO no tiene esas capacidades.
  expect(screen.queryByText("+ Nueva solicitud")).toBeNull();
  expect(panelDetalle().queryByRole("button", { name: "Aprobar (Supervisor)" })).toBeNull();
  expect(panelDetalle().queryByRole("button", { name: "Enviar a revisión" })).toBeNull();

  // Descargar y comentar: disponibles para cualquiera que vea la solicitud…
  expect(panelDetalle().getByRole("button", { name: "Descargar" })).toBeTruthy();
  expect(panelDetalle().getByRole("button", { name: "Comentar" })).toBeTruthy();
  // …pero el CFO no es dueño ni Admin: no puede adjuntar.
  expect(panelDetalle().queryByLabelText(/^Archivo/)).toBeNull();
});

test("el sidebar enlaza Solicitudes y lo marca activo", async () => {
  renderApp("/solicitudes");

  const menu = await screen.findByRole("navigation", { name: "Menú principal" });
  const enlace = within(menu).getByRole("link", { name: "Solicitudes" });
  expect(enlace.getAttribute("href")).toBe("/solicitudes");
  expect(enlace.getAttribute("aria-current")).toBe("page");
});
