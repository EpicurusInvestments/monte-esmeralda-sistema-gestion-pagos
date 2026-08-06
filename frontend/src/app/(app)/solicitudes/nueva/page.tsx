"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, uploadAttachment } from "@/lib/api";
import { REQUEST_TYPE_LABELS, CLEARANCE_LABELS } from "@/lib/labels";
import { ConceptPicker } from "@/components/ConceptPicker";
import { ErrorBox } from "@/components/ui";
import type { Concept, RequestType, Supplier } from "@/lib/types";

export default function NuevaSolicitudPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    api.listSuppliers().then(setSuppliers).catch(() => undefined);
    api.listConcepts({ leavesOnly: true }).then(setConcepts).catch(() => undefined);
  }, []);

  const selectedSupplier = suppliers.find((s) => s.id === form.supplier_id);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.supplier_id) {
      setError("Debe seleccionar un proveedor.");
      return;
    }
    if (files.length === 0) {
      setError("Debe adjuntar al menos un documento de soporte.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.createSolicitud({
        request_type: form.request_type,
        supplier_id: form.supplier_id,
        description: form.description,
        net_amount: form.net_amount,
        proposed_concept_id: form.proposed_concept_id || null,
        proposed_payment_week: form.proposed_payment_week || null,
        document_date: form.document_date || null,
        due_date: form.due_date || null,
      });
      for (const file of files) {
        await uploadAttachment(created.id, file);
      }
      router.push(`/solicitudes/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al crear la solicitud.");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Capturar Solicitud de Pago</h1>
          <p className="subtitle">
            Registre la solicitud y adjunte el documento de soporte para enviarla a revisión.
          </p>
        </div>
      </div>

      <ErrorBox message={error} />

      <form className="panel" onSubmit={onSubmit}>
        <div className="grid-2">
          <div className="field">
            <label>Tipo de solicitud *</label>
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
            <label>Proveedor *</label>
            <select
              value={form.supplier_id}
              onChange={(e) => update("supplier_id", e.target.value)}
              required
            >
              <option value="">— Seleccionar proveedor —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.legal_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedSupplier && (
          <div
            className={
              selectedSupplier.clearance.effective_status === "cleared"
                ? "info-row"
                : "warn-box"
            }
          >
            Cumplimiento del proveedor:{" "}
            <strong>
              {CLEARANCE_LABELS[selectedSupplier.clearance.effective_status] ||
                selectedSupplier.clearance.effective_status}
            </strong>
            {selectedSupplier.clearance.effective_status !== "cleared" &&
              " — se permite la captura, pero el pago podría bloquearse posteriormente."}
          </div>
        )}

        <div className="field">
          <label>Descripción *</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Detalle del concepto a pagar"
            required
          />
        </div>

        <div className="grid-3">
          <div className="field">
            <label>Monto neto (MXN) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.net_amount}
              onChange={(e) => update("net_amount", e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Semana de pago propuesta</label>
            <input
              type="text"
              placeholder="Ej. 2026-W24"
              value={form.proposed_payment_week}
              onChange={(e) => update("proposed_payment_week", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Concepto propuesto (opcional)</label>
            <ConceptPicker
              concepts={concepts}
              value={form.proposed_concept_id}
              onChange={(id) => update("proposed_concept_id", id)}
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

        <div className="field">
          <label>Documentos de soporte * (al menos uno)</label>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          {files.length > 0 && (
            <p className="muted" style={{ marginTop: 6 }}>
              {files.length} archivo(s) seleccionado(s).
            </p>
          )}
        </div>

        <div className="btn-row">
          <button type="submit" disabled={submitting}>
            {submitting ? "Guardando…" : "Crear solicitud (borrador)"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push("/solicitudes")}
          >
            Cancelar
          </button>
        </div>
        <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          La solicitud se crea en estado <strong>borrador</strong>; desde el detalle podrá
          enviarla a revisión del Supervisor.
        </p>
      </form>
    </div>
  );
}
