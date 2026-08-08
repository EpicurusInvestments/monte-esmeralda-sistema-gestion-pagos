/** Rutas que YA están montadas en el router (Frente 3 en curso).
 *
 * Fuente única de verdad para dos cosas:
 *  - `roleHome.ts`: si la home del rol todavía no existe, la redirección cae a "/".
 *  - `AppLayout`: las entradas del sidebar cuyo destino está aquí se vuelven enlaces
 *    reales; las demás siguen visibles pero en estado "por migrar".
 *
 * Al migrar una pantalla: agregar su ruta aquí Y como hija de "/" en `router.tsx`.
 */
export const RUTAS_MONTADAS: readonly string[] = [
  "/conceptos",
  "/proveedores",
  "/solicitudes",
];

export function estaMontada(ruta: string): boolean {
  return RUTAS_MONTADAS.includes(ruta);
}
