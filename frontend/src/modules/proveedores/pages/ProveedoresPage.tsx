/** Proveedores — patrón lista + panel de detalle, con cumplimientos anidados en el detalle.
 *
 * Búsqueda y filtros son LOCALES: `GET /suppliers` no acepta parámetros (devuelve todos,
 * ordenados por razón social).
 *
 * Escritura con `supplier:create` / `supplier:edit` (Admin y Admin de Campo) y registro de
 * cumplimiento solo con `clearance:create` (Admin). El backend revalida siempre.
 */

import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { useMemo, useState } from "react";

import { useAuth } from "@/shared/lib/auth";
import { canManageSuppliers, canRecordClearance } from "@/shared/lib/nav";
import { Badge } from "@/shared/ui/Badge";

import { labelCumplimiento, toneCumplimiento } from "../clearance";
import { ProveedorDetailPanel } from "../components/ProveedorDetailPanel";
import { ProveedorForm } from "../components/ProveedorForm";
import { useCreateProveedor, useProveedores, useUpdateProveedor } from "../hooks";
import { EFFECTIVE_STATUS_FILTERS, vacioANull } from "../types";
import type { ProveedorFormValues, Supplier } from "../types";

type Modo = "view" | "new" | "edit";
type FiltroEstado = "activos" | "todos";

/** Form → payload del backend: los opcionales vacíos viajan como null. */
function aPayload(data: ProveedorFormValues): Partial<Supplier> {
  return {
    legal_name: data.legal_name,
    rfc: vacioANull(data.rfc),
    contact_name: vacioANull(data.contact_name),
    email: vacioANull(data.email),
    phone: vacioANull(data.phone),
    bank_name: vacioANull(data.bank_name),
    bank_account: vacioANull(data.bank_account),
    clabe: vacioANull(data.clabe),
    status: data.status,
  };
}

