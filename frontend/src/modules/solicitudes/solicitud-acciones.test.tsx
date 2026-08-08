/** Pruebas de las acciones de flujo en el detalle (api mockeado).
 *
 * Lo esencial: que cada rol vea SOLO las transiciones que le tocan en cada estado, que los
 * motivos obligatorios se exijan, y que el concepto final se pida cuando falta.
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

const CAMPO = usuario("u-campo", "field_admin", "Fabián Campo");
const SUPERVISOR = usuario("u-sup", "supervisor", "Sofía Supervisora");
const CFO = usuario("u-cfo", "cfo", "Cecilia Finanzas");
const TESORERIA = usuario("u-tes", "treasurer", "Ana Tesorería");

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

const FILA: SolicitudListItem = {
  id: "sol-1",
  folio: "SP-000001",
  request_type: "service",
  supplier_id: "s-1",
  supplier_name: "Constructora del Valle",
  final_concept_id: null,
  proposed_concept_id: null,
  concept_label: null,
  net_amount: "1000.00",
  status: "draft",
  document_date: null,
  created_at: "2026-07-20T10:00:00Z",
};

function detalle(over: Partial<SolicitudDetail> = {}): SolicitudDetail {
  return {
    id: "sol-1",
    folio: "SP-000001",
    request_type: "service",
    supplier_id: "s-1",
    description: "Servicio de grúa",
    net_amount: "1000.00",
    proposed_concept_id: null,
    final_concept_id: null,
    proposed_payment_week: null,
    document_date: null,
    due_date: null,
    status: "draft",
    captured_by: "u-campo",
    submitted_at: null,
    supervisor_reviewed_by: null,
    supervisor_reviewed_at: null,
    cfo_reviewed_by: null,
    cfo_reviewed_at: null,
    created_at: "2026-07-20T10:00:00Z",
    updated_at: "2026-07-20T10:00:00Z",
    supplier: null,
    proposed_concept: null,
    final_concept: null,
    attachments: [
      {
        id: "att-1",
        solicitud_id: "sol-1",
        file_name: "comprobante.pdf",
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

function panelDetalle() {
  const el = document.querySelector(".detail-pane");
  if (!el) throw new Error("No se encontró el panel de detalle");
  return within(el as HTMLElement);
}

function dialogo() {
  const el = document.querySelector(".p-dialog");
  if (!el) throw new Error("No hay diálogo abierto");
  return within(el as HTMLElement);
}

/** Monta la app, entra al detalle de la solicitud y espera a que cargue. */
async function abrirDetalle(user: User, over: Partial<SolicitudDetail> = {}) {
  vi.mocked(api.me).mockResolvedValue(user);
  vi.mocked(api.getSolicitud).mockResolvedValue(detalle(over));
  vi.mocked(api.listSolicitudes).mockResolvedValue([
    { ...FILA, status: over.status ?? "draft" },
  ]);

  function AppRoutes() {
    return useRoutes(routes);
  }
  render(
    <Providers>
      <MemoryRouter initialEntries={["/solicitudes"]}>
        <AppRoutes />
      </MemoryRouter>
    </Providers>,
  );
  fireEvent.click(await screen.findByText("SP-000001"));
  await waitFor(() => expect(panelDetalle().getByText("Acciones")).toBeTruthy());
}

/** Etiquetas de los botones de la sección Acciones (ancladas a su clase, no a su posición). */
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
    api.getSolicitud,
    api.listSolicitudes,
    api.listSuppliers,
    api.listConcepts,
    api.submit,
    api.cancel,
    api.assignConcept,
    api.supervisorApprove,
    api.cfoApprove,
    api.defer,
    api.reject,
    api.requestCorrection,
  ]) {
    vi.mocked(fn).mockReset();
  }
  vi.mocked(api.listSuppliers).mockResolvedValue([]);
  vi.mocked(api.listConcepts).mockResolvedValue([HOJA]);
  for (const fn of [
    api.submit,
    api.cancel,
    api.assignConcept,
    api.supervisorApprove,
    api.cfoApprove,
    api.defer,
    api.reject,
    api.requestCorrection,
  ]) {
    vi.mocked(fn).mockResolvedValue(detalle());
  }
});

test("borrador (dueño): solo Enviar y Cancelar", async () => {
  await abrirDetalle(CAMPO);
  const acciones = accionesVisibles();
  expect(acciones).toContain("Enviar a revisión");
  expect(acciones).toContain("Cancelar solicitud");
  expect(acciones).not.toContain("Aprobar (Supervisor)");
  expect(acciones).not.toContain("Rechazar");
});

