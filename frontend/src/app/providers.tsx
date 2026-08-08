/** Providers globales: TanStack Query + PrimeReact + sesión (AuthProvider). */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrimeReactProvider } from "primereact/api";
import { useState } from "react";
import type { ReactNode } from "react";

import { AuthProvider } from "@/shared/lib/auth";
import { ToastProvider } from "@/shared/ui/toast";

function crearQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  // Un cliente POR INSTANCIA, no un singleton de módulo: así la caché no se comparte entre
  // raíces de React (en las pruebas, cada render arranca con caché limpia y son
  // independientes). En la app hay un solo `Providers`, así que el comportamiento es el mismo.
  const [queryClient] = useState(crearQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <PrimeReactProvider>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </PrimeReactProvider>
    </QueryClientProvider>
  );
}
