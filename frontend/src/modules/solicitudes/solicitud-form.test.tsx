/** Pruebas de captura y edición de Solicitudes (api mockeado), y del interceptor 401.
 *
 * El archivo de lista/detalle es `solicitudes.test.tsx`; aquí va todo lo del formulario.
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";

import { Providers } from "@/app/providers";
import { routes } from "@/app/router";
import { api, getToken } from "@/shared/lib/api";
import type { Concept, SolicitudDetail, Supplier, User } from "@/shared/lib/types";

vi.mock("@/shared/lib/api", async () => {
  const real = await vi.importActual<typeof import("@/shared/lib/api")>("@/shared/lib/api");
  return {
    // `ApiError` y el registro del handler de 401 son los REALES: así se ejercita el
    // interceptor de verdad y no una imitación.
    ApiError: real.ApiError,
    setOnUnauthorized: real.setOnUnauthorized,
    getToken: vi.fn(),
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
      createSolicitud: vi.fn(),
      updateSolicitud: vi.fn(),
      listSuppliers: vi.fn(),
      listConcepts: vi.fn(),
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

/** Supervisor: no tiene solicitud:create ni edit_draft. */
const SUPERVISOR: User = {
  id: "u-sup",
  email: "supervisor@monteesmeralda.mx",
  full_name: "Sofía Supervisora",
  role: "supervisor",
  is_active: true,
};

function proveedor(id: string, nombre: string, efectivo: string): Supplier {
  return {
    id,
    legal_name: nombre,
    rfc: "XXX010101AB1",
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
      has_record: efectivo !== "none",
      status: efectivo === "expired" ? "cleared" : null,
      effective_status: efectivo,
      valid_until: null,
      is_expired: efectivo === "expired",
    },
  };
}

const PROVEEDORES: Supplier[] = [
  proveedor("s-ok", "Proveedor Con Cumplimiento", "cleared"),
  proveedor("s-venc", "Proveedor Vencido", "expired"),
];

const CONCEPTOS: Concept[] = [
  {
    id: "c-h",
    code: "EGR",
    name: "EGRESOS",
    parent_id: null,
    section: "EGR",
    is_header: true,
    sort_order: 0,
    active: true,
    parent_name: null,
    path: "EGRESOS",
  },
  {
    id: "c-hoja",
    code: "EGR-110",
    name: "Edificación",
    parent_id: "c-h",
    section: "EGR",
    is_header: false,
    sort_order: 1,
    active: true,
    parent_name: "Costos Directos",
    path: "EGRESOS › Costos Directos › Edificación",
  },
];

