/** Providers globales: TanStack Query + PrimeReact + sesión (AuthProvider). */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrimeReactProvider } from "primereact/api";
import type { ReactNode } from "react";

import { AuthProvider } from "@/shared/lib/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PrimeReactProvider>
        <AuthProvider>{children}</AuthProvider>
      </PrimeReactProvider>
    </QueryClientProvider>
  );
}
