/** Solicitudes de Pago — lista + panel de detalle, SOLO LECTURA.
 *
 * Los filtros de estado, tipo, proveedor y rango de fechas los resuelve el BACKEND (van como
 * query params y forman parte de la queryKey). La búsqueda por folio o proveedor es LOCAL
 * sobre lo ya traído.
 *
 * La visibilidad por rol también es del backend: Tesorería solo recibe las aprobadas y
 * diferidas, y el Admin de Campo solo las que capturó. Esta pantalla no filtra por rol.
 */

import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { useMemo, useState } from "react";

import { useProveedores } from "@/modules/proveedores/hooks";
import { toISODate } from "@/shared/lib/dates";
import { REQUEST_TYPE_LABELS, formatCurrency, formatDate } from "@/shared/lib/labels";
import { StatusBadge } from "@/shared/ui/StatusBadge";

import { SolicitudDetailPanel } from "../components/SolicitudDetailPanel";
import { useSolicitud, useSolicitudes } from "../hooks";
import { REQUEST_TYPE_OPTIONS, STATUS_OPTIONS } from "../types";
import type { RequestType, SolicitudFiltros, SolicitudListItem, SolicitudStatus } from "../types";

export function SolicitudesPage() {
  // Filtros server-side.
  const [status, setStatus] = useState<SolicitudStatus | null>(null);
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [rango, setRango] = useState<(Date | null)[] | null>(null);
  // Búsqueda local.
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const desde = toISODate(rango?.[0] ?? null);
  const hasta = toISODate(rango?.[1] ?? null);

  const filtros: SolicitudFiltros = useMemo(
    () => ({
      status: status ?? undefined,
      request_type: requestType ?? undefined,
      supplier_id: supplierId ?? undefined,
      date_from: desde ?? undefined,
      date_to: hasta ?? undefined,
    }),
    [status, requestType, supplierId, desde, hasta],
  );

  const lista = useSolicitudes(filtros);
  const detalle = useSolicitud(selectedId);

  // Proveedores para el Dropdown del filtro (se reutiliza el hook de su módulo).
  const proveedores = useProveedores();
  const opcionesProveedor = useMemo(
    () => (proveedores.data ?? []).map((p) => ({ value: p.id, label: p.legal_name })),
    [proveedores.data],
  );

  const solicitudes = useMemo(() => lista.data ?? [], [lista.data]);

  const items = useMemo(() => {
    const texto = q.trim().toLowerCase();
    if (!texto) return solicitudes;
    return solicitudes.filter(
      (s) =>
        s.folio.toLowerCase().includes(texto) ||
        (s.supplier_name ?? "").toLowerCase().includes(texto),
    );
  }, [solicitudes, q]);

  const limpiarFiltros = () => {
    setStatus(null);
    setRequestType(null);
    setSupplierId(null);
    setRango(null);
    setQ("");
    setSelectedId(null);
  };

  const hayFiltros =
    status !== null || requestType !== null || supplierId !== null || rango !== null || q !== "";

  // ── panel derecho ─────────────────────────────────────────────────────────
  let panel;
  if (!selectedId) {
    panel = (
      <div className="d-empty">
        <span>Selecciona una solicitud para ver su detalle y su historial.</span>
      </div>
    );
  } else if (detalle.isLoading) {
    panel = <div className="state-msg">Cargando la solicitud…</div>;
  } else if (detalle.isError) {
    panel = <div className="state-msg error">No se pudo cargar la solicitud.</div>;
  } else if (detalle.data) {
    panel = <SolicitudDetailPanel solicitud={detalle.data} />;
  }

  return (
    <>
      <div className="cat-header">
        <div>
          <div className="cat-title">Solicitudes</div>
          <div className="cat-sub">
            Solicitudes de Pago visibles para tu rol. Vista de <strong>solo lectura</strong>:
            la captura y las acciones de flujo llegan en incrementos posteriores.
          </div>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Buscar por folio o proveedor…"
          aria-label="Buscar solicitud"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <Dropdown
          aria-label="Filtrar por estado"
          options={STATUS_OPTIONS}
          optionLabel="label"
          optionValue="value"
          placeholder="Estado: todos"
          showClear
          style={{ minWidth: 200 }}
          value={status}
          onChange={(e) => {
            setStatus((e.value as SolicitudStatus | null) ?? null);
            setSelectedId(null);
          }}
        />

        <Dropdown
          aria-label="Filtrar por tipo"
          options={REQUEST_TYPE_OPTIONS}
          optionLabel="label"
          optionValue="value"
          placeholder="Tipo: todos"
          showClear
          style={{ minWidth: 190 }}
          value={requestType}
          onChange={(e) => {
            setRequestType((e.value as RequestType | null) ?? null);
            setSelectedId(null);
          }}
        />

        <Dropdown
          aria-label="Filtrar por proveedor"
          options={opcionesProveedor}
          optionLabel="label"
          optionValue="value"
          placeholder={proveedores.isLoading ? "Cargando proveedores…" : "Proveedor: todos"}
          filter
          showClear
          style={{ minWidth: 210 }}
          value={supplierId}
          onChange={(e) => {
            setSupplierId((e.value as string | null) ?? null);
            setSelectedId(null);
          }}
        />

        <Calendar
          aria-label="Filtrar por fecha de documento"
          selectionMode="range"
          dateFormat="dd/mm/yy"
          placeholder="Fecha de documento"
          showIcon
          showButtonBar
          readOnlyInput
          style={{ minWidth: 210 }}
          value={rango}
          onChange={(e) => {
            setRango((e.value as (Date | null)[] | null) ?? null);
            setSelectedId(null);
          }}
        />

        {hayFiltros && (
          <Button
            label="Limpiar"
            size="small"
            outlined
            onClick={limpiarFiltros}
          />
        )}

        <span className="tb-spacer" />
        <span className="tb-count">
          {items.length}
          {items.length !== solicitudes.length && ` de ${solicitudes.length}`}
        </span>
      </div>

      <div className="split">
        <div className="list-pane">
          {lista.isLoading && <div className="state-msg">Cargando solicitudes…</div>}
          {lista.isError && (
            <div className="state-msg error">No se pudieron cargar las solicitudes.</div>
          )}
          {!lista.isLoading && !lista.isError && items.length === 0 && (
            <div className="state-msg">
              No hay solicitudes que coincidan con los filtros seleccionados.
            </div>
          )}
          {!lista.isLoading && !lista.isError && items.length > 0 && (
            <DataTable
              value={items}
              dataKey="id"
              selectionMode="single"
              selection={items.find((s) => s.id === selectedId) ?? null}
              onSelectionChange={(e) =>
                setSelectedId((e.value as SolicitudListItem | null)?.id ?? null)
              }
              scrollable
              scrollHeight="flex"
              size="small"
              aria-label="Solicitudes"
            >
              <Column
                header="Folio"
                style={{ width: 130 }}
                body={(s: SolicitudListItem) => <span className="td-mono">{s.folio}</span>}
              />
              <Column
                header="Proveedor"
                body={(s: SolicitudListItem) => (
                  <span className="td-main">{s.supplier_name ?? "—"}</span>
                )}
              />
              <Column
                header="Tipo"
                style={{ width: 180 }}
                body={(s: SolicitudListItem) => REQUEST_TYPE_LABELS[s.request_type]}
              />
              <Column
                header="Concepto"
                style={{ width: 200 }}
                body={(s: SolicitudListItem) => (
                  <span className="td-2">{s.concept_label ?? "—"}</span>
                )}
              />
              <Column
                header="Monto"
                align="right"
                alignHeader="right"
                style={{ width: 130 }}
                body={(s: SolicitudListItem) => (
                  <span className="td-mono">{formatCurrency(s.net_amount)}</span>
                )}
              />
              <Column
                header="Estado"
                style={{ width: 180 }}
                body={(s: SolicitudListItem) => <StatusBadge status={s.status} />}
              />
              <Column
                header="Fecha doc."
                style={{ width: 120 }}
                body={(s: SolicitudListItem) => formatDate(s.document_date)}
              />
            </DataTable>
          )}
        </div>

        <aside className="detail-pane">{panel}</aside>
      </div>
    </>
  );
}
