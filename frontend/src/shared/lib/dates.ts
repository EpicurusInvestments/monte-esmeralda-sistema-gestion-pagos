/** Helpers de fecha para hablar con el backend.
 *
 * El backend usa `datetime.date`, o sea `"YYYY-MM-DD"`.
 */

/** Fecha → "YYYY-MM-DD" en horario LOCAL.
 *
 * No se usa `toISOString()` a propósito: convierte a UTC y en México (UTC-6) una fecha
 * elegida en un calendario se enviaría con un día menos.
 */
export function toISODate(d: Date | null): string | null {
  if (!d) return null;
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}
