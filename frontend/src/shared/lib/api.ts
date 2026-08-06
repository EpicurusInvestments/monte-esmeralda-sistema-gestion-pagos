// Typed API client for the FastAPI backend.
import type {
  Attachment,
  Clearance,
  ClearanceStatus,
  Comment,
  Concept,
  LoginResponse,
  RequestType,
  Role,
  SolicitudDetail,
  SolicitudListItem,
  SolicitudStatus,
  Supplier,
  User,
} from "./types";

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

const TOKEN_KEY = "me_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let resp: Response;
  try {
    resp = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      "NETWORK_ERROR",
      "No se pudo conectar con el servidor.",
      0
    );
  }

  if (resp.status === 204) return undefined as T;

  let data: unknown = null;
  const text = await resp.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!resp.ok) {
    const errBody = (data || {}) as { code?: string; message?: string };
    throw new ApiError(
      errBody.code || "ERROR",
      errBody.message || "Ocurrió un error inesperado.",
      resp.status
    );
  }
  return data as T;
}

// --- Auth -------------------------------------------------------------------

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),
  me: () => request<User>("/auth/me"),

  // --- Users (admin) --------------------------------------------------------
  listUsers: () => request<User[]>("/users"),
  createUser: (body: {
    email: string;
    full_name: string;
    role: Role;
    password: string;
  }) => request<User>("/users", { method: "POST", body }),
  updateUser: (id: string, body: Partial<{ full_name: string; role: Role; is_active: boolean; password: string }>) =>
    request<User>(`/users/${id}`, { method: "PATCH", body }),

  // --- Suppliers ------------------------------------------------------------
  listSuppliers: () => request<Supplier[]>("/suppliers"),
  getSupplier: (id: string) => request<Supplier>(`/suppliers/${id}`),
  createSupplier: (body: Partial<Supplier>) =>
    request<Supplier>("/suppliers", { method: "POST", body }),
  updateSupplier: (id: string, body: Partial<Supplier>) =>
    request<Supplier>(`/suppliers/${id}`, { method: "PATCH", body }),
  listClearances: (supplierId: string) =>
    request<Clearance[]>(`/suppliers/${supplierId}/clearances`),
  createClearance: (
    supplierId: string,
    body: {
      status: ClearanceStatus;
      clearance_date?: string | null;
      valid_until?: string | null;
      compliance_reference?: string | null;
      notes?: string | null;
    }
  ) =>
    request<Clearance>(`/suppliers/${supplierId}/clearances`, {
      method: "POST",
      body,
    }),

  // --- Concepts -------------------------------------------------------------
  listConcepts: (opts?: { leavesOnly?: boolean; activeOnly?: boolean }) => {
    const params = new URLSearchParams();
    if (opts?.leavesOnly) params.set("leaves_only", "true");
    params.set("active_only", String(opts?.activeOnly ?? true));
    return request<Concept[]>(`/concepts?${params.toString()}`);
  },

  // --- Solicitudes ----------------------------------------------------------
  listSolicitudes: (filters?: {
    status?: SolicitudStatus;
    supplier_id?: string;
    concept_id?: string;
    request_type?: RequestType;
    date_from?: string;
    date_to?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        if (v) params.set(k, v);
      }
    }
    const qs = params.toString();
    return request<SolicitudListItem[]>(`/solicitudes${qs ? `?${qs}` : ""}`);
  },
  getSolicitud: (id: string) => request<SolicitudDetail>(`/solicitudes/${id}`),
  createSolicitud: (body: {
    request_type: RequestType;
    supplier_id: string;
    description: string;
    net_amount: string;
    proposed_concept_id?: string | null;
    proposed_payment_week?: string | null;
    document_date?: string | null;
    due_date?: string | null;
  }) => request<SolicitudDetail>("/solicitudes", { method: "POST", body }),
  updateSolicitud: (id: string, body: Record<string, unknown>) =>
    request<SolicitudDetail>(`/solicitudes/${id}`, { method: "PATCH", body }),

  submit: (id: string) =>
    request<SolicitudDetail>(`/solicitudes/${id}/submit`, { method: "POST" }),
  assignConcept: (id: string, finalConceptId: string) =>
    request<SolicitudDetail>(`/solicitudes/${id}/assign-concept`, {
      method: "POST",
      body: { final_concept_id: finalConceptId },
    }),
  supervisorApprove: (id: string, finalConceptId?: string, reason?: string) =>
    request<SolicitudDetail>(`/solicitudes/${id}/supervisor-approve`, {
      method: "POST",
      body: { final_concept_id: finalConceptId, reason },
    }),
  cfoApprove: (id: string, reason?: string) =>
    request<SolicitudDetail>(`/solicitudes/${id}/cfo-approve`, {
      method: "POST",
      body: { reason },
    }),
  defer: (id: string, reason?: string) =>
    request<SolicitudDetail>(`/solicitudes/${id}/defer`, {
      method: "POST",
      body: { reason },
    }),
  reject: (id: string, reason?: string) =>
    request<SolicitudDetail>(`/solicitudes/${id}/reject`, {
      method: "POST",
      body: { reason },
    }),
  requestCorrection: (id: string, reason?: string) =>
    request<SolicitudDetail>(`/solicitudes/${id}/request-correction`, {
      method: "POST",
      body: { reason },
    }),

  // --- Comments -------------------------------------------------------------
  listComments: (id: string) =>
    request<Comment[]>(`/solicitudes/${id}/comments`),
  addComment: (id: string, bodyText: string) =>
    request<Comment>(`/solicitudes/${id}/comments`, {
      method: "POST",
      body: { body: bodyText },
    }),

  // --- Attachments ----------------------------------------------------------
  listAttachments: (id: string) =>
    request<Attachment[]>(`/solicitudes/${id}/attachments`),
};

// Multipart upload (separate because it does not use JSON).
export async function uploadAttachment(
  solicitudId: string,
  file: File
): Promise<Attachment> {
  const form = new FormData();
  form.append("file", file);
  const token = getToken();
  const resp = await fetch(
    `${API_URL}/solicitudes/${solicitudId}/attachments`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }
  );
  const text = await resp.text();
  const data = text ? JSON.parse(text) : null;
  if (!resp.ok) {
    const e = (data || {}) as { code?: string; message?: string };
    throw new ApiError(e.code || "ERROR", e.message || "Error al subir", resp.status);
  }
  return data as Attachment;
}

export function attachmentDownloadUrl(
  solicitudId: string,
  attachmentId: string
): string {
  return `${API_URL}/solicitudes/${solicitudId}/attachments/${attachmentId}/download`;
}

export { API_URL };
