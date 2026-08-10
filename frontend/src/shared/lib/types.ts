// Domain types mirroring the FastAPI backend schemas.

export type Role =
  | "admin"
  | "engineer"
  | "accountant"
  | "field_admin"
  | "supervisor"
  | "cfo"
  | "treasurer"
  | "ceo";

export type SolicitudStatus =
  | "draft"
  | "submitted"
  | "correction_requested"
  | "supervisor_approved"
  | "cfo_approved"
  | "deferred"
  | "rejected"
  | "cancelled";

export type RequestType =
  | "contractor_estimate"
  | "supplier_invoice"
  | "reimbursement"
  | "government_fee"
  | "utility"
  | "service"
  | "tax"
  | "other";

export type SupplierStatus = "active" | "inactive";
export type ClearanceStatus = "cleared" | "pending" | "blocked";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
}

/** `UserOut` completo, con las marcas de tiempo que devuelven `/users` y `/auth/me`.
 *
 * Se separa de `User` a propósito: la sesión y los permisos solo necesitan identidad y rol
 * (`User`), y la ÚNICA pantalla que muestra alta/actualización es Administración de
 * usuarios. Así el tipo de uso general no arrastra campos que casi nadie consume. */
export interface UserDetail extends User {
  created_at: string;
  updated_at: string;
}

/** Una capacidad del sistema, tal como la nombra y agrupa el backend (`app/labels.py`). */
export interface Capability {
  code: string;
  label: string;
  group: string;
}

/** Un rol con las capacidades que tiene hoy. `note` explica matices que la matriz no dice
 *  (p. ej. que Tesorería ve solo las solicitudes ya aprobadas). */
export interface RolePermissions {
  value: Role;
  label: string;
  capabilities: Capability[];
  note: string | null;
}

/** Respuesta de `GET /roles-permissions`: los roles y el catálogo para cruzarlos. */
export interface RolesPermissions {
  roles: RolePermissions[];
  capabilities: Capability[];
}

export interface ClearanceSummary {
  has_record: boolean;
  status: ClearanceStatus | null;
  effective_status: string; // cleared / pending / blocked / expired / none
  valid_until: string | null;
  is_expired: boolean;
}

export interface Supplier {
  id: string;
  legal_name: string;
  rfc: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  bank_name: string | null;
  bank_account: string | null;
  clabe: string | null;
  status: SupplierStatus;
  created_at: string;
  updated_at: string;
  clearance: ClearanceSummary;
}

export interface Clearance {
  id: string;
  supplier_id: string;
  status: ClearanceStatus;
  clearance_date: string | null;
  valid_until: string | null;
  compliance_reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Concept {
  id: string;
  code: string;
  name: string;
  parent_id: string | null;
  section: string;
  is_header: boolean;
  sort_order: number;
  active: boolean;
  parent_name: string | null;
  path: string | null;
}

/** Payload de alta de concepto (POST /concepts). Espeja `ConceptCreate` del backend. */
export interface ConceptCreatePayload {
  code: string;
  name: string;
  section: string;
  parent_id?: string | null;
  is_header?: boolean;
  sort_order?: number;
  active?: boolean;
}

/** Payload de edición (PATCH /concepts/{id}): todos los campos son opcionales. */
export type ConceptUpdatePayload = Partial<ConceptCreatePayload>;

export interface Attachment {
  id: string;
  solicitud_id: string;
  file_name: string;
  content_type: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

export interface Comment {
  id: string;
  solicitud_id: string;
  author_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string | null;
  performed_by_name: string | null;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

export interface SolicitudListItem {
  id: string;
  folio: string;
  request_type: RequestType;
  supplier_id: string;
  supplier_name: string | null;
  final_concept_id: string | null;
  proposed_concept_id: string | null;
  concept_label: string | null;
  net_amount: string;
  status: SolicitudStatus;
  document_date: string | null;
  created_at: string;
}

export interface SolicitudDetail {
  id: string;
  folio: string;
  request_type: RequestType;
  supplier_id: string;
  description: string;
  net_amount: string;
  proposed_concept_id: string | null;
  final_concept_id: string | null;
  proposed_payment_week: string | null;
  document_date: string | null;
  due_date: string | null;
  status: SolicitudStatus;
  captured_by: string;
  submitted_at: string | null;
  supervisor_reviewed_by: string | null;
  supervisor_reviewed_at: string | null;
  cfo_reviewed_by: string | null;
  cfo_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  supplier: Supplier | null;
  proposed_concept: Concept | null;
  final_concept: Concept | null;
  attachments: Attachment[];
  comments: Comment[];
  audit_events: AuditEvent[];
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}