export function ProveedoresPage() {
  const { user } = useAuth();
  const canEdit = user ? canManageSuppliers(user.role) : false;
  const canClearance = user ? canRecordClearance(user.role) : false;

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("activos");
  const [cumplimiento, setCumplimiento] = useState<string | null>(null);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [modo, setModo] = useState<Modo>("view");

  const lista = useProveedores();
  const crear = useCreateProveedor();
  const actualizar = useUpdateProveedor();

  const proveedores = useMemo(() => lista.data ?? [], [lista.data]);

  const items = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return proveedores.filter((p) => {
      if (estado === "activos" && p.status !== "active") return false;
      if (cumplimiento && p.clearance.effective_status !== cumplimiento) return false;
      if (!texto) return true;
      return (
        p.legal_name.toLowerCase().includes(texto) ||
        (p.rfc ?? "").toLowerCase().includes(texto)
      );
    });
  }, [proveedores, q, estado, cumplimiento]);

  const reset = () => {
    setSelected(null);
    setModo("view");
  };

  const onCrear = async (data: ProveedorFormValues) => {
    const nuevo = await crear.mutateAsync(aPayload(data));
    setSelected(nuevo);
    setModo("view");
  };

  const onActualizar = async (data: ProveedorFormValues) => {
    if (!selected) return;
    const upd = await actualizar.mutateAsync({ id: selected.id, data: aPayload(data) });
    setSelected(upd);
    setModo("view");
  };

  // ── panel derecho ─────────────────────────────────────────────────────────
  let detalle;
  if (modo === "new") {
    detalle = (
      <ProveedorForm
        title="Nuevo proveedor"
        submitting={crear.isPending}
        onSubmit={onCrear}
        onCancel={reset}
      />
    );
  } else if (modo === "edit" && selected) {
    detalle = (
      <ProveedorForm
        title={`Editar: ${selected.legal_name}`}
        defaultValues={{
          legal_name: selected.legal_name,
          rfc: selected.rfc ?? "",
          contact_name: selected.contact_name ?? "",
          email: selected.email ?? "",
          phone: selected.phone ?? "",
          bank_name: selected.bank_name ?? "",
          bank_account: selected.bank_account ?? "",
          clabe: selected.clabe ?? "",
          status: selected.status,
        }}
        submitting={actualizar.isPending}
        onSubmit={onActualizar}
        onCancel={() => setModo("view")}
      />
    );
  } else if (selected) {
    detalle = (
      <ProveedorDetailPanel
        proveedor={selected}
        canEdit={canEdit}
        canRecordClearance={canClearance}
        onEdit={() => setModo("edit")}
      />
    );
  } else {
    detalle = (
      <div className="d-empty">
        <span>Selecciona un proveedor para ver su detalle y su cumplimiento.</span>
      </div>
    );
  }

  const contactoBody = (p: Supplier) => (
    <div>
      <div>{p.contact_name ?? "—"}</div>
      {p.email && (
        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{p.email}</div>
      )}
    </div>
  );

  return (
    <>
      <div className="cat-header">
        <div>
          <div className="cat-title">Proveedores</div>
          <div className="cat-sub">
            Datos de proveedores y su <strong>cumplimiento</strong> documental. El sistema no
            evalúa: solo registra el resultado de una revisión externa.
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
            + Nuevo proveedor
          </button>
        )}
      </div>

      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Buscar por razón social o RFC…"
          aria-label="Buscar proveedor"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <span className="tb-label">Estado</span>
        <button
          type="button"
          className={`fp${estado === "activos" ? " active" : ""}`}
          onClick={() => {
            setEstado("activos");
            reset();
          }}
        >
          Activos
        </button>
        <button
          type="button"
          className={`fp${estado === "todos" ? " active" : ""}`}
          onClick={() => {
            setEstado("todos");
            reset();
          }}
        >
          Todos
        </button>

        <span className="tb-label">Cumplimiento</span>
        <button
          type="button"
          className={`fp${cumplimiento === null ? " active" : ""}`}
          onClick={() => setCumplimiento(null)}
        >
          Cualquiera
        </button>
        {EFFECTIVE_STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`fp${cumplimiento === f.value ? " active" : ""}`}
            onClick={() => setCumplimiento(f.value)}
          >
            {f.label}
          </button>
        ))}

        <span className="tb-spacer" />
        <span className="tb-count">
          {items.length} de {proveedores.length}
        </span>
      </div>

      <div className="split">
        <div className="list-pane">
          {lista.isLoading && <div className="state-msg">Cargando proveedores…</div>}
          {lista.isError && (
            <div className="state-msg error">No se pudieron cargar los proveedores.</div>
          )}
          {!lista.isLoading && !lista.isError && items.length === 0 && (
            <div className="state-msg">No hay proveedores para el filtro seleccionado.</div>
          )}
          {!lista.isLoading && !lista.isError && items.length > 0 && (
            <DataTable
              value={items}
              dataKey="id"
              selectionMode="single"
              selection={selected}
              onSelectionChange={(e) => {
                setSelected(e.value as Supplier);
                setModo("view");
              }}
              scrollable
              scrollHeight="flex"
              size="small"
              aria-label="Proveedores"
            >
              <Column
                header="Razón social"
                body={(p: Supplier) => <span className="td-main">{p.legal_name}</span>}
              />
              <Column
                header="RFC"
                style={{ width: 150 }}
                body={(p: Supplier) => <span className="td-mono">{p.rfc ?? "—"}</span>}
              />
              <Column header="Contacto" style={{ width: 220 }} body={contactoBody} />
              <Column
                header="Estado"
                style={{ width: 110 }}
                body={(p: Supplier) => (
                  <Badge
                    tone={p.status === "active" ? "green" : "gray"}
                    label={p.status === "active" ? "Activo" : "Inactivo"}
                  />
                )}
              />
              <Column
                header="Cumplimiento"
                style={{ width: 210 }}
                body={(p: Supplier) => (
                  <Badge
                    tone={toneCumplimiento(p.clearance.effective_status)}
                    label={labelCumplimiento(p.clearance.effective_status)}
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
