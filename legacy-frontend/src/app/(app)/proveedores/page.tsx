"use client";

import { useCallback as useCb, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canManageSuppliers, canRecordClearance } from "@/lib/nav";
import { CLEARANCE_LABELS, CLEARANCE_TONE, formatDate } from "@/lib/labels";
import { Badge, ErrorBox } from "@/components/ui";
import type { Clearance, ClearanceStatus, Supplier } from "@/lib/types";

const EMPTY_SUPPLIER = {
  legal_name: "",
  rfc: "",
  contact_name: "",
  email: "",
  phone: "",
  bank_name: "",
  bank_account: "",
  clabe: "",
};

export default function ProveedoresPage() {
  const { user } = useAuth();
  const canManage = !!user && canManageSuppliers(user.role);
  const canClear = !!user && canRecordClearance(user.role);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_SUPPLIER });
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [clearances, setClearances] = useState<Clearance[]>([]);

  const load = useCb(async () => {
    try {
      setSuppliers(await api.listSuppliers());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openSupplier(s: Supplier) {
    setSelected(s);
    setError(null);
    try {
      setClearances(await api.listClearances(s.id));
    } catch {
      setClearances([]);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.createSupplier(createForm);
      setCreateForm({ ...EMPTY_SUPPLIER });
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al crear proveedor.");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Proveedores</h1>
          <p className="subtitle">Padrón de proveedores y estado de cumplimiento.</p>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Cerrar" : "+ Nuevo proveedor"}
          </button>
        )}
      </div>

      <ErrorBox message={error} />

      {showCreate && canManage && (
        <form className="panel" onSubmit={onCreate}>
          <h3>Nuevo proveedor</h3>
          <div className="grid-2">
            <div className="field">
              <label>Razón social *</label>
              <input
                required
                value={createForm.legal_name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, legal_name: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>RFC</label>
              <input
                value={createForm.rfc}
                onChange={(e) => setCreateForm({ ...createForm, rfc: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Contacto</label>
              <input
                value={createForm.contact_name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, contact_name: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Correo</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Teléfono</label>
              <input
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Banco</label>
              <input
                value={createForm.bank_name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, bank_name: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Cuenta</label>
              <input
                value={createForm.bank_account}
                onChange={(e) =>
                  setCreateForm({ ...createForm, bank_account: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>CLABE</label>
              <input
                value={createForm.clabe}
                onChange={(e) => setCreateForm({ ...createForm, clabe: e.target.value })}
              />
            </div>
          </div>
          <button type="submit">Guardar proveedor</button>
        </form>
      )}

      <div className="panel">
        {suppliers.length === 0 ? (
          <p className="muted">No hay proveedores registrados.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Razón social</th>
                <th>RFC</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th>Cumplimiento</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.legal_name}</strong>
                  </td>
                  <td>{s.rfc || "—"}</td>
                  <td>{s.contact_name || "—"}</td>
                  <td>{s.status === "active" ? "Activo" : "Inactivo"}</td>
                  <td>
                    <Badge tone={CLEARANCE_TONE[s.clearance.effective_status] || "gray"}>
                      {CLEARANCE_LABELS[s.clearance.effective_status] ||
                        s.clearance.effective_status}
                    </Badge>
                  </td>
                  <td>
                    <button className="btn-secondary" onClick={() => openSupplier(s)}>
                      Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <SupplierDetail
          supplier={selected}
          clearances={clearances}
          canManage={canManage}
          canClear={canClear}
          onClose={() => setSelected(null)}
          onChanged={async () => {
            await load();
            const fresh = await api.getSupplier(selected.id);
            setSelected(fresh);
            setClearances(await api.listClearances(selected.id));
          }}
        />
      )}
    </div>
  );
}

function SupplierDetail({
  supplier,
  clearances,
  canManage,
  canClear,
  onClose,
  onChanged,
}: {
  supplier: Supplier;
  clearances: Clearance[];
  canManage: boolean;
  canClear: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [edit, setEdit] = useState({
    legal_name: supplier.legal_name,
    rfc: supplier.rfc || "",
    contact_name: supplier.contact_name || "",
    email: supplier.email || "",
    phone: supplier.phone || "",
    bank_name: supplier.bank_name || "",
    bank_account: supplier.bank_account || "",
    clabe: supplier.clabe || "",
    status: supplier.status,
  });
  const [clr, setClr] = useState({
    status: "cleared" as ClearanceStatus,
    clearance_date: "",
    valid_until: "",
    compliance_reference: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.updateSupplier(supplier.id, edit);
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al guardar.");
    }
  }

  async function addClearance(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.createClearance(supplier.id, {
        status: clr.status,
        clearance_date: clr.clearance_date || null,
        valid_until: clr.valid_until || null,
        compliance_reference: clr.compliance_reference || null,
        notes: clr.notes || null,
      });
      setClr({
        status: "cleared",
        clearance_date: "",
        valid_until: "",
        compliance_reference: "",
        notes: "",
      });
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al registrar cumplimiento.");
    }
  }

  return (
    <div className="panel">
      <div className="page-header">
        <h2>{supplier.legal_name}</h2>
        <button className="btn-secondary" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <ErrorBox message={error} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <form onSubmit={save}>
          <h3>Datos del proveedor</h3>
          <div className="field">
            <label>Razón social</label>
            <input
              value={edit.legal_name}
              disabled={!canManage}
              onChange={(e) => setEdit({ ...edit, legal_name: e.target.value })}
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>RFC</label>
              <input
                value={edit.rfc}
                disabled={!canManage}
                onChange={(e) => setEdit({ ...edit, rfc: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Contacto</label>
              <input
                value={edit.contact_name}
                disabled={!canManage}
                onChange={(e) => setEdit({ ...edit, contact_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>CLABE</label>
              <input
                value={edit.clabe}
                disabled={!canManage}
                onChange={(e) => setEdit({ ...edit, clabe: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Estado</label>
              <select
                value={edit.status}
                disabled={!canManage}
                onChange={(e) =>
                  setEdit({ ...edit, status: e.target.value as Supplier["status"] })
                }
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>
          {canManage && <button type="submit">Guardar cambios</button>}
        </form>

        <div>
          <h3>Cumplimiento (registro externo)</h3>
          <p className="muted" style={{ fontSize: 12 }}>
            El sistema no evalúa al proveedor; solo registra el resultado de cumplimiento
            externo. Un cumplimiento vencido cuenta como no vigente.
          </p>
          {clearances.length === 0 ? (
            <p className="muted">Sin registros de cumplimiento.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Vigencia</th>
                  <th>Referencia</th>
                </tr>
              </thead>
              <tbody>
                {clearances.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Badge tone={CLEARANCE_TONE[c.status] || "gray"}>
                        {CLEARANCE_LABELS[c.status] || c.status}
                      </Badge>
                    </td>
                    <td>{formatDate(c.valid_until)}</td>
                    <td>{c.compliance_reference || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {canClear && (
            <form onSubmit={addClearance} style={{ marginTop: 12 }}>
              <div className="grid-2">
                <div className="field">
                  <label>Estado</label>
                  <select
                    value={clr.status}
                    onChange={(e) =>
                      setClr({ ...clr, status: e.target.value as ClearanceStatus })
                    }
                  >
                    <option value="cleared">Cumplimiento vigente</option>
                    <option value="pending">Pendiente</option>
                    <option value="blocked">Bloqueado</option>
                  </select>
                </div>
                <div className="field">
                  <label>Referencia</label>
                  <input
                    value={clr.compliance_reference}
                    onChange={(e) =>
                      setClr({ ...clr, compliance_reference: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label>Fecha de cumplimiento</label>
                  <input
                    type="date"
                    value={clr.clearance_date}
                    onChange={(e) => setClr({ ...clr, clearance_date: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Vigente hasta</label>
                  <input
                    type="date"
                    value={clr.valid_until}
                    onChange={(e) => setClr({ ...clr, valid_until: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="btn-secondary">
                Registrar cumplimiento
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
