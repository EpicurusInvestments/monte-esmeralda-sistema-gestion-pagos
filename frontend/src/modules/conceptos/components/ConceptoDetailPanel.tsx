/** Panel de detalle de un Concepto (patrón dh / db / df del sistema de diseño).
 *
 * El botón "Editar" solo aparece con capacidad `concept:edit` (hoy, Admin). El backend
 * valida igual: ocultarlo es únicamente UX.
 */

import { Badge } from "@/shared/ui/Badge";

import { sectionLabel } from "../types";
import type { Concept } from "../types";

interface ConceptoDetailPanelProps {
  concepto: Concept;
  canEdit: boolean;
  onEdit: () => void;
}

export function ConceptoDetailPanel({ concepto, canEdit, onEdit }: ConceptoDetailPanelProps) {
  return (
    <>
      <div className="dh">
        <div className="dh-row">
          <div>
            <div className="dh-name">{concepto.name}</div>
            <div className="dh-sub">
              <span className="td-mono">{concepto.code}</span>
              <Badge
                tone={concepto.is_header ? "blue" : "gray"}
                label={concepto.is_header ? "Encabezado" : "Hoja"}
              />
              <Badge
                tone={concepto.active ? "green" : "gray"}
                label={concepto.active ? "Activo" : "Inactivo"}
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
        <div className="fl">Código</div>
        <div className="fv mono">{concepto.code}</div>
        <div className="fl">Nombre</div>
        <div className="fv">{concepto.name}</div>
        <div className="fl">Ruta en el catálogo</div>
        <div className="fv muted">{concepto.path ?? "—"}</div>

        <div className="sec">Clasificación</div>
        <div className="fl">Sección</div>
        <div className="fv">{sectionLabel(concepto.section)}</div>
        <div className="fl">Concepto padre</div>
        <div className="fv">{concepto.parent_name ?? "— (raíz)"}</div>
        <div className="fl">Tipo</div>
        <div className="fv">
          {concepto.is_header
            ? "Encabezado — agrupador, no asignable a una Solicitud"
            : "Hoja — asignable a una Solicitud"}
        </div>

        <div className="sec">Presentación</div>
        <div className="fl">Estado</div>
        <div className="fv">{concepto.active ? "Activo" : "Inactivo"}</div>
        <div className="fl">Orden</div>
        <div className="fv mono">{concepto.sort_order}</div>
      </div>
    </>
  );
}
