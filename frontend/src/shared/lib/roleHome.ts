/** Pantalla de inicio por rol (Role Home).
 *
 * El mapa vive en `nav.ts` (`ROLE_HOME`, espejo de `permissions.py`). La intención por rol:
 *
 *   admin        → /admin                      (Administración)
 *   field_admin  → /solicitudes/nueva          (captura de solicitudes)
 *   supervisor   → /aprobaciones               (bandeja de revisión operativa)
 *   cfo          → /aprobaciones-financieras   (aprobación financiera)
 *   treasurer    → /solicitudes                (bandeja de tesorería: solo aprobadas)
 *   ceo          → /solicitudes
 *   accountant   → /solicitudes
 *   engineer     → /solicitudes
 *
 * Mientras esas pantallas no existan (Frente 3 en curso), la resolución cae a "/" para no
 * redirigir a una ruta sin montar. Al migrar cada pantalla, agregar su ruta a
 * `RUTAS_MONTADAS` y la redirección por rol empieza a funcionar sola.
 */

import { ROLE_HOME } from "@/shared/lib/nav";
import type { Role } from "@/shared/lib/types";

/** Rutas de `ROLE_HOME` que ya están montadas en el router. */
const RUTAS_MONTADAS: readonly string[] = [];

export function resolveRoleHome(role: Role): string {
  const destino = ROLE_HOME[role];
  return RUTAS_MONTADAS.includes(destino) ? destino : "/";
}
