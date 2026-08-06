"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { ErrorBox } from "@/components/ui";
import type { Concept } from "@/lib/types";

const SECTION_LABELS: Record<string, string> = {
  ING: "INGRESOS",
  EGR: "EGRESOS — COSTOS",
  GAS: "GASTOS",
  ACT: "ACTIVOS",
};

interface TreeNode extends Concept {
  children: TreeNode[];
  depth: number;
}

export default function ConceptosPage() {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .listConcepts({ activeOnly: true })
      .then(setConcepts)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Error al cargar.")
      );
  }, []);

  const flattened = useMemo(() => buildOrderedTree(concepts), [concepts]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return flattened;
    // Keep matching leaves and their ancestor headers for context.
    const matchIds = new Set<string>();
    for (const n of flattened) {
      if (
        n.name.toLowerCase().includes(q) ||
        n.code.toLowerCase().includes(q)
      ) {
        matchIds.add(n.id);
        let pid = n.parent_id;
        while (pid) {
          matchIds.add(pid);
          pid = flattened.find((x) => x.id === pid)?.parent_id ?? null;
        }
      }
    }
    return flattened.filter((n) => matchIds.has(n.id));
  }, [flattened, search]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Catálogo de Conceptos de Flujo</h1>
          <p className="subtitle">
            Estructura jerárquica. Los encabezados (en mayúsculas / negritas) son
            agrupaciones y no son seleccionables; solo los conceptos hoja pueden asignarse
            a una solicitud.
          </p>
        </div>
      </div>

      <ErrorBox message={error} />

      <div className="panel">
        <div className="field" style={{ maxWidth: 320 }}>
          <label>Buscar</label>
          <input
            placeholder="Código o nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th style={{ width: 130 }}>Código</th>
              <th>Concepto</th>
              <th style={{ width: 110 }}>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((n) => (
              <tr key={n.id}>
                <td className="muted">{n.code}</td>
                <td>
                  <span style={{ paddingLeft: n.depth * 18 }}>
                    {n.is_header ? (
                      <strong>
                        {n.parent_id === null
                          ? SECTION_LABELS[n.code] || n.name
                          : n.name}
                      </strong>
                    ) : (
                      n.name
                    )}
                  </span>
                </td>
                <td>
                  {n.is_header ? (
                    <span className="badge gray">Encabezado</span>
                  ) : (
                    <span className="badge blue">Concepto hoja</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function buildOrderedTree(concepts: Concept[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const c of concepts) byId.set(c.id, { ...c, children: [], depth: 0 });
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortFn = (a: TreeNode, b: TreeNode) =>
    a.sort_order - b.sort_order || a.code.localeCompare(b.code);
  const out: TreeNode[] = [];
  const walk = (node: TreeNode, depth: number) => {
    node.depth = depth;
    out.push(node);
    node.children.sort(sortFn).forEach((c) => walk(c, depth + 1));
  };
  roots.sort(sortFn).forEach((r) => walk(r, 0));
  return out;
}
