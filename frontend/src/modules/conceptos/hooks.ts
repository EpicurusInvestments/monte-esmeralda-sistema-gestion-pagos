/** Hooks de datos del módulo Conceptos (TanStack Query sobre el cliente central `api.ts`).
 *
 * Las mutaciones invalidan TODAS las queries de conceptos (`["conceptos"]`), porque crear o
 * editar un concepto cambia también el árbol (`path`, `parent_name`) del resto.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/shared/lib/api";
import type { Concept, ConceptCreatePayload, ConceptUpdatePayload } from "@/shared/lib/types";

const CONCEPTOS_KEY = "conceptos";

export function useConceptos(opts: { activeOnly: boolean }) {
  return useQuery<Concept[]>({
    queryKey: [CONCEPTOS_KEY, { activeOnly: opts.activeOnly }],
    queryFn: () => api.listConcepts({ activeOnly: opts.activeOnly }),
  });
}

function useInvalidateConceptos() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [CONCEPTOS_KEY] });
}

export function useCreateConcepto() {
  const invalidate = useInvalidateConceptos();
  return useMutation({
    mutationFn: (data: ConceptCreatePayload) => api.createConcept(data),
    onSuccess: invalidate,
  });
}

export function useUpdateConcepto() {
  const invalidate = useInvalidateConceptos();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConceptUpdatePayload }) =>
      api.updateConcept(id, data),
    onSuccess: invalidate,
  });
}
