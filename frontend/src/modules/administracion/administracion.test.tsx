/** Pruebas del módulo Administración de usuarios. `@/shared/lib/api` está mockeado: se
 * verifica el cableado de la pantalla (lista, filtros, alta, edición y el bloqueo por rol) sin
 * backend.
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";

import { Providers } from "@/app/providers";
import { routes } from "@/app/router";
import { api, getToken } from "@/shared/lib/api";
import type { User, UserDetail } from "@/shared/lib/types";

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
      listUsers: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      getRolesPermissions: vi.fn(),
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

const SUPERVISOR: User = {
  id: "u-sup",
  email: "supervisor@monteesmeralda.mx",
  full_name: "Sergio Supervisor",
  role: "supervisor",
  is_active: true,
};

function usuario(over: Partial<UserDetail> & Pick<UserDetail, "id" | "email" | "full_name">) {
  return {
    role: "supervisor",
    is_active: true,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-02-01T12:30:00Z",
    ...over,
  } as UserDetail;
}

const USUARIOS: UserDetail[] = [
  usuario({
    id: "u-admin",
    email: "admin@monteesmeralda.mx",
    full_name: "Administrador del Sistema",
    role: "admin",
  }),
  usuario({
    id: "u-sup",
    email: "supervisor@monteesmeralda.mx",
    full_name: "Sergio Supervisor",
    role: "supervisor",
  }),
  usuario({
    id: "u-cfo",
    email: "cfo@monteesmeralda.mx",
    full_name: "Cristina Finanzas",
    role: "cfo",
  }),
  usuario({
    id: "u-cont",
    email: "contador@monteesmeralda.mx",
    full_name: "Carla Contadora",
    role: "accountant",
    is_active: false,
  }),
];

/** Recorte de `GET /roles-permissions` (el backend manda los 8 roles y 17 capacidades). */
const MATRIZ = {
  capabilities: [
    { code: "solicitud:create", label: "Capturar solicitudes", group: "Solicitudes de Pago" },
    {
      code: "solicitud:supervisor_review",
      label: "Revisión operativa: aprobar, rechazar, pedir corrección y asignar el concepto final",
      group: "Solicitudes de Pago",
    },
    { code: "supplier:view", label: "Ver proveedores", group: "Proveedores" },
    { code: "user:manage", label: "Administrar usuarios y sus roles", group: "Administración" },
  ],
  roles: [
    {
      value: "admin" as const,
      label: "Administrador",
      note: null,
      capabilities: [
        { code: "solicitud:create", label: "Capturar solicitudes", group: "Solicitudes de Pago" },
        {
          code: "user:manage",
          label: "Administrar usuarios y sus roles",
          group: "Administración",
        },
      ],
    },
    {
      value: "supervisor" as const,
      label: "Supervisor",
      note: null,
      capabilities: [
        {
          code: "solicitud:supervisor_review",
          label:
            "Revisión operativa: aprobar, rechazar, pedir corrección y asignar el concepto final",
          group: "Solicitudes de Pago",
        },
        { code: "supplier:view", label: "Ver proveedores", group: "Proveedores" },
      ],
    },
    {
      value: "treasurer" as const,
      label: "Tesorería",
      note: "Aunque tiene «Ver todas las solicitudes», Tesorería solo ve las que ya pasaron revisión: aprobadas por Supervisor, aprobadas por CFO y diferidas.",
      capabilities: [
        { code: "supplier:view", label: "Ver proveedores", group: "Proveedores" },
      ],
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

function sesion(user: User) {
  vi.mocked(getToken).mockReturnValue("token");
  vi.mocked(api.me).mockResolvedValue(user);
}

/** Consultas acotadas al panel derecho: varios textos (nombre, correo, rol) aparecen también
 *  en la fila de la tabla o en el chip del header. */
function panelDetalle() {
  const el = document.querySelector(".detail-pane");
  if (!el) throw new Error("No se encontró el panel de detalle");
  return within(el as HTMLElement);
}

/** Abre un Dropdown de PrimeReact por su nombre accesible: el `aria-label`/`inputId` termina
 *  en un input oculto que NO abre el panel, hay que clicar la raíz `.p-dropdown`. */
function abrirDropdown(label: string) {
  const raiz = screen.getByLabelText(label).closest(".p-dropdown");
  if (!raiz) throw new Error(`No se encontró el Dropdown "${label}"`);
  fireEvent.click(raiz);
}

beforeEach(() => {
  vi.mocked(getToken).mockReturnValue(null);
  vi.mocked(api.me).mockReset();
  vi.mocked(api.listUsers).mockReset();
  vi.mocked(api.createUser).mockReset();
  vi.mocked(api.updateUser).mockReset();
  vi.mocked(api.getRolesPermissions).mockReset();
  vi.mocked(api.listUsers).mockResolvedValue(USUARIOS);
  vi.mocked(api.getRolesPermissions).mockResolvedValue(MATRIZ);
});

test("la lista renderiza los usuarios con su rol y su estado", async () => {
  sesion(ADMIN);
  renderApp("/administracion");

  expect(
    await screen.findByText("Administración de usuarios", { selector: ".cat-title" }),
  ).toBeTruthy();
  expect(await screen.findByText("Sergio Supervisor")).toBeTruthy();
  expect(screen.getByText("Cristina Finanzas")).toBeTruthy();
  expect(screen.getByText("supervisor@monteesmeralda.mx")).toBeTruthy();

  // Rol con las etiquetas de labels.ts.
  expect(screen.getByText("Director de Finanzas (CFO)")).toBeTruthy();

  // El filtro por defecto es "Activos": el inactivo no aparece.
  expect(screen.queryByText("Carla Contadora")).toBeNull();
  expect(screen.getByText("3 de 4")).toBeTruthy();

  // Modo compacto de PrimeReact (el padding sale de esa clase; la fuente, del tema).
  expect(document.querySelector(".p-datatable")?.className).toContain("p-datatable-sm");
});

test("seleccionar un usuario abre el detalle con sus marcas de tiempo", async () => {
  sesion(ADMIN);
  renderApp("/administracion");

  expect(await screen.findByText("Selecciona un usuario para ver su detalle.")).toBeTruthy();

  fireEvent.click(await screen.findByText("Cristina Finanzas"));

  await waitFor(() => {
    expect(panelDetalle().getByText("Registro")).toBeTruthy();
  });
  const panel = panelDetalle();
  expect(panel.getByText("cfo@monteesmeralda.mx", { selector: ".fv" })).toBeTruthy();
  expect(panel.getByText("Activo — puede iniciar sesión")).toBeTruthy();
  expect(panel.getByRole("button", { name: "Editar" })).toBeTruthy();
});

test("crear un usuario manda email, nombre, rol y contraseña", async () => {
  const creado = usuario({
    id: "u-new",
    email: "nuevo@monteesmeralda.mx",
    full_name: "Nueva Persona",
    role: "engineer",
  });
  vi.mocked(api.createUser).mockResolvedValue(creado);
  sesion(ADMIN);
  renderApp("/administracion");

  fireEvent.click(await screen.findByText("+ Nuevo usuario"));
  expect(await screen.findByText("Nuevo usuario")).toBeTruthy();

  fireEvent.change(screen.getByLabelText("Correo"), {
    target: { value: "nuevo@monteesmeralda.mx" },
  });
  fireEvent.change(screen.getByLabelText("Nombre completo"), {
    target: { value: "Nueva Persona" },
  });
  abrirDropdown("Rol");
  // "Ingeniería" no está en la tabla, así que el texto es del panel del Dropdown.
  fireEvent.click(await screen.findByText("Ingeniería"));
  fireEvent.change(screen.getByLabelText("Contraseña"), {
    target: { value: "contrasena123" },
  });

  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  await waitFor(() => {
    expect(api.createUser).toHaveBeenCalledWith({
      email: "nuevo@monteesmeralda.mx",
      full_name: "Nueva Persona",
      role: "engineer",
      password: "contrasena123",
    });
  });
  // Al guardar, el panel vuelve al detalle del usuario creado.
  await waitFor(() => {
    expect(panelDetalle().getByText("Nueva Persona", { selector: ".dh-name" })).toBeTruthy();
  });
});

test("el alta exige contraseña y no llama al backend sin ella", async () => {
  sesion(ADMIN);
  renderApp("/administracion");

  fireEvent.click(await screen.findByText("+ Nuevo usuario"));
  fireEvent.change(await screen.findByLabelText("Correo"), {
    target: { value: "sin@clave.mx" },
  });
  fireEvent.change(screen.getByLabelText("Nombre completo"), {
    target: { value: "Sin Clave" },
  });
  abrirDropdown("Rol");
  fireEvent.click(await screen.findByText("Ingeniería"));

  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  expect(
    await screen.findByText("La contraseña debe tener al menos 8 caracteres."),
  ).toBeTruthy();
  expect(api.createUser).not.toHaveBeenCalled();
});

test("editar precarga los datos, el correo no es editable y la contraseña en blanco no viaja", async () => {
  vi.mocked(api.updateUser).mockResolvedValue(
    usuario({
      id: "u-sup",
      email: "supervisor@monteesmeralda.mx",
      full_name: "Sergio Supervisor Editado",
      role: "supervisor",
    }),
  );
  sesion(ADMIN);
  renderApp("/administracion");

  fireEvent.click(await screen.findByText("Sergio Supervisor"));
  await waitFor(() => expect(panelDetalle().getByText("Registro")).toBeTruthy());
  fireEvent.click(panelDetalle().getByRole("button", { name: "Editar" }));

  // Precarga.
  const correo = (await screen.findByLabelText("Correo")) as HTMLInputElement;
  const nombre = screen.getByLabelText("Nombre completo") as HTMLInputElement;
  expect(correo.value).toBe("supervisor@monteesmeralda.mx");
  expect(nombre.value).toBe("Sergio Supervisor");
  // El correo es la identidad de la cuenta: se muestra pero no se edita.
  expect(correo.disabled).toBe(true);
  // El estado activo/inactivo solo existe en edición.
  expect(screen.getByLabelText("Activo — puede iniciar sesión")).toBeTruthy();

  fireEvent.change(nombre, { target: { value: "Sergio Supervisor Editado" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  await waitFor(() => {
    expect(api.updateUser).toHaveBeenCalledWith("u-sup", {
      full_name: "Sergio Supervisor Editado",
      role: "supervisor",
      is_active: true,
    });
  });
  // Sin `password` en el payload: en blanco significa «no la cambies».
  const enviado = vi.mocked(api.updateUser).mock.calls[0]?.[1] ?? {};
  expect("password" in enviado).toBe(false);
});

test("al editar, una contraseña escrita sí viaja en el PATCH", async () => {
  vi.mocked(api.updateUser).mockResolvedValue(USUARIOS[1]!);
  sesion(ADMIN);
  renderApp("/administracion");

  fireEvent.click(await screen.findByText("Sergio Supervisor"));
  await waitFor(() => expect(panelDetalle().getByText("Registro")).toBeTruthy());
  fireEvent.click(panelDetalle().getByRole("button", { name: "Editar" }));

  fireEvent.change(await screen.findByLabelText("Contraseña"), {
    target: { value: "nuevaClave123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  await waitFor(() => {
    expect(api.updateUser).toHaveBeenCalledWith("u-sup", {
      full_name: "Sergio Supervisor",
      role: "supervisor",
      is_active: true,
      password: "nuevaClave123",
    });
  });
});

test("una contraseña demasiado corta al editar se rechaza sin llamar al backend", async () => {
  sesion(ADMIN);
  renderApp("/administracion");

  fireEvent.click(await screen.findByText("Sergio Supervisor"));
  await waitFor(() => expect(panelDetalle().getByText("Registro")).toBeTruthy());
  fireEvent.click(panelDetalle().getByRole("button", { name: "Editar" }));

  fireEvent.change(await screen.findByLabelText("Contraseña"), { target: { value: "corta" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  expect(
    await screen.findByText("Deja el campo en blanco o usa al menos 8 caracteres."),
  ).toBeTruthy();
  expect(api.updateUser).not.toHaveBeenCalled();
});

test("el correo duplicado se muestra sobre el campo sin perder lo capturado", async () => {
  const { ApiError } = await import("@/shared/lib/api");
  vi.mocked(api.createUser).mockRejectedValue(
    new ApiError("VALIDATION_ERROR", "Ya existe un usuario con ese correo.", 422),
  );
  sesion(ADMIN);
  renderApp("/administracion");

  fireEvent.click(await screen.findByText("+ Nuevo usuario"));
  fireEvent.change(await screen.findByLabelText("Correo"), {
    target: { value: "supervisor@monteesmeralda.mx" },
  });
  fireEvent.change(screen.getByLabelText("Nombre completo"), {
    target: { value: "Duplicado" },
  });
  abrirDropdown("Rol");
  fireEvent.click(await screen.findByText("Ingeniería"));
  fireEvent.change(screen.getByLabelText("Contraseña"), {
    target: { value: "contrasena123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  expect(await screen.findByText("Ya existe un usuario con ese correo.")).toBeTruthy();
  // El formulario sigue abierto con los datos escritos.
  expect((screen.getByLabelText("Nombre completo") as HTMLInputElement).value).toBe(
    "Duplicado",
  );
});

test("el filtro de rol deja solo los de ese rol", async () => {
  sesion(ADMIN);
  renderApp("/administracion");

  await screen.findByText("Sergio Supervisor");
  abrirDropdown("Filtrar por rol");
  fireEvent.click(await screen.findByText("Rol: Supervisor"));

  await waitFor(() => {
    expect(screen.queryByText("Cristina Finanzas")).toBeNull();
  });
  expect(screen.getByText("Sergio Supervisor")).toBeTruthy();
  expect(screen.getByText("1 de 4")).toBeTruthy();
});

test("el filtro de estado 'inactivos' deja solo las cuentas sin acceso", async () => {
  sesion(ADMIN);
  renderApp("/administracion");

  await screen.findByText("Sergio Supervisor");
  abrirDropdown("Filtrar por estado");
  fireEvent.click(await screen.findByText("Estado: inactivos"));

  await waitFor(() => {
    expect(screen.queryByText("Sergio Supervisor")).toBeNull();
  });
  expect(screen.getByText("Carla Contadora")).toBeTruthy();
  expect(screen.getByText("1 de 4")).toBeTruthy();
});

test("sin user:manage la pantalla se bloquea y el sidebar no la ofrece", async () => {
  sesion(SUPERVISOR);
  renderApp("/administracion");

  expect(
    await screen.findByText("No tienes permiso para ver esta pantalla."),
  ).toBeTruthy();
  // No se consultó el backend de usuarios.
  expect(api.listUsers).not.toHaveBeenCalled();

  const menu = screen.getByRole("navigation", { name: "Menú principal" });
  expect(within(menu).queryByText("Administración")).toBeNull();
});

test("el sidebar enlaza Administración para el Admin y la marca activa", async () => {
  sesion(ADMIN);
  renderApp("/administracion");

  const menu = await screen.findByRole("navigation", { name: "Menú principal" });
  const enlace = within(menu).getByRole("link", { name: "Administración" });
  expect(enlace.getAttribute("href")).toBe("/administracion");
  expect(enlace.className).toContain("active");
});

test("«Roles y permisos» abre la matriz en el panel, en solo lectura", async () => {
  sesion(ADMIN);
  renderApp("/administracion");

  // La matriz NO se pide al entrar a la pantalla: solo al abrir su panel.
  await screen.findByText("Sergio Supervisor");
  expect(api.getRolesPermissions).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Roles y permisos" }));

  const panel = panelDetalle();
  expect(await panel.findByText("Roles y permisos", { selector: ".dh-name" })).toBeTruthy();
  await waitFor(() => expect(api.getRolesPermissions).toHaveBeenCalled());

  // Un rol con sus capacidades legibles: el primero se muestra desplegado.
  const nombreAdmin = await panel.findByText("Administrador", { selector: ".rp-role-name" });
  const bloqueAdmin = within(nombreAdmin.closest(".rp-role") as HTMLElement);
  expect(bloqueAdmin.getByText("Administrar usuarios y sus roles")).toBeTruthy();
  expect(bloqueAdmin.getByText("user:manage")).toBeTruthy();
  // Conteo sobre el total del catálogo y agrupación por área.
  expect(bloqueAdmin.getByText("2 de 4")).toBeTruthy();
  expect(bloqueAdmin.getByText("Administración", { selector: ".rp-group" })).toBeTruthy();

  // Aviso de que la edición todavía no existe.
  expect(panel.getByText(/solo consulta/i)).toBeTruthy();
});

test("la vista de roles no ofrece NINGÚN control de edición de permisos", async () => {
  sesion(ADMIN);
  renderApp("/administracion");

  await screen.findByText("Sergio Supervisor");
  fireEvent.click(screen.getByRole("button", { name: "Roles y permisos" }));

  const panel = panelDetalle();
  await panel.findByText("Administrador", { selector: ".rp-role-name" });

  // Nada editable: ni casillas, ni campos, ni combos, ni un botón de guardar.
  expect(panel.queryAllByRole("checkbox")).toHaveLength(0);
  expect(panel.queryAllByRole("textbox")).toHaveLength(0);
  expect(panel.queryAllByRole("combobox")).toHaveLength(0);
  expect(panel.queryByRole("button", { name: "Guardar" })).toBeNull();
  expect(panel.queryByRole("button", { name: /editar/i })).toBeNull();
  // Los únicos botones son el cierre y los desplegables de cada rol.
  const botones = panel.getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? "rol");
  expect(botones.filter((l) => l === "Cerrar roles y permisos")).toHaveLength(1);
});

test("otro rol muestra sus propias capacidades, y su nota si la tiene", async () => {
  sesion(ADMIN);
  renderApp("/administracion");

  await screen.findByText("Sergio Supervisor");
  fireEvent.click(screen.getByRole("button", { name: "Roles y permisos" }));

  const panel = panelDetalle();
  fireEvent.click(await panel.findByText("Tesorería", { selector: ".rp-role-name" }));

  expect(panel.getByText(/solo ve las que ya pasaron revisión/)).toBeTruthy();
});

test("se cierra la matriz y se vuelve al detalle del usuario", async () => {
  sesion(ADMIN);
  renderApp("/administracion");

  // Con un usuario seleccionado de antes…
  fireEvent.click(await screen.findByText("Cristina Finanzas"));
  await waitFor(() => expect(panelDetalle().getByText("Registro")).toBeTruthy());

  fireEvent.click(screen.getByRole("button", { name: "Roles y permisos" }));
  await panelDetalle().findByText("Roles y permisos", { selector: ".dh-name" });

  fireEvent.click(panelDetalle().getByRole("button", { name: "Cerrar roles y permisos" }));

  // …se recupera ese mismo detalle, no el estado vacío.
  await waitFor(() => {
    expect(panelDetalle().getByText("Cristina Finanzas", { selector: ".dh-name" })).toBeTruthy();
  });
});

test("un error al cargar la matriz se muestra sin romper la pantalla", async () => {
  vi.mocked(api.getRolesPermissions).mockRejectedValue(new Error("boom"));
  sesion(ADMIN);
  renderApp("/administracion");

  await screen.findByText("Sergio Supervisor");
  fireEvent.click(screen.getByRole("button", { name: "Roles y permisos" }));

  expect(
    await panelDetalle().findByText("No se pudo cargar la matriz de permisos.", undefined, {
      timeout: 4000,
    }),
  ).toBeTruthy();
  // La lista sigue en pie.
  expect(screen.getByText("Sergio Supervisor")).toBeTruthy();
});
