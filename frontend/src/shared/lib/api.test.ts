/** Pruebas del cliente HTTP: el interceptor de 401 (sesión expirada).
 *
 * Aquí NO se mockea `@/shared/lib/api`: se simula `fetch` para ejercitar el `request()` real,
 * que es donde vive el interceptor.
 */

import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { ApiError, api, getToken, setOnUnauthorized, setToken } from "@/shared/lib/api";

function respuesta(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

beforeEach(() => {
  setToken("token-de-prueba");
});

afterEach(() => {
  setOnUnauthorized(null);
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

test("un 401 en una llamada AUTENTICADA limpia el token y avisa a la app", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      respuesta(401, { code: "AUTHENTICATION_ERROR", message: "Sesión expirada." }),
    ),
  );
  const avisado = vi.fn();
  setOnUnauthorized(avisado);

  await expect(api.me()).rejects.toBeInstanceOf(ApiError);

  expect(avisado).toHaveBeenCalledTimes(1);
  expect(getToken()).toBeNull();
});

test("el 401 del LOGIN no cierra sesión: son credenciales inválidas", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      respuesta(401, { code: "AUTHENTICATION_ERROR", message: "Correo o contraseña incorrectos." }),
    ),
  );
  const avisado = vi.fn();
  setOnUnauthorized(avisado);

  await expect(api.login("a@b.mx", "mala")).rejects.toMatchObject({ status: 401 });

  // El login va con `auth: false`: no debe tocar la sesión ni avisar.
  expect(avisado).not.toHaveBeenCalled();
  expect(getToken()).toBe("token-de-prueba");
});

test("otros errores (403, 422) no cierran la sesión", async () => {
  const avisado = vi.fn();
  setOnUnauthorized(avisado);

  for (const status of [403, 422, 500]) {
    vi.stubGlobal("fetch", vi.fn(async () => respuesta(status, { code: "X", message: "x" })));
    await expect(api.me()).rejects.toBeInstanceOf(ApiError);
  }

  expect(avisado).not.toHaveBeenCalled();
  expect(getToken()).toBe("token-de-prueba");
});
