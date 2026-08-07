/** Hooks de datos del módulo Proveedores (TanStack Query sobre el cliente central).
 *
 * Registrar un cumplimiento invalida DOS cosas: los cumplimientos del proveedor y la lista
 * de proveedores, porque `clearance.effective_status` (el badge de la lista) se deriva del
 * cumplimiento más reciente y cambia con el alta.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/shared/lib/api";
import type { Clearance, ClearanceStatus, Supplier } from "@/shared/lib/types";

const PROVEEDORES_KEY = "proveedores";
const CUMPLIMIENTOS_KEY = "cumplimientos";

export interface CumplimientoPayload {
  status: ClearanceStatus;
  clearance_date?: string | null;
  valid_until?: string | null;
  compliance_reference?: string | null;
  notes?: string | null;
}

export function useProveedores() {
  return useQuery<Supplier[]>({
    queryKey: [PROVEEDORES_KEY],
    queryFn: () => api.listSuppliers(),
  });
}

function useInvalidateProveedores() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [PROVEEDORES_KEY] });
}

export function useCreateProveedor() {
  const invalidate = useInvalidateProveedores();
  return useMutation({
    mutationFn: (data: Partial<Supplier>) => api.createSupplier(data),
    onSuccess: invalidate,
  });
}

export function useUpdateProveedor() {
  const invalidate = useInvalidateProveedores();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) =>
      api.updateSupplier(id, data),
    onSuccess: invalidate,
  });
}

export function useCumplimientos(supplierId: string | null) {
  return useQuery<Clearance[]>({
    queryKey: [CUMPLIMIENTOS_KEY, supplierId],
    queryFn: () => api.listClearances(supplierId as string),
    enabled: supplierId != null,
  });
}

export function useCreateCumplimiento(supplierId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CumplimientoPayload) => api.createClearance(supplierId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CUMPLIMIENTOS_KEY, supplierId] });
      // El badge de cumplimiento de la lista se deriva del último registro.
      qc.invalidateQueries({ queryKey: [PROVEEDORES_KEY] });
    },
  });
}