test("Cancelar NO depende de canSubmit: basta ser dueño (o Admin) y estado editable", async () => {
  // Caso límite real: un Supervisor que capturó la solicitud. NO tiene `solicitud:create`,
  // así que no puede enviarla; pero `workflow.cancel` solo exige dueño/Admin + estado
  // editable, así que SÍ puede cancelarla.
  await abrirDetalle(SUPERVISOR, { status: "draft", captured_by: SUPERVISOR.id });

  const acciones = accionesVisibles();
  expect(acciones).toContain("Cancelar solicitud");
  expect(acciones).not.toContain("Enviar a revisión");

  fireEvent.click(panelDetalle().getByRole("button", { name: "Cancelar solicitud" }));
  await screen.findByText("Cancelar solicitud", { selector: ".p-dialog-title" });
  fireEvent.click(dialogo().getByRole("button", { name: "Cancelar solicitud" }));

  await waitFor(() => expect(api.cancel).toHaveBeenCalledWith("sol-1", undefined));
});

test("Cancelar desaparece en un estado no editable", async () => {
  await abrirDetalle(CAMPO, { status: "submitted" });
  expect(accionesVisibles()).not.toContain("Cancelar solicitud");
});

test("el Admin puede cancelar una solicitud ajena en borrador", async () => {
  const ADMIN = usuario("u-admin", "admin", "Administrador del Sistema");
  await abrirDetalle(ADMIN, { status: "draft", captured_by: "u-campo" });
  expect(accionesVisibles()).toContain("Cancelar solicitud");
});

test("enviar sin adjuntos está deshabilitado y avisa por qué", async () => {
  await abrirDetalle(CAMPO, { attachments: [] });

  const boton = panelDetalle().getByRole("button", { name: "Enviar a revisión" });
  expect(boton).toHaveProperty("disabled", true);
  expect(boton.getAttribute("title")).toBe("Requiere al menos un adjunto");
  expect(panelDetalle().getByText(/hace falta al menos un adjunto/i)).toBeTruthy();
});

test("enviar con adjunto llama a submit e invalida", async () => {
  await abrirDetalle(CAMPO);

  fireEvent.click(panelDetalle().getByRole("button", { name: "Enviar a revisión" }));
  fireEvent.click(await screen.findByRole("button", { name: "Enviar" }));

  await waitFor(() => expect(api.submit).toHaveBeenCalledWith("sol-1"));
  // Se refresca el detalle tras la transición.
  await waitFor(() => expect(api.getSolicitud).toHaveBeenCalledTimes(2));
});

test("enviada (Supervisor): asignar concepto, aprobar, corrección y rechazar", async () => {
  await abrirDetalle(SUPERVISOR, { status: "submitted" });
  const acciones = accionesVisibles();
  expect(acciones).toContain("Asignar concepto final");
  expect(acciones).toContain("Aprobar (Supervisor)");
  expect(acciones).toContain("Solicitar corrección");
  expect(acciones).toContain("Rechazar");
  // Nada del CFO ni de captura.
  expect(acciones).not.toContain("Aprobar (CFO)");
  expect(acciones).not.toContain("Diferir");
  expect(acciones).not.toContain("Enviar a revisión");
});

test("aprobar como Supervisor sin concepto final EXIGE el concepto", async () => {
  await abrirDetalle(SUPERVISOR, { status: "submitted" });

  fireEvent.click(panelDetalle().getByRole("button", { name: "Aprobar (Supervisor)" }));
  await screen.findByText("Aprobación del Supervisor");
  // El diálogo pide el concepto final.
  expect(dialogo().getByLabelText("Concepto final")).toBeTruthy();

  // Sin elegirlo, no se llama al backend.
  fireEvent.click(dialogo().getByRole("button", { name: "Aprobar" }));
  expect(await screen.findByText(/Selecciona el concepto final/i)).toBeTruthy();
  expect(api.supervisorApprove).not.toHaveBeenCalled();
});

test("aprobar como Supervisor con concepto ya asignado no lo vuelve a pedir", async () => {
  await abrirDetalle(SUPERVISOR, { status: "submitted", final_concept_id: "c-hoja" });

  fireEvent.click(panelDetalle().getByRole("button", { name: "Aprobar (Supervisor)" }));
  await screen.findByText("Aprobación del Supervisor");
  expect(dialogo().queryByLabelText("Concepto final")).toBeNull();
  // Y ya no ofrece "Asignar concepto final".
  expect(accionesVisibles()).not.toContain("Asignar concepto final");

  fireEvent.click(dialogo().getByRole("button", { name: "Aprobar" }));
  await waitFor(() =>
    expect(api.supervisorApprove).toHaveBeenCalledWith("sol-1", undefined, undefined),
  );
});

