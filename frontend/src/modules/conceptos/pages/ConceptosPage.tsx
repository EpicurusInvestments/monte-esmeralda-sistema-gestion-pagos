/** Catálogo de Conceptos — primera pantalla de negocio migrada.
 *
 * Patrón lista + panel de detalle: DataTable a la izquierda, detalle (o formulario) a la
 * derecha. La búsqueda y el filtro por sección son LOCALES sobre lo ya traído; el toggle
 * "Solo activos / Todos" sí cambia la consulta (`active_only` del backend).
 *
 * Escritura solo con `concept:edit` (hoy Admin, ver `canEditConcepts` en nav.ts). El backend
 * revalida: ocultar los botones es únicamente UX.
 */

import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { useMemo, useState } from "react";

import { useAuth } from "@/shared/lib/auth";
import { canEditConcepts } from "@/shared/lib/nav";
import { Badge } from "@/shared/ui/Badge";

import { ConceptoDetailPanel } from "../components/ConceptoDetailPanel";
import { ConceptoForm } from "../components/ConceptoForm";
import { useConceptos, useCreateConcepto, useUpdateConcepto } from "../hooks";
import { SECTIONS, sectionLabel } from "../types";
import type { Concept, ConceptoFormValues } from "../types";

type Modo = "view" | "new" | "edit";

export function ConceptosPage() {
  const { user } = useAuth();
  const canEdit = user ? canEditConcepts(user.role) : false;

  const [activeOnly, setActiveOnly] = useState(true);
  const [q, setQ] = useState("");
  const [section, setSection] = useState<string | null>(null);
  const [selected, setSelected] = useState<Concept | null>(null);
  const [modo, setModo] = useState<Modo>("view");

  const lista = useConceptos({ activeOnly });
  const crear = useCreateConcepto();
  const actualizar = useUpdateConcepto();

  const conceptos = useMemo(() => lista.data ?? [], [lista.data]);
  const headers = useMemo(() => conceptos.filter((c) => c.is_header), [conceptos]);

  const items = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return conceptos.filter((c) => {
      if (section && c.section !== section) return false;
      if (!texto) return true;
      return (
        c.code.toLowerCase().includes(texto) || c.name.toLowerCase().includes(texto)
      );
    });
  }, [conceptos, q, section]);

  const reset = () => {
    setSelected(null);
    setModo("view");
  };

  const onCrear = async (data: ConceptoFormValues) => {
    const nuevo = await crear.mutateAsync(data);
    setSelected(nuevo);
    setModo("view");
  };

  const onActualizar = async (data: ConceptoFormValues) => {
    if (!selected) return;
    const upd = await actualizar.mutateAsync({ id: selected.id, data });
    setSelected(upd);
    setModo("view");
  };

  // ── panel derecho ─────────────────────────────────────────────────────────
  let detalle;
  if (modo === "new") {
    detalle = (
      <ConceptoForm
        title="Nuevo concepto"
        headers={headers}
        submitting={crear.isPending}
        onSubmit={onCrear}
        onCancel={reset}
      />
    );
  } else if (modo === "edit" && selected) {
    detalle = (
      <ConceptoForm
        title={`Editar: ${selected.name}`}
        headers={headers.filter((h) => h.id !== selected.id)}
        defaultValues={{
          code: selected.code,
          name: selected.name,
          section: selected.section,
          parent_id: selected.parent_id,
          is_header: selected.is_header,
          active: selected.active,
          sort_order: selected.sort_order,
        }}
        submitting={actualizar.isPending}
        onSubmit={onActualizar}
        onCancel={() => setModo("view")}
      />
    );
  } else if (selected) {
    detalle = (
      <ConceptoDetailPanel
        concepto={selected}
        canEdit={canEdit}
        onEdit={() => setModo("edit")}
      />
    );
  } else {
    detalle = (
      <div className="d-empty">
        <span>Selecciona un concepto para ver su detalle.</span>
      </div>
    );
  }

  // ── columnas ──────────────────────────────────────────────────────────────
  const nombreBody = (c: Concept) => (
    <div>
      <div className={c.is_header ? "td-main" : undefined}>{c.name}</div>
      {c.path && c.path !== c.name && (
        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{c.path}</div>
      )}
    </div>
  );

  return (
    <>
      <div className="cat-header">
        <div>
          <div className="cat-title">Catálogo de Conceptos</div>
          <div className="cat-sub">
            Árbol de conceptos de flujo. Solo las <strong>hojas</strong> son asignables a una
            Solicitud; los encabezados agrupan.
          </div>
        </div>
        {canEdit && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setSelected(null);
              setModo("new");
            }}
          >
            + Nuevo concepto
          </button>
        )}
      </div>

      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Buscar por código o nombre…"
          aria-label="Buscar concepto"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <span className="tb-label">Sección</span>
        <button
          type="button"
          className={`fp${section === null ? " active" : ""}`}
          onClick={() => setSection(null)}
        >
          Todas
        </button>
        {SECTIONS.map((s) => (
          <button
            key={s.code}
            type="button"
            className={`fp${section === s.code ? " active" : ""}`}
            onClick={() => setSection(s.code)}
            title={s.label}
          >
            {s.code}
          </button>
        ))}

        <span className="tb-label">Estado</span>
        <button
          type="button"
          className={`fp${activeOnly ? " active" : ""}`}
          onClick={() => {
            setActiveOnly(true);
            reset();
          }}
        >
          Solo activos
        </button>
        <button
          type="button"
          className={`fp${!activeOnly ? " active" : ""}`}
          onClick={() => {
            setActiveOnly(false);
            reset();
          }}
        >
          Todos
        </button>

        <span className="tb-spacer" />
        <span className="tb-count">
          {items.length} de {conceptos.length}
        </span>
      </div>

      <div className="split">
        <div className="list-pane">
          {lista.isLoading && <div className="state-msg">Cargando conceptos…</div>}
          {lista.isError && (
            <div className="state-msg error">No se pudieron cargar los conceptos.</div>
          )}
          {!lista.isLoading && !lista.isError && items.length === 0 && (
            <div className="state-msg">No hay conceptos para el filtro seleccionado.</div>
          )}
          {!lista.isLoading && !lista.isError && items.length > 0 && (
            <DataTable
              value={items}
              dataKey="id"
              selectionMode="single"
              selection={selected}
              onSelectionChange={(e) => {
                setSelected(e.value as Concept);
                setModo("view");
              }}
              scrollable
              scrollHeight="flex"
              size="small"
              aria-label="Conceptos"
            >
              <Column
                header="Código"
                style={{ width: 130 }}
                body={(c: Concept) => <span className="td-mono">{c.code}</span>}
              />
              <Column header="Nombre" body={nombreBody} />
              <Column
                header="Sección"
                style={{ width: 170 }}
                body={(c: Concept) => sectionLabel(c.section)}
              />
              <Column
                header="Tipo"
                style={{ width: 120 }}
                body={(c: Concept) => (
                  <Badge
                    tone={c.is_header ? "blue" : "gray"}
                    label={c.is_header ? "Encabezado" : "Hoja"}
                  />
                )}
              />
              <Column
                header="Estado"
                style={{ width: 110 }}
                body={(c: Concept) => (
                  <Badge
                    tone={c.active ? "green" : "gray"}
                    label={c.active ? "Activo" : "Inactivo"}
                  />
                )}
              />
            </DataTable>
          )}
        </div>

        <aside className="detail-pane">{detalle}</aside>
      </div>
    </>
  );
}
