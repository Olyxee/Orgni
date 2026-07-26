/**
 * Orgni API client for the web console.
 *
 * Sends the session token as a Bearer header on every authenticated call. The
 * API base URL comes from VITE_API_URL (defaults to the local API on :8080).
 */
const API_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:8080"
).replace(/\/+$/, "");

export interface Session {
  token: string;
  email: string;
  organization: string;
  tenantId: string;
  roles: string[];
}

export interface DocumentSummary {
  sourceId: string;
  filename: string;
  documentType: string | null;
  state: string;
  confidence: number | null;
  uploadedAt: string;
}

export interface DocumentDetail {
  source: {
    sourceId: string;
    filename: string;
    documentType: string | null;
    state: string;
    confidence: number | null;
    warnings: string[];
    errors: string[];
    uploadedAt: string;
  };
  tokens: Record<string, unknown>[];
  facts: {
    entities?: { name?: string }[];
    relationships?: unknown[];
    facts?: {
      fact_type?: string;
      fact_kind?: string;
      epistemic_status?: string;
    }[];
    conflicts?: unknown[];
    warnings?: string[];
  } | null;
  reviews: unknown[];
}

export interface UploadResult {
  sourceId: string;
  documentType: string;
  state: string;
  tokens: Record<string, unknown>[];
  facts: DocumentDetail["facts"];
  warnings: string[];
  errors: string[];
}

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("authorization", `Bearer ${init.token}`);
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    let code = res.statusText;
    try {
      code = (await res.json()).error ?? code;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, code);
  }
  return (await res.json()) as T;
}

export async function login(
  email: string,
  organization: string,
): Promise<Session> {
  const data = await request<{
    token: string;
    principal: {
      email: string;
      tenantId: string;
      organization: string;
      roles: string[];
    };
  }>("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, organization }),
  });
  return {
    token: data.token,
    email: data.principal.email,
    organization: data.principal.organization,
    tenantId: data.principal.tenantId,
    roles: data.principal.roles,
  };
}

export function uploadDocument(
  token: string,
  file: File,
): Promise<UploadResult> {
  const body = new FormData();
  body.append("file", file);
  return request<UploadResult>("/api/documents", {
    method: "POST",
    body,
    token,
  });
}

export function listDocuments(
  token: string,
): Promise<{ documents: DocumentSummary[] }> {
  return request("/api/documents", { token });
}

export function getDocument(
  token: string,
  sourceId: string,
): Promise<DocumentDetail> {
  return request(`/api/documents/${sourceId}`, { token });
}

export { ApiError, API_URL };
