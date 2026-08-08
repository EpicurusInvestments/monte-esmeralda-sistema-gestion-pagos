/** Pruebas de adjuntos y comentarios en el detalle de una Solicitud (api mockeado).
 *
 * Reglas que se verifican:
 *  - Descargar y comentar: cualquiera que vea la solicitud.
 *  - Adjuntar: `solicitud:upload` + dueño/Admin + estado draft o correction_requested.
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";

import { Providers } from "@/app/providers";
import { routes } from "@/app/router";
import { api, downloadAttachment, getToken, uploadAttachment } from "@/shared/lib/api";
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
      addComment: vi.fn(),
      listSuppliers: vi.fn(),
    },
  };
});

const CAMPO: User = {
  id: "u-campo",
  email: "campo@monteesmeralda.mx",
  full_name: "Fabián Campo",
  role: "field_admin",
  is_active: true,
};

/** Contabilidad: ve la solicitud pero no puede adjuntar (ni es dueño). */
const CONTADOR: User = {
  id: "u-cont",
  email: "contador@monteesmeralda.mx",
  full_name: "Carla Contadora",
  role: "accountant",
  is_active: true,
};

const FILA: SolicitudListItem = {
  id: "sol-1",
  folio: "SP-000001",
  request_type: "service",
  supplier_id: "s-1",
  supplier_name: "Constructora del Valle S.A. de C.V.",
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

function renderApp() {
  function AppRoutes() {
    return useRoutes(routes);
  }
  return render(
    <Providers>
      <MemoryRouter initialEntries={["/solicitudes"]}>
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

/** Abre el detalle de la única solicitud de la lista. */
async function abrirDetalle() {
  renderApp();
  fireEvent.click(await screen.findByText("SP-000001"));
  await waitFor(() => expect(panelDetalle().getByText("Servicio de grúa")).toBeTruthy());
}

function archivo(nombre: string, tipo: string, bytes: number): File {
  const file = new File(["x"], nombre, { type: tipo });
  // `File` en jsdom no permite fijar `size` por constructor.
  Object.defineProperty(file, "size", { value: bytes });
  return file;
}

beforeEach(() => {
  vi.mocked(getToken).mockReturnValue("token");
  vi.mocked(api.me).mockReset().mockResolvedValue(CAMPO);
  vi.mocked(api.listSolicitudes).mockReset().mockResolvedValue([FILA]);
  vi.mocked(api.getSolicitud).mockReset().mockResolvedValue(detalle());
  vi.mocked(api.addComment).mockReset().mockResolvedValue({
    id: "com-1",
    solicitud_id: "sol-1",
    author_id: "u-campo",
    author_name: "Fabián Campo",
    body: "Listo",
    created_at: "2026-07-20T11:00:00Z",
  });
  vi.mocked(api.listSuppliers).mockReset().mockResolvedValue([]);
  vi.mocked(uploadAttachment).mockReset().mockResolvedValue({
    id: "att-2",
    solicitud_id: "sol-1",
    file_name: "nuevo.pdf",
    content_type: "application/pdf",
    uploaded_by: "u-campo",
    uploaded_at: "2026-07-20T12:00:00Z",
  });
  vi.mocked(downloadAttachment).mockReset().mockResolvedValue(undefined);
});

test("subir un archivo llama a uploadAttachment y refresca el detalle", async () => {
  await abrirDetalle();

  const input = panelDetalle().getByLabelText(/^Archivo/) as HTMLInputElement;
  const file = archivo("nuevo.pdf", "application/pdf", 1024);
  fireEvent.change(input, { target: { files: [file] } });

  const boton = panelDetalle().getByRole("button", { name: "Subir" });
  expect(boton).not.toHaveProperty("disabled", true);
  fireEvent.click(boton);

  await waitFor(() => expect(uploadAttachment).toHaveBeenCalledTimes(1));
  expect(vi.mocked(uploadAttachment).mock.calls[0][0]).toBe("sol-1");
  expect(vi.mocked(uploadAttachment).mock.calls[0][1]).toBe(file);
  // Se vuelve a pedir el detalle para refrescar la lista de adjuntos.
  await waitFor(() => expect(api.getSolicitud).toHaveBeenCalledTimes(2));
});

test("el botón Subir está deshabilitado hasta elegir archivo", async () => {
  await abrirDetalle();
  expect(panelDetalle().getByRole("button", { name: "Subir" })).toHaveProperty(
    "disabled",
    true,
  );
});

test("la guarda de tamaño rechaza un archivo de más de 15 MB", async () => {
  await abrirDetalle();

  const input = panelDetalle().getByLabelText(/^Archivo/) as HTMLInputElement;
  fireEvent.change(input, {
    target: { files: [archivo("enorme.pdf", "application/pdf", 20 * 1024 * 1024)] },
  });

  expect(await screen.findByText(/máximo son 15 MB/i)).toBeTruthy();
  expect(uploadAttachment).not.toHaveBeenCalled();
  expect(panelDetalle().getByRole("button", { name: "Subir" })).toHaveProperty(
    "disabled",
    true,
  );
});

test("la guarda de tipo rechaza un formato no permitido", async () => {
  await abrirDetalle();

  const input = panelDetalle().getByLabelText(/^Archivo/) as HTMLInputElement;
  fireEvent.change(input, {
    target: { files: [archivo("script.exe", "application/octet-stream", 1024)] },
  });

  expect(await screen.findByText(/Formato no permitido/i)).toBeTruthy();
  expect(uploadAttachment).not.toHaveBeenCalled();
});

test("descargar un adjunto llama a downloadAttachment con su nombre", async () => {
  await abrirDetalle();

  fireEvent.click(panelDetalle().getByRole("button", { name: "Descargar" }));

  await waitFor(() => expect(downloadAttachment).toHaveBeenCalledTimes(1));
  expect(vi.mocked(downloadAttachment).mock.calls[0]).toEqual([
    "sol-1",
    "att-1",
    "comprobante.pdf",
  ]);
});

test("comentar llama a addComment, limpia el campo y refresca", async () => {
  await abrirDetalle();

  const caja = panelDetalle().getByLabelText("Nuevo comentario") as HTMLTextAreaElement;
  // Vacío: el botón está deshabilitado.
  expect(panelDetalle().getByRole("button", { name: "Comentar" })).toHaveProperty(
    "disabled",
    true,
  );

  fireEvent.change(caja, { target: { value: "Falta la factura" } });
  fireEvent.click(panelDetalle().getByRole("button", { name: "Comentar" }));

  await waitFor(() => expect(api.addComment).toHaveBeenCalledWith("sol-1", "Falta la factura"));
  await waitFor(() => expect(caja.value).toBe(""));
  await waitFor(() => expect(api.getSolicitud).toHaveBeenCalledTimes(2));
});

test("el control de carga NO aparece si el estado ya no admite adjuntos", async () => {
  vi.mocked(api.getSolicitud).mockResolvedValue(detalle({ status: "submitted" }));
  await abrirDetalle();

  expect(panelDetalle().queryByLabelText(/^Archivo/)).toBeNull();
  expect(panelDetalle().queryByRole("button", { name: "Subir" })).toBeNull();
  // Pero descargar y comentar siguen disponibles.
  expect(panelDetalle().getByRole("button", { name: "Descargar" })).toBeTruthy();
  expect(panelDetalle().getByRole("button", { name: "Comentar" })).toBeTruthy();
});

test("el control de carga NO aparece si el usuario no es dueño ni Admin", async () => {
  vi.mocked(api.me).mockResolvedValue(CONTADOR);
  await abrirDetalle();

  expect(panelDetalle().queryByLabelText(/^Archivo/)).toBeNull();
  // Contabilidad sí puede descargar y comentar.
  expect(panelDetalle().getByRole("button", { name: "Descargar" })).toBeTruthy();
  expect(panelDetalle().getByRole("button", { name: "Comentar" })).toBeTruthy();
});

test("un error del backend al subir se muestra sin romper el panel", async () => {
  const { ApiError } = await import("@/shared/lib/api");
  vi.mocked(uploadAttachment).mockRejectedValue(
    new ApiError(
      "INVALID_WORKFLOW_TRANSITION",
      "Solo pueden adjuntarse documentos en borrador o durante una corrección.",
      409,
    ),
  );

  await abrirDetalle();
  const input = panelDetalle().getByLabelText(/^Archivo/) as HTMLInputElement;
  fireEvent.change(input, {
    target: { files: [archivo("ok.pdf", "application/pdf", 2048)] },
  });
  fireEvent.click(panelDetalle().getByRole("button", { name: "Subir" }));

  expect(await screen.findByText(/Solo pueden adjuntarse documentos/)).toBeTruthy();
  // El panel sigue en pie.
  expect(panelDetalle().getByText("comprobante.pdf")).toBeTruthy();
});
