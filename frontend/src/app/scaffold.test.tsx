import { render, screen } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { expect, test } from "vitest";

import { Providers } from "@/app/providers";
import { router } from "@/app/router";

test("la ruta raiz renderiza el layout con el placeholder", async () => {
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
  expect(await screen.findByText("Frontend en migración")).toBeTruthy();
  // El sidebar debe listar los destinos de nav.ts.
  expect(await screen.findByText("Solicitudes")).toBeTruthy();
  expect(await screen.findByText("Bandeja de Aprobaciones")).toBeTruthy();
  expect(screen.getByRole("navigation", { name: "Menú principal" })).toBeTruthy();
});
