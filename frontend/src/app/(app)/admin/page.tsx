"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/labels";
import { ErrorBox } from "@/components/ui";
import type { Role, User } from "@/lib/types";

const ROLES: Role[] = [
  "admin",
  "engineer",
  "accountant",
  "field_admin",
  "supervisor",
  "cfo",
  "treasurer",
  "ceo",
];

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    role: "field_admin" as Role,
    password: "",
  });

  const load = useCallback(async () => {
    try {
      setUsers(await api.listUsers());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar usuarios.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.createUser(form);
      setForm({ email: "", full_name: "", role: "field_admin", password: "" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al crear usuario.");
    }
  }

  async function toggleActive(u: User) {
    setError(null);
    try {
      await api.updateUser(u.id, { is_active: !u.is_active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al actualizar.");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Administración</h1>
          <p className="subtitle">Gestión de usuarios y accesos al sistema.</p>
        </div>
      </div>

      <ErrorBox message={error} />

      <div className="panel">
        <h3>Accesos rápidos</h3>
        <div className="btn-row">
          <Link className="btn-secondary" href="/solicitudes">
            Solicitudes
          </Link>
          <Link className="btn-secondary" href="/proveedores">
            Proveedores
          </Link>
          <Link className="btn-secondary" href="/conceptos">
            Catálogo de conceptos
          </Link>
        </div>
      </div>

      <form className="panel" onSubmit={onCreate}>
        <h3>Crear usuario</h3>
        <div className="grid-2">
          <div className="field">
            <label>Nombre completo *</label>
            <input
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Correo *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Rol *</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Contraseña *</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
        </div>
        <button type="submit">Crear usuario</button>
      </form>

      <div className="panel">
        <h3>Usuarios</h3>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>{u.email}</td>
                <td>{ROLE_LABELS[u.role]}</td>
                <td>
                  <span className={`badge ${u.is_active ? "green" : "gray"}`}>
                    {u.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td>
                  <button className="btn-secondary" onClick={() => toggleActive(u)}>
                    {u.is_active ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
