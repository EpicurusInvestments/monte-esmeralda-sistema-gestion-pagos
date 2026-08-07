/** Badge de estado. Renderiza `.badge .b-<tone>` del sistema de diseño.
 *
 * Los tonos son los mismos que usa `labels.ts` (`STATUS_TONE`), así que al migrar
 * Solicitudes se puede construir un `<SolicitudStatusBadge>` encima de este.
 */

export type BadgeTone = "green" | "gray" | "blue" | "amber" | "red" | "teal" | "indigo";

interface BadgeProps {
  tone: BadgeTone;
  label: string;
  title?: string;
}

export function Badge({ tone, label, title }: BadgeProps) {
  return (
    <span className={`badge b-${tone}`} title={title}>
      {label}
    </span>
  );
}