test("rechazar EXIGE motivo", async () => {
  await abrirDetalle(SUPERVISOR, { status: "submitted" });

  fireEvent.click(panelDetalle().getByRole("button", { name: "Rechazar" }));
  await screen.findByText("Rechazar solicitud");

  // Sin motivo: no llama al backend.
  fireEvent.click(dialogo().getByRole("button", { name: "Rechazar" }));
  expect(await screen.findByText("El motivo es obligatorio.")).toBeTruthy();
  expect(api.reject).not.toHaveBeenCalled();

  fireEvent.change(dialogo().getByLabelText("Motivo"), {
    target: { value: "Falta la factura" },
  });
  fireEvent.click(dialogo().getByRole("button", { name: "Rechazar" }));
  await waitFor(() => expect(api.reject).toHaveBeenCalledWith("sol-1", "Falta la factura"));
});

test("solicitar corrección EXIGE motivo", async () => {
  await abrirDetalle(SUPERVISOR, { status: "submitted" });

  fireEvent.click(panelDetalle().getByRole("button", { name: "Solicitar corrección" }));
  await screen.findByText("Solicitar corrección", { selector: ".p-dialog-title" });

  fireEvent.click(dialogo().getByRole("button", { name: "Solicitar corrección" }));
  expect(await screen.findByText("El motivo es obligatorio.")).toBeTruthy();
  expect(api.requestCorrection).not.toHaveBeenCalled();
});

test("aprobada por Supervisor (CFO): aprobar, diferir, corrección y rechazar", async () => {
  await abrirDetalle(CFO, { status: "supervisor_approved", final_concept_id: "c-hoja" });
  const acciones = accionesVisibles();
  expect(acciones).toContain("Aprobar (CFO)");
  expect(acciones).toContain("Diferir");
  expect(acciones).toContain("Solicitar corrección");
  expect(acciones).toContain("Rechazar");
  expect(acciones).not.toContain("Aprobar (Supervisor)");
  expect(acciones).not.toContain("Asignar concepto final");
});

test("el CFO aprueba con motivo opcional", async () => {
  await abrirDetalle(CFO, { status: "supervisor_approved", final_concept_id: "c-hoja" });

  fireEvent.click(panelDetalle().getByRole("button", { name: "Aprobar (CFO)" }));
  await screen.findByText("Aprobación financiera");
  // Sin motivo debe poder confirmarse.
  fireEvent.click(dialogo().getByRole("button", { name: "Aprobar" }));

  await waitFor(() => expect(api.cfoApprove).toHaveBeenCalledWith("sol-1", undefined));
});

test("diferir manda el motivo cuando se escribe", async () => {
  await abrirDetalle(CFO, { status: "supervisor_approved", final_concept_id: "c-hoja" });

  fireEvent.click(panelDetalle().getByRole("button", { name: "Diferir" }));
  await screen.findByText("Diferir solicitud");
  fireEvent.change(dialogo().getByLabelText(/^Motivo/), {
    target: { value: "Sin flujo esta semana" },
  });
  fireEvent.click(dialogo().getByRole("button", { name: "Diferir" }));

  await waitFor(() => expect(api.defer).toHaveBeenCalledWith("sol-1", "Sin flujo esta semana"));
});

test("estados terminales: sin acciones", async () => {
  await abrirDetalle(CFO, { status: "cfo_approved", final_concept_id: "c-hoja" });
  expect(
    panelDetalle().getByText(/No hay acciones disponibles para tu rol en este estado/i),
  ).toBeTruthy();
});

test("Tesorería no tiene acciones sobre una solicitud aprobada", async () => {
  await abrirDetalle(TESORERIA, { status: "cfo_approved", final_concept_id: "c-hoja" });
  expect(
    panelDetalle().getByText(/No hay acciones disponibles para tu rol en este estado/i),
  ).toBeTruthy();
});

test("un error del backend se muestra en el diálogo sin cerrarlo", async () => {
  const { ApiError } = await import("@/shared/lib/api");
  vi.mocked(api.submit).mockRejectedValue(
    new ApiError(
      "MISSING_REQUIRED_ATTACHMENT",
      "La solicitud requiere al menos un documento adjunto.",
      422,
    ),
  );

  await abrirDetalle(CAMPO);
  fireEvent.click(panelDetalle().getByRole("button", { name: "Enviar a revisión" }));
  fireEvent.click(await screen.findByRole("button", { name: "Enviar" }));

  expect(await screen.findByText(/requiere al menos un documento adjunto/i)).toBeTruthy();
  // El diálogo sigue abierto para corregir.
  expect(document.querySelector(".p-dialog")).not.toBeNull();
});
