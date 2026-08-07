/** Pruebas de humo del andamiaje + autenticación.
 *
 * `@/shared/lib/api` está mockeado: estas pruebas verifican el cableado de sesión, guards y
 * layout SIN depender del backend.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";

import { Providers } from "@/app/providers";
import { routes } from "@/app/router";
import { api, getToken } from "@/shared/lib/api";
import type { LoginResponse, User } from "@/shared/lib/types";

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
    api: { login: vi.fn(), me: vi.fn() },
  };
});

const TESORERA: User = {
  id: "u-1",
  email: "tesoreria@monteesmeralda.mx",
  full_name: "Ana Tesorería",
  role: "treasurer",
  is_active: true,
};

/** Monta la MISMA config de rutas con el router de componentes.
 *
 * Se usa `MemoryRouter` + `useRoutes` en vez de `createMemoryRouter` a propósito: el data
 * router de react-router construye un `Request` en cada navegación, y en jsdom el
 * `AbortSignal` de jsdom no es el que espera el `Request` de undici (Node), lo que rompe las
 * pruebas con "Expected signal to be an instance of AbortSignal". El árbol de rutas que se
 * ejercita es el mismo (`routes`).
 */
function AppRoutes() {
  return useRoutes(routes);
}

function renderApp(initialPath = "/") {
  return render(
    <Providers>
      <MemoryRouter initialEntries={[initialPath]}>
        <AppRoutes />
      </MemoryRouter>
    </Providers>,
  );
}

beforeEach(() => {
  vi.mocked(getToken).mockReturnValue(null);
  vi.mocked(api.me).mockReset();
  vi.mocked(api.login).mockReset();
});

test("sin sesión, el área privada redirige al login", async () => {
  renderApp("/");
  expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
  // No debe haberse consultado /auth/me si no hay token guardado.
  expect(api.me).not.toHaveBeenCalled();
});

test("con token guardado, revalida contra /auth/me y muestra el layout con el usuario", async () => {
  vi.mocked(getToken).mockReturnValue("token-guardado");
  vi.mocked(api.me).mockResolvedValue(TESORERA);

  renderApp("/");

  expect(await screen.findByText("Ana Tesorería")).toBeTruthy();
  expect(screen.getByText("Tesorería")).toBeTruthy();
  // Iniciales del avatar ("Ana Tesorería" → "AT").
  expect(screen.getByText("AT")).toBeTruthy();
  expect(screen.getByText("Frontend en migración")).toBeTruthy();
  expect(api.me).toHaveBeenCalledTimes(1);
});

test("el sidebar se filtra por rol", async () => {
  vi.mocked(getToken).mockReturnValue("token-guardado");
  vi.mocked(api.me).mockResolvedValue(TESORERA);

  renderApp("/");
  await screen.findByText("Ana Tesorería");

  const menu = screen.getByRole("navigation", { name: "Menú principal" });
  expect(menu.textContent).toContain("Solicitudes");
  // Tesorería NO administra ni revisa: esas entradas no deben aparecer.
  expect(menu.textContent).not.toContain("Administración");
  expect(menu.textContent).not.toContain("Bandeja de Aprobaciones");
});

test("login correcto entra y muestra el layout", async () => {
  const resp: LoginResponse = {
    access_token: "token-nuevo",
    token_type: "bearer",
    user: TESORERA,
  };
  vi.mocked(api.login).mockResolvedValue(resp);

  renderApp("/login");
  await screen.findByRole("heading", { name: "Iniciar sesión" });

  fireEvent.change(screen.getByLabelText("Correo"), {
    target: { value: TESORERA.email },
  });
  fireEvent.change(screen.getByLabelText("Contraseña"), {
    target: { value: "treasurer123" },
  });
  fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

  expect(await screen.findByText("Ana Tesorería")).toBeTruthy();
  expect(api.login).toHaveBeenCalledWith(TESORERA.email, "treasurer123");
});

test("credenciales inválidas (401) muestran el error sin romper el formulario", async () => {
  const { ApiError } = await import("@/shared/lib/api");
  vi.mocked(api.login).mockRejectedValue(
    new ApiError("AUTHENTICATION_ERROR", "Correo o contraseña incorrectos.", 401),
  );

  renderApp("/login");
  await screen.findByRole("heading", { name: "Iniciar sesión" });

  fireEvent.change(screen.getByLabelText("Correo"), {
    target: { value: "admin@monteesmeralda.mx" },
  });
  fireEvent.change(screen.getByLabelText("Contraseña"), {
    target: { value: "mala" },
  });
  fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

  expect(await screen.findByText("Credenciales inválidas")).toBeTruthy();
  // El formulario sigue en pie y el botón vuelve a estar disponible.
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /entrar/i })).not.toHaveProperty(
      "disabled",
      true,
    );
  });
  expect(screen.getByLabelText("Correo")).toBeTruthy();
});

test("validación local: correo inválido no llama a la API", async () => {
  renderApp("/login");
  await screen.findByRole("heading", { name: "Iniciar sesión" });

  fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "no-es-correo" } });
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "x" } });
  fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

  expect(await screen.findByText("Escribe un correo válido")).toBeTruthy();
  expect(api.login).not.toHaveBeenCalled();
});
