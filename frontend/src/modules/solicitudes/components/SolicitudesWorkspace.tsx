/** Patrón lista + panel de detalle de Solicitudes, compartido por la pantalla general y por
 * las BANDEJAS de Supervisor y CFO.
 *
 * Las tres pantallas son la misma cosa con distinta configuración:
 *  - `/solicitudes`: todos los estados, filtros completos y botón de captura.
 *  - `/aprobaciones`: estado fijo `submitted`.
 *  - `/aprobaciones-financieras`: estado fijo `supervisor_approved`.
 *
 * Con `estadoFijo` el filtro de estado desaparece (no tendría sentido cambiarlo) y, cuando la
 * solicitud seleccionada deja la bandeja porque cambió de estado, el panel lo avisa en vez de
 * seguir mostrando algo que ya no aplica.
 *
 * La visibilidad por rol la aplica el BACKEND (`can_view_solicitud`); estas pantallas no
 * filtran por rol.
 */

import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useProveedores } from "@/modules/proveedores/hooks";
import { useAuth } from "@/shared/lib/auth";
import { toISODate } from "@/shared/lib/dates";
import { REQUEST_TYPE_LABELS, formatCurrency, formatDate } from "@/shared/lib/labels";
import { canCreateSolicitud } from "@/shared/lib/nav";
import { StatusBadge } from "@/shared/ui/StatusBadge";

import { useSolicitud, useSolicitudes } from "../hooks";
import { REQUEST_TYPE_OPTIONS, STATUS_OPTIONS } from "../types";
import type { RequestType, SolicitudFiltros, SolicitudListItem, SolicitudStatus } from "../types";
import { SolicitudDetailPanel } from "./SolicitudDetailPanel";

interface SolicitudesWorkspaceProps {
  titulo: string;
  subtitulo: ReactNode;
  /** Bandeja: fija el estado y oculta su filtro. */
  estadoFijo?: SolicitudStatus;
  /** Botón «+ Nueva solicitud» (además requiere `solicitud:create`). */
  mostrarNueva?: boolean;
  /** Filtros de tipo, proveedor y rango de fechas (la búsqueda local siempre está). */
  filtrosCompletos?: boolean;
  /** Palabra del contador, p.ej. "pendientes". */
  etiquetaContador?: string;
  /** Nombre accesible de la tabla. */
  ariaTabla: string;
  /** Texto del panel cuando no hay selección. */
  textoSinSeleccion: string;
}

export function SolicitudesWorkspace({
  titulo,
  subtitulo,
  estadoFijo,
  mostrarNueva = false,
  filtrosCompletos = false,
  etiquetaContador,
  ariaTabla,
  textoSinSeleccion,
}: SolicitudesWorkspaceProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const puedeCapturar = mostrarNueva && user ? canCreateSolicitud(user.role) : false;
  const esBandeja = estadoFijo !== undefined;

  // Filtros server-side.
  const [status, setStatus] = useState<SolicitudStatus | null>(null);
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [rango, setRango] = useState<(Date | null)[] | null>(null);
  // Búsqueda local.
  const [q, setQ] = useState("");
  // `?seleccion=<id>` permite volver de la captura/edición con esa solicitud abierta.
  const [selectedId, setSelectedId] = useState<string | null>(
    () => searchParams.get("seleccion") || null,
  );

  const desde = toISODate(rango?.[0] ?? null);
  const hasta = toISODate(rango?.[1] ?? null);

  const filtros: SolicitudFiltros = useMemo(
    () => ({
      status: estadoFijo ?? status ?? undefined,
      request_type: requestType ?? undefined,
      supplier_id: supplierId ?? undefined,
      date_from: desde ?? undefined,
      date_to: hasta ?? undefined,
    }),
    [estadoFijo, status, requestType, supplierId, desde, hasta],
  );

  const lista = useSolicitudes(filtros);
  const detalle = useSolicitud(selectedId);

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

  /** La seleccionada salió de la bandeja: se actuó sobre ella y cambió de estado. */
  const salioDeLaBandeja =
    esBandeja &&
    selectedId !== null &&
    !lista.isLoading &&
    !lista.isFetching &&
    !solicitudes.some((s) => s.id === selectedId);

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
  if (salioDeLaBandeja) {
    panel = (
      <div className="d-empty">
        <span>
          Esta solicitud ya salió de la bandeja: cambió de estado y le toca a otra etapa.
        </span>
        <button type="button" className="btn btn-sm" onClick={() => setSelectedId(null)}>
          Cerrar
        </button>
      </div>
    );
  } else if (!selectedId) {
    panel = (
      <div className="d-empty">
        <span>{textoSinSeleccion}</span>
      </div>
    );
  } else if (detalle.isLoading) {
    panel = <div className="state-msg">Cargando la solicitud…</div>;
  } else if (detalle.isError) {
    panel = <div className="state-msg error">No se pudo cargar la solicitud.</div>;
  } else if (detalle.data) {
    panel = <SolicitudDetailPanel solicitud={detalle.data} />;
  }

  const vacio = esBandeja
    ? "No hay solicitudes pendientes en esta bandeja."
    : "No hay solicitudes que coincidan con los filtros seleccionados.";

  return (
    <>
      <div className="cat-header">
        <div>
          <div className="cat-title">{titulo}</div>
          <div className="cat-sub">{subtitulo}</div>
        </div>
        {puedeCapturar && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/solicitudes/nueva")}
          >
            + Nueva solicitud
          </button>
        )}
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

        {!esBandeja && (
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
        )}

        {filtrosCompletos && (
          <>
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
          </>
        )}

        {hayFiltros && (
          <Button label="Limpiar" size="small" outlined onClick={limpiarFiltros} />
        )}

        <span className="tb-spacer" />
        <span className="tb-count">
          {items.length}
          {items.length !== solicitudes.length && ` de ${solicitudes.length}`}
          {etiquetaContador ? ` ${etiquetaContador}` : ""}
        </span>
      </div>

      <div className="split">
        <div className="list-pane">
          {lista.isLoading && <div className="state-msg">Cargando solicitudes…</div>}
          {lista.isError && (
            <div className="state-msg error">No se pudieron cargar las solicitudes.</div>
          )}
          {!lista.isLoading && !lista.isError && items.length === 0 && (
            <div className="state-msg">{vacio}</div>
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
              aria-label={ariaTabla}
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
