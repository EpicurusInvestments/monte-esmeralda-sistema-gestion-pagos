/** Matriz de roles y permisos, en SOLO LECTURA, dentro del panel de detalle.
 *
 * Por qué no es una tabla rol × capacidad: son 8 roles y 17 capacidades, y el panel mide entre
 * 420 y 620px. Una matriz de 8 columnas ahí obliga a scroll horizontal y a truncar etiquetas.
 * En este ancho se lee mejor **un rol a la vez**: cada rol se despliega y muestra sus
 * capacidades agrupadas por área, con el conteo siempre visible para comparar de un vistazo.
 *
 * Todo el texto (etiquetas de rol, de capacidad, agrupación y notas) viene del backend
 * (`app/labels.py`), así que esta vista no decide criterio: solo lo presenta.
 */

import { useState } from "react";

import type { Capability, RolePermissions } from "@/shared/lib/types";

interface RolesPermisosPanelProps {
  roles: RolePermissions[];
  /** Catálogo completo; se usa para situar el conteo de cada rol sobre el total. */
  totalCapacidades: number;
  cargando?: boolean;
  error?: boolean;
  onClose: () => void;
}

/** Agrupa por `group` conservando el orden en que llegan las capacidades del backend. */
function porGrupo(capacidades: Capability[]): { group: string; caps: Capability[] }[] {
  const grupos: { group: string; caps: Capability[] }[] = [];
  for (const cap of capacidades) {
    const actual = grupos.find((g) => g.group === cap.group);
    if (actual) actual.caps.push(cap);
    else grupos.push({ group: cap.group, caps: [cap] });
  }
  return grupos;
}

export function RolesPermisosPanel({
  roles,
  totalCapacidades,
  cargando,
  error,
  onClose,
}: RolesPermisosPanelProps) {
  // Tres estados a propósito: `undefined` = nadie ha elegido todavía, y entonces se muestra el
  // primer rol EN CUANTO llegan los datos (no se puede fijar en el `useState`, que corre en el
  // primer render, cuando `roles` aún está vacío); `null` = el usuario cerró todos.
  const [elegido, setElegido] = useState<string | null | undefined>(undefined);
  const abierto = elegido === undefined ? (roles[0]?.value ?? null) : elegido;

  return (
    <>
      <div className="dh">
        <div className="dh-row">
          <div>
            <div className="dh-name">Roles y permisos</div>
            <div className="dh-sub">
              <span>Qué puede hacer cada rol en el sistema</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            aria-label="Cerrar roles y permisos"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="db">
        <div className="rp-readonly">
          Vista de <strong>solo consulta</strong>. La matriz de permisos vive en el código del
          servidor, así que todavía no se puede editar aquí; ese módulo llega cuando la matriz se
          mueva a la base de datos.
        </div>

        {cargando && <div className="state-msg">Cargando roles y permisos…</div>}
        {error && (
          <div className="state-msg error">No se pudo cargar la matriz de permisos.</div>
        )}

        {!cargando &&
          !error &&
          roles.map((rol) => {
            const expandido = abierto === rol.value;
            return (
              <div className="rp-role" key={rol.value}>
                <button
                  type="button"
                  className="rp-role-head"
                  aria-expanded={expandido}
                  onClick={() => setElegido(expandido ? null : rol.value)}
                >
                  <span
                    className={`pi pi-chevron-${expandido ? "down" : "right"} rp-chevron`}
                    aria-hidden="true"
                  />
                  <span className="rp-role-name">{rol.label}</span>
                  <span className="rp-role-count">
                    {rol.capabilities.length} de {totalCapacidades}
                  </span>
                </button>

                {expandido && (
                  <div className="rp-body">
                    {porGrupo(rol.capabilities).map((g) => (
                      <div key={g.group}>
                        <div className="rp-group">{g.group}</div>
                        <ul className="rp-list">
                          {g.caps.map((cap) => (
                            <li key={cap.code}>
                              <span className="pi pi-check rp-check" aria-hidden="true" />
                              <span className="rp-cap">
                                <span className="rp-cap-label">{cap.label}</span>
                                <code className="rp-code">{cap.code}</code>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {rol.capabilities.length === 0 && (
                      <div className="fv muted">Sin capacidades asignadas.</div>
                    )}
                    {rol.note && <div className="rp-note">{rol.note}</div>}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </>
  );
}
