/** Tipos del módulo Administración de usuarios, alineados a `schemas/user.py` del backend.
 *
 * Reglas del contrato que se reflejan aquí:
 *  - Alta (`UserCreate`): email, full_name, role y password. El backend baja el correo a
 *    minúsculas y rechaza duplicados con `VALIDATION_ERROR` (422).
 *  - Edición (`UserUpdate`): full_name, role, is_active y password, todos opcionales. El
 *    **correo NO es editable** y una contraseña vacía o ausente NO cambia la actual.
 *  - El backend no impone longitud mínima de contraseña; el mínimo de 8 es una regla de esta
 *    pantalla (si algún día se endurece en el servidor, este es el sitio a alinear).
 */

import { z } from "zod";

import { ROLE_LABELS } from "@/shared/lib/labels";
import type { Role } from "@/shared/lib/types";

export type { User, UserDetail, Role } from "@/shared/lib/types";

/** Longitud mínima de contraseña que exige el formulario. */
export const PASSWORD_MIN = 8;

const ROLES = Object.keys(ROLE_LABELS) as Role[];

/** Opciones para los Dropdown de rol (formulario y filtro), con las etiquetas de labels.ts. */
export const ROLE_OPTIONS = ROLES.map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

const nombre = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio.")
  .max(255, "Máximo 255 caracteres.");

const rol = z
  .string()
  .min(1, "Selecciona un rol.")
  .refine((v) => ROLES.includes(v as Role), "Rol no válido.");

const correo = z
  .string()
  .trim()
  .min(1, "El correo es obligatorio.")
  .email("Escribe un correo válido.")
  .max(255, "Máximo 255 caracteres.");

/** Alta: la contraseña es obligatoria. */
export const usuarioCrearSchema = z.object({
  email: correo,
  full_name: nombre,
  role: rol,
  is_active: z.boolean(),
  password: z
    .string()
    .min(PASSWORD_MIN, `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`),
});

/** Edición: el correo va de solo lectura y la contraseña, si se escribe, respeta el mínimo.
 *  En blanco significa «no la cambies», así que se valida con `refine` en vez de `min`. */
export const usuarioEditarSchema = z.object({
  email: z.string(),
  full_name: nombre,
  role: rol,
  is_active: z.boolean(),
  password: z
    .string()
    .refine(
      (v) => v === "" || v.length >= PASSWORD_MIN,
      `Deja el campo en blanco o usa al menos ${PASSWORD_MIN} caracteres.`,
    ),
});

/** Ambos esquemas comparten la misma forma, así que el formulario usa un solo tipo. */
export type UsuarioFormValues = z.infer<typeof usuarioCrearSchema>;

export const USUARIO_FORM_DEFAULTS: UsuarioFormValues = {
  email: "",
  full_name: "",
  role: "",
  is_active: true,
  password: "",
};
