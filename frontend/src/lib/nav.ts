// Role-aware navigation and capability helpers (mirrors backend permissions).
import type { Role, SolicitudStatus } from "./types";

export interface NavItem {
  href: string;
  label: string;
  roles: Role[];
}

const ALL: Role[] = [
  "admin",
  "engineer",
  "accountant",
  "field_admin",
  "supervisor",
  "cfo",
  "treasurer",
  "ceo",
];

export const NAV_ITEMS: NavItem[] = [
  { href: "/solicitudes", label: "Solicitudes", roles: ALL },
  {
    href: "/solicitudes/nueva",
    label: "Capturar Solicitud",
    roles: ["admin", "field_admin"],
  },
  {
    href: "/aprobaciones",
    label: "Bandeja de Aprobaciones",
    roles: ["admin", "supervisor"],
  },
  {
    href: "/aprobaciones-financieras",
    label: "Aprobaciones Financieras",
    roles: ["admin", "cfo"],
  },
  {
    href: "/proveedores",
    label: "Proveedores",
    roles: [
      "admin",
      "field_admin",
      "supervisor",
      "cfo",
      "accountant",
      "engineer",
      "treasurer",
    ],
  },
  { href: "/conceptos", label: "Catálogo de Conceptos", roles: ALL },
  { href: "/admin", label: "Administración", roles: ["admin"] },
];

// Landing page per role (Role Home redirect).
export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin",
  field_admin: "/solicitudes/nueva",
  supervisor: "/aprobaciones",
  cfo: "/aprobaciones-financieras",
  treasurer: "/solicitudes",
  ceo: "/solicitudes",
  accountant: "/solicitudes",
  engineer: "/solicitudes",
};

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles.includes(role));
}

export function canCreateSolicitud(role: Role): boolean {
  return role === "admin" || role === "field_admin";
}

export function canSupervisorReview(role: Role): boolean {
  return role === "admin" || role === "supervisor";
}

export function canCfoReview(role: Role): boolean {
  return role === "admin" || role === "cfo";
}

export function canManageSuppliers(role: Role): boolean {
  return role === "admin" || role === "field_admin";
}

export function canEditConcepts(role: Role): boolean {
  return role === "admin";
}

export function canRecordClearance(role: Role): boolean {
  return role === "admin";
}

// Which workflow actions are available for a given role + status.
export interface AvailableActions {
  canEdit: boolean;
  canSubmit: boolean;
  canUpload: boolean;
  supervisorActions: boolean; // approve / reject / correction / assign concept
  cfoActions: boolean; // approve / reject / defer / correction
}

export function availableActions(
  role: Role,
  status: SolicitudStatus,
  isOwner: boolean
): AvailableActions {
  const owner = isOwner || role === "admin";
  const editable = status === "draft" || status === "correction_requested";
  return {
    canEdit: owner && canCreateSolicitud(role) && editable,
    canSubmit: owner && canCreateSolicitud(role) && editable,
    canUpload: owner && canCreateSolicitud(role) && editable,
    supervisorActions: canSupervisorReview(role) && status === "submitted",
    cfoActions: canCfoReview(role) && status === "supervisor_approved",
  };
}
