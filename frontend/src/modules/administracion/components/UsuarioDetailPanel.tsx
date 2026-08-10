/** Panel de detalle de un usuario (patrón dh / db / df del sistema de diseño).
 *
 * Solo lectura: no muestra ni deja adivinar la contraseña (el backend nunca la devuelve, solo
 * guarda su hash). El botón "Editar" requiere `user:manage`; el backend revalida igual.
 */

import { ROLE_LABELS, formatDateTime } from "@/shared/lib/labels";
import { Badge } from "@/shared/ui/Badge";

import type { UserDetail } from "../types";

interface UsuarioDetailPanelProps {
  usuario: UserDetail;
  canEdit: boolean;
  /** True cuando el usuario del panel es el de la sesión: se avisa para evitar sorpresas. */
  esSesionActual?: boolean;
  onEdit: () => void;
}

export function UsuarioDetailPanel({
  usuario,
  canEdit,
  esSesionActual,
  onEdit,
}: UsuarioDetailPanelProps) {
  return (
    <>
      <div className="dh">
        <div className="dh-row">
          <div>
            <div className="dh-name">{usuario.full_name}</div>
            <div className="dh-sub">
              <span>{usuario.email}</span>
              <Badge tone="blue" label={ROLE_LABELS[usuario.role]} />
              <Badge
                tone={usuario.is_active ? "green" : "gray"}
                label={usuario.is_active ? "Activo" : "Inactivo"}
              />
            </div>
          </div>
          {canEdit && (
            <button type="button" className="btn btn-sm" onClick={onEdit}>
              Editar
            </button>
          )}
        </div>
      </div>

      <div className="db">
        <div className="sec">Identificación</div>
        <div className="fl">Nombre completo</div>
        <div className="fv">{usuario.full_name}</div>
        <div className="fl">Correo</div>
        <div className="fv">{usuario.email}</div>

        <div className="sec">Acceso</div>
        <div className="fl">Rol</div>
        <div className="fv">{ROLE_LABELS[usuario.role]}</div>
        <div className="fl">Estado</div>
        <div className="fv">
          {usuario.is_active ? "Activo — puede iniciar sesión" : "Inactivo — sin acceso"}
        </div>
        {esSesionActual && (
          <div className="fv muted">Es la cuenta con la que estás trabajando ahora.</div>
        )}

        <div className="sec">Registro</div>
        <div className="fl">Alta</div>
        <div className="fv">{formatDateTime(usuario.created_at)}</div>
        <div className="fl">Última actualización</div>
        <div className="fv">{formatDateTime(usuario.updated_at)}</div>
      </div>
    </>
  );
}
