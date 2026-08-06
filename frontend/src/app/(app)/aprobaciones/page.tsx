"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { REQUEST_TYPE_LABELS, formatCurrency, formatDate } from "@/lib/labels";
import { ErrorBox } from "@/components/ui";
import type { SolicitudListItem } from "@/lib/types";

export default function SupervisorInboxPage() {
  const [rows, setRows] = useState<SolicitudListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listSolicitudes({ status: "submitted" })
      .then(setRows)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Error al cargar.")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Bandeja de Aprobaciones</h1>
          <p className="subtitle">
            Solicitudes enviadas pendientes de revisión operativa del Supervisor.
          </p>
        </div>
      </div>

      <ErrorBox message={error} />

      <div className="panel">
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="muted">No hay solicitudes pendientes de revisión.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Proveedor</th>
                <th>Tipo</th>
                <th>Concepto propuesto</th>
                <th className="num">Monto neto</th>
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
                  <td>{formatDate(r.created_at)}</td>
                  <td>
                    <Link className="btn-secondary" href={`/solicitudes/${r.id}`}>
                      Revisar
                    </Link>
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
