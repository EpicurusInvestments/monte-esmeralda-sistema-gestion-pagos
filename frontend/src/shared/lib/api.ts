// Typed API client for the FastAPI backend.
import type {
  Attachment,
  Clearance,
  ClearanceStatus,
  Comment,
  Concept,
  ConceptCreatePayload,
  ConceptUpdatePayload,
  LoginResponse,
  RequestType,
  Role,
  RolesPermissions,
  SolicitudDetail,
  SolicitudListItem,
  SolicitudStatus,
  Supplier,
  User,
  UserDetail,
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

// --- Sesión expirada -------------------------------------------------------
// Si una llamada AUTENTICADA responde 401, el token ya no sirve: se limpia y se avisa a la
// app. `AuthProvider` registra aquí un handler que vacía la sesión; a partir de eso el guard
// `RequireAuth` redirige a /login solo. No se navega desde este módulo a propósito: así no
// depende del router ni de `window.location` (que jsdom no implementa).
//
// El login queda FUERA de esto (se llama con `auth: false`): ahí un 401 son credenciales
// inválidas y debe llegar al formulario.
type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setOnUnauthorized(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

function handleUnauthorized(): void {
  clearToken();
  onUnauthorized?.();
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
    if (auth && resp.status === 401) handleUnauthorized();
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
  // Devuelven `UserDetail` (el `UserOut` completo, con created_at/updated_at): la pantalla
  // de Administración muestra esas marcas de tiempo.
  listUsers: () => request<UserDetail[]>("/users"),
  createUser: (body: {
    email: string;
    full_name: string;
    role: Role;
    password: string;
  }) => request<UserDetail>("/users", { method: "POST", body }),
  // `password` vacío o ausente NO cambia la contraseña (lo resuelve el router del backend).
  updateUser: (
    id: string,
    body: Partial<{ full_name: string; role: Role; is_active: boolean; password: string }>,
  ) => request<UserDetail>(`/users/${id}`, { method: "PATCH", body }),

  // --- Roles y permisos (admin, solo lectura) -------------------------------
  // La matriz vive en código (`services/permissions.py`), así que no hay escritura.
  getRolesPermissions: () => request<RolesPermissions>("/roles-permissions"),

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
  createConcept: (body: ConceptCreatePayload) =>
    request<Concept>("/concepts", { method: "POST", body }),
  updateConcept: (id: string, body: ConceptUpdatePayload) =>
    request<Concept>(`/concepts/${id}`, { method: "PATCH", body }),

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
  cancel: (id: string, reason?: string) =>
    request<SolicitudDetail>(`/solicitudes/${id}/cancel`, {
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
    // Esta llamada siempre va autenticada.
    if (resp.status === 401) handleUnauthorized();
    const e = (data || {}) as { code?: string; message?: string };
    throw new ApiError(e.code || "ERROR", e.message || "Error al subir", resp.status);
  }
  return data as Attachment;
}

/** Descarga un adjunto y la dispara en el navegador.
 *
 * El endpoint exige `Authorization: Bearer`, así que un `<a href>` plano no sirve: hay que
 * traer los bytes con fetch y crear un objectURL temporal. Se aplica el mismo manejo de 401
 * que el resto del cliente (sesión expirada).
 */
export async function downloadAttachment(
  solicitudId: string,
  attachmentId: string,
  fileName: string
): Promise<void> {
  const token = getToken();
  let resp: Response;
  try {
    resp = await fetch(attachmentDownloadUrl(solicitudId, attachmentId), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", "No se pudo conectar con el servidor.", 0);
  }

  if (!resp.ok) {
    if (resp.status === 401) handleUnauthorized();
    let code = "ERROR";
    let message = "No se pudo descargar el documento.";
    try {
      const text = await resp.text();
      if (text) {
        const body = JSON.parse(text) as { code?: string; message?: string };
        code = body.code ?? code;
        message = body.message ?? message;
      }
    } catch {
      // La respuesta de error no era JSON: se queda el mensaje genérico.
    }
    throw new ApiError(code, message, resp.status);
  }

  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function attachmentDownloadUrl(
  solicitudId: string,
  attachmentId: string
): string {
  return `${API_URL}/solicitudes/${solicitudId}/attachments/${attachmentId}/download`;
}

export { API_URL };
