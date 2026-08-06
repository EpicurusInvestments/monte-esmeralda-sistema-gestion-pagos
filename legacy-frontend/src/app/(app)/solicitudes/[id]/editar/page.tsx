"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { REQUEST_TYPE_LABELS } from "@/lib/labels";
import { ConceptPicker } from "@/components/ConceptPicker";
import { ErrorBox, Spinner } from "@/components/ui";
import type { Concept, RequestType, Supplier } from "@/lib/types";

export default function EditarSolicitudPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    request_type: "supplier_invoice" as RequestType,
    supplier_id: "",
    description: "",
    net_amount: "",
    proposed_concept_id: "",
    proposed_payment_week: "",
    document_date: "",
    due_date: "",
  });

  useEffect(() => {
    Promise.all([
      api.getSolicitud(id),
      api.listSuppliers(),
      api.listConcepts({ leavesOnly: true }),
    ])
      .then(([d, s, c]) => {
        setSuppliers(s);
        setConcepts(c);
        setForm({
          request_type: d.request_type,
          supplier_id: d.supplier_id,
          description: d.description,
          net_amount: String(d.net_amount),
          proposed_concept_id: d.proposed_concept_id || "",
          proposed_payment_week: d.proposed_payment_week || "",
          document_date: d.document_date || "",
          due_date: d.due_date || "",
        });
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Error al cargar.")
      )
      .finally(() => setLoading(false));
  }, [id]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.updateSolicitud(id, {
        request_type: form.request_type,
        supplier_id: form.supplier_id,
        description: form.description,
        net_amount: form.net_amount,
        proposed_concept_id: form.proposed_concept_id || null,
        proposed_payment_week: form.proposed_payment_week || null,
        document_date: form.document_date || null,
        due_date: form.due_date || null,
      });
      router.push(`/solicitudes/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al guardar.");
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Editar Solicitud</h1>
          <p className="subtitle">
            Solo disponible en estado borrador o corrección solicitada.
          </p>
        </div>
      </div>

      <ErrorBox message={error} />

      <form className="panel" onSubmit={onSave}>
        <div className="grid-2">
          <div className="field">
            <label>Tipo de solicitud</label>
            <select
              value={form.request_type}
              onChange={(e) => update("request_type", e.target.value as RequestType)}
            >
              {Object.entries(REQUEST_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Proveedor</label>
            <select
              value={form.supplier_id}
              onChange={(e) => update("supplier_id", e.target.value)}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.legal_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Descripción</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>

        <div className="grid-3">
          <div className="field">
            <label>Monto neto (MXN)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.net_amount}
              onChange={(e) => update("net_amount", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Semana de pago propuesta</label>
            <input
              type="text"
              value={form.proposed_payment_week}
              onChange={(e) => update("proposed_payment_week", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Concepto propuesto</label>
            <ConceptPicker
              concepts={concepts}
              value={form.proposed_concept_id}
              onChange={(id2) => update("proposed_concept_id", id2)}
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Fecha del documento</label>
            <input
              type="date"
              value={form.document_date}
              onChange={(e) => update("document_date", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Fecha de vencimiento</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => update("due_date", e.target.value)}
            />
          </div>
        </div>

        <div className="btn-row">
          <button type="submit" disabled={busy}>
            {busy ? "Guardando…" : "Guardar cambios"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push(`/solicitudes/${id}`)}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