const BORRADOR: SolicitudDetail = {
  id: "sol-9",
  folio: "SP-000009",
  request_type: "service",
  supplier_id: "s-ok",
  description: "Mantenimiento de andamios",
  net_amount: "7500.00",
  proposed_concept_id: "c-hoja",
  final_concept_id: null,
  proposed_payment_week: "2026-W31",
  document_date: "2026-07-20",
  due_date: null,
  status: "draft",
  captured_by: "u-admin",
  submitted_at: null,
  supervisor_reviewed_by: null,
  supervisor_reviewed_at: null,
  cfo_reviewed_by: null,
  cfo_reviewed_at: null,
  created_at: "2026-07-20T10:00:00Z",
  updated_at: "2026-07-20T10:00:00Z",
  supplier: PROVEEDORES[0],
  proposed_concept: CONCEPTOS[1],
  final_concept: null,
  attachments: [],
  comments: [],
  audit_events: [],
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

/** Abre un Dropdown de PrimeReact por su nombre accesible (el aria-label va a un input
 *  oculto que no abre el panel; hay que clicar la raíz `.p-dropdown`). */
function abrirDropdown(label: string) {
  const raiz = screen.getByLabelText(label).closest(".p-dropdown");
  if (!raiz) throw new Error(`No se encontró el Dropdown "${label}"`);
  fireEvent.click(raiz);
}

beforeEach(() => {
  vi.mocked(getToken).mockReturnValue("token");
  vi.mocked(api.me).mockReset().mockResolvedValue(ADMIN);
  vi.mocked(api.listSolicitudes).mockReset().mockResolvedValue([]);
  vi.mocked(api.getSolicitud).mockReset().mockResolvedValue(BORRADOR);
  vi.mocked(api.createSolicitud).mockReset().mockResolvedValue(BORRADOR);
  vi.mocked(api.updateSolicitud).mockReset().mockResolvedValue(BORRADOR);
  vi.mocked(api.listSuppliers).mockReset().mockResolvedValue(PROVEEDORES);
  vi.mocked(api.listConcepts).mockReset().mockResolvedValue(CONCEPTOS);
});

test("el formulario crea la solicitud y manda net_amount como STRING", async () => {
  renderApp("/solicitudes/nueva");

  expect(await screen.findByText("Nueva solicitud de pago")).toBeTruthy();

  fireEvent.change(screen.getByLabelText("Descripción"), {
    target: { value: "Servicio de grúa" },
  });
  const monto = screen.getByLabelText("Monto neto (MXN)");
  fireEvent.input(monto, { target: { value: "1500.75" } });
  fireEvent.blur(monto);

  abrirDropdown("Proveedor");
  fireEvent.click(await screen.findByText("Proveedor Con Cumplimiento"));

  fireEvent.click(screen.getByRole("button", { name: /crear borrador/i }));

  await waitFor(() => expect(api.createSolicitud).toHaveBeenCalledTimes(1));
  const payload = vi.mocked(api.createSolicitud).mock.calls[0][0];
  expect(payload.supplier_id).toBe("s-ok");
  expect(payload.description).toBe("Servicio de grúa");
  // Lo esencial: string con 2 decimales, no número.
  expect(typeof payload.net_amount).toBe("string");
  expect(payload.net_amount).toBe("1500.75");
});

test("avisa cuando el proveedor no tiene cumplimiento vigente, sin bloquear", async () => {
  renderApp("/solicitudes/nueva");
  await screen.findByText("Nueva solicitud de pago");

  abrirDropdown("Proveedor");
  fireEvent.click(await screen.findByText("Proveedor Vencido"));

  expect(await screen.findByText(/no tiene cumplimiento vigente/i)).toBeTruthy();
  expect(screen.getByText("Cumplimiento vencido")).toBeTruthy();
  // El aviso no deshabilita el guardado.
  expect(screen.getByRole("button", { name: /crear borrador/i })).not.toHaveProperty(
    "disabled",
    true,
  );
});

test("el selector de concepto solo ofrece hojas, agrupadas por sección", async () => {
  renderApp("/solicitudes/nueva");
  await screen.findByText("Nueva solicitud de pago");

  abrirDropdown("Concepto propuesto");

  // La hoja aparece con su código y su path sin la sección; el encabezado NO es opción.
  expect(await screen.findByText("EGR-110 — Costos Directos › Edificación")).toBeTruthy();
  const panel = document.querySelector(".p-dropdown-panel");
  expect(panel?.textContent).toContain("EGRESOS — COSTOS"); // etiqueta del grupo
  expect(panel?.querySelector(".p-dropdown-item-group")).not.toBeNull();
});

test("editar precarga los campos de la solicitud", async () => {
  renderApp("/solicitudes/sol-9/editar");

  expect(await screen.findByText("Editar solicitud SP-000009")).toBeTruthy();
  expect(api.getSolicitud).toHaveBeenCalledWith("sol-9");

  expect(screen.getByLabelText("Descripción")).toHaveProperty(
    "value",
    "Mantenimiento de andamios",
  );
  expect(screen.getByLabelText("Semana de pago propuesta")).toHaveProperty(
    "value",
    "2026-W31",
  );
  // El monto se precarga desde el string del backend.
  expect((screen.getByLabelText("Monto neto (MXN)") as HTMLInputElement).value).toContain(
    "7,500",
  );
});

test("una solicitud no editable muestra el motivo en vez del formulario", async () => {
  vi.mocked(api.getSolicitud).mockResolvedValue({
    ...BORRADOR,
    status: "cfo_approved",
  });

  renderApp("/solicitudes/sol-9/editar");

  expect(await screen.findByText(/no es editable/i)).toBeTruthy();
  expect(screen.getByText(/borrador o cuando se solicitó una corrección/i)).toBeTruthy();
  expect(screen.queryByLabelText("Descripción")).toBeNull();
});

test("sin solicitud:create no aparece 'Nueva solicitud' ni se puede capturar", async () => {
  vi.mocked(api.me).mockResolvedValue(SUPERVISOR);

  renderApp("/solicitudes");
  await waitFor(() => expect(api.listSolicitudes).toHaveBeenCalled());
  expect(screen.queryByText("+ Nueva solicitud")).toBeNull();

  // El sidebar tampoco ofrece "Capturar Solicitud" a este rol.
  const menu = screen.getByRole("navigation", { name: "Menú principal" });
  expect(within(menu).queryByText("Capturar Solicitud")).toBeNull();
});

test("con solicitud:create el sidebar enlaza Capturar Solicitud", async () => {
  renderApp("/solicitudes");
  const menu = await screen.findByRole("navigation", { name: "Menú principal" });
  const enlace = within(menu).getByRole("link", { name: "Capturar Solicitud" });
  expect(enlace.getAttribute("href")).toBe("/solicitudes/nueva");
});

test("el Admin de Campo aterriza en la LISTA, no en el formulario de captura", async () => {
  const CAMPO: User = {
    id: "u-campo",
    email: "campo@monteesmeralda.mx",
    full_name: "Fabián Campo",
    role: "field_admin",
    is_active: true,
  };
  vi.mocked(api.me).mockResolvedValue(CAMPO);

  // Con sesión activa, /login redirige a la home del rol (`resolveRoleHome`).
  renderApp("/login");

  // Cae en la lista: se ve su encabezado y se consultó el listado.
  expect(await screen.findByText("Solicitudes", { selector: ".cat-title" })).toBeTruthy();
  await waitFor(() => expect(api.listSolicitudes).toHaveBeenCalled());
  // Y NO en el formulario en blanco.
  expect(screen.queryByText("Nueva solicitud de pago")).toBeNull();
});

// El interceptor 401 se prueba en `src/shared/lib/api.test.ts`, contra el `request()` real
// con `fetch` simulado: aquí `api` está mockeado y ese código nunca se ejecutaría.
