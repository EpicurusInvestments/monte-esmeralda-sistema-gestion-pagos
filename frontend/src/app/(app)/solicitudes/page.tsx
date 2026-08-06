"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canCreateSolicitud } from "@/lib/nav";
import {
  REQUEST_TYPE_LABELS,
  STATUS_LABELS,
  formatCurrency,
  formatDate,
} from "@/lib/labels";
import { ErrorBox, StatusBadge } from "@/components/ui";
import type {
  Concept,
  RequestType,
  SolicitudListItem,
  SolicitudStatus,
  Supplier,
} from "@/lib/types";

export default function SolicitudesListPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SolicitudListItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [conceptId, setConceptId] = useState("");
  const [requestType, setRequestType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listSolicitudes({
        status: (status || undefined) as SolicitudStatus | undefined,
        supplier_id: supplierId || undefined,
        concept_id: conceptId || undefined,
        request_type: (requestType || undefined) as RequestType | undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setRows(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, [status, supplierId, conceptId, requestType, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api.listSuppliers().then(setSuppliers).catch(() => undefined);
    api
      .listConcepts({ leavesOnly: true })
      .then(setConcepts)
      .catch(() => undefined);
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Solicitudes de Pago</h1>
          <p className="subtitle">Listado y seguimiento de solicitudes</p>
        </div>
        {user && canCreateSolicitud(user.role) && (
          <Link className="btn" href="/solicitudes/nueva">
            + Nueva solicitud
          </Link>
        )}
      </div>

      <div className="panel">
        <div className="filters">
          <div className="field">
            <label>Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Proveedor</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Todos</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.legal_name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Concepto</label>
            <select value={conceptId} onChange={(e) => setConceptId(e.target.value)}>
              <option value="">Todos</option>
              {concepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Tipo</label>
            <select value={requestType} onChange={(e) => setRequestType(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(REQUEST_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Desde</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="field">
            <label>Hasta</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <button
            className="btn-secondary"
            onClick={() => {
              setStatus("");
              setSupplierId("");
              setConceptId("");
              setRequestType("");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Limpiar
          </button>
        </div>
      </div>

      <ErrorBox message={error} />

      <div className="panel">
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="muted">No hay solicitudes que coincidan con los filtros.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Proveedor</th>
                <th>Tipo</th>
                <th>Concepto</th>
                <th className="num">Monto neto</th>
                <th>Estado</th>
                <th>Fecha captura</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.folio}</strong>
                  </td>
                  <td>{r.supplier_name || "—"}</td>
                  <td>{REQUEST_TYPE_LABELS[r.request_type]}</td>
                  <td>{r.concept_label || <span className="muted">Sin asignar</span>}</td>
                  <td className="num">{formatCurrency(r.net_amount)}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>{formatDate(r.created_at)}</td>
                  <td>
                    <Link href={`/solicitudes/${r.id}`}>Ver</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
