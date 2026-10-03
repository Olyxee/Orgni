/**
 * Orgni API client for the web console.
 *
 * Sends the session token as a Bearer header on every authenticated call. The
 * API base URL comes from VITE_API_URL and otherwise uses the same-origin
 * /api service routed by Replit.
 */
const configuredApiUrl = import.meta.env.VITE_API_URL ?? "";

// On Windows, localhost can resolve through an unresponsive WSL relay while
// the local Docker API is listening on IPv4.
const API_URL = configuredApiUrl
  .replace(/^http:\/\/localhost(?=[:/]|$)/, "http://127.0.0.1")
  .replace(/\/+$/, "");

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
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
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

interface SessionResponse {
  token: string;
  principal: {
    email: string;
    tenantId: string;
    organization: string;
    roles: string[];
  };
}

function toSession(data: SessionResponse): Session {
  return {
    token: data.token,
    email: data.principal.email,
    organization: data.principal.organization,
    tenantId: data.principal.tenantId,
    roles: data.principal.roles,
  };
}

function postAuth<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function login(email: string, password: string): Promise<Session> {
  return postAuth<SessionResponse>("/api/auth/login", { email, password }).then(toSession);
}

/**
 * Registering either returns a session (email delivery not in force) or a
 * pending state (the address must be proven first). Callers must handle both.
 */
export type RegisterResult =
  | { pending: true; email: string }
  | { pending: false; session: Session };

export function register(input: {
  email: string;
  organization: string;
  password: string;
  confirmPassword: string;
}): Promise<RegisterResult> {
  return postAuth<{ pendingVerification?: true; email?: string } | SessionResponse>(
    "/api/auth/register",
    input,
  ).then((data) =>
    "token" in data
      ? { pending: false, session: toSession(data) }
      : { pending: true, email: data.email ?? input.email },
  );
}

/** Spend a verification token. Returns a session so onboarding can follow. */
export function verifyEmail(token: string): Promise<Session> {
  return postAuth<SessionResponse>("/api/auth/verify-email", { token }).then(toSession);
}

/**
 * Ask for another verification link. The API answers identically for known
 * and unknown addresses, so this never confirms whether an account exists.
 */
export function resendVerification(email: string): Promise<{ accepted: boolean }> {
  return postAuth("/api/auth/verify-email/resend", { email });
}

/**
 * Ask for a reset link. The API answers identically for known and unknown
 * addresses, so a success here never confirms whether an account exists.
 */
export function requestPasswordReset(email: string): Promise<{ accepted: boolean }> {
  return postAuth("/api/auth/password-reset/request", { email });
}

/** Spend a reset token. Returns a session so the user lands in the workspace. */
export function confirmPasswordReset(token: string, password: string): Promise<Session> {
  return postAuth<SessionResponse>("/api/auth/password-reset/confirm", { token, password }).then(
    toSession,
  );
}

export function getCurrentSession(
  token: string,
): Promise<{ email: string; tenantId: string; roles: string[] }> {
  return request("/api/auth/me", { token });
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

/* ------------------------------------------------------------------ */
/* Organisational model — aggregated views across all evidence sources */
/* ------------------------------------------------------------------ */

export interface Provenance {
  sourceId: string;
  filename: string;
  documentType: string | null;
  uploadedAt: string;
}

export interface ModelOverview {
  sources: { total: number; byState: Record<string, number> };
  entities: number;
  relationships: number;
  facts: { total: number; byStatus: Record<string, number> };
  exceptions: number;
  reviews: number;
  latestSources: DocumentSummary[];
}

export interface EntityEntry {
  key: string;
  entity: Record<string, unknown>;
  occurrences: number;
  sources: Provenance[];
}

export interface EntityDetail extends EntityEntry {
  facts: { fact: Record<string, unknown>; source: Provenance }[];
  relationships: {
    relationship: Record<string, unknown>;
    source: Provenance;
  }[];
}

export interface ModelExceptions {
  conflicts: { conflict: unknown; source: Provenance }[];
  rejected: { reason: string; source: Provenance }[];
  warnings: { warning: string; source: Provenance }[];
  failedSources: {
    sourceId: string;
    filename: string;
    errors: string[];
    uploadedAt: string;
  }[];
}

export type ActivityEvent =
  | {
      type: "SOURCE_PROCESSED";
      at: string;
      sourceId: string;
      filename: string;
      state: string;
      documentType: string | null;
    }
  | {
      type: "REVIEW";
      at: string;
      sourceId: string;
      fieldPath: string;
      action: "CORRECT" | "REJECT" | "APPROVE";
      reviewer: string;
    };

export function getOverview(token: string): Promise<ModelOverview> {
  return request("/api/model/overview", { token });
}

export function listEntities(
  token: string,
): Promise<{ entities: EntityEntry[] }> {
  return request("/api/model/entities", { token });
}

export function getEntity(token: string, key: string): Promise<EntityDetail> {
  return request(`/api/model/entities/${encodeURIComponent(key)}`, { token });
}

export function listRelationships(token: string): Promise<{
  relationships: {
    relationship: Record<string, unknown>;
    source: Provenance;
  }[];
}> {
  return request("/api/model/relationships", { token });
}

export function listFacts(token: string): Promise<{
  facts: { fact: Record<string, unknown>; source: Provenance }[];
}> {
  return request("/api/model/facts", { token });
}

export function getExceptions(token: string): Promise<ModelExceptions> {
  return request("/api/model/exceptions", { token });
}

export function getActivity(
  token: string,
): Promise<{ events: ActivityEvent[] }> {
  return request("/api/model/activity", { token });
}

export function addReview(
  token: string,
  sourceId: string,
  input: {
    fieldPath: string;
    action: "CORRECT" | "REJECT" | "APPROVE";
    correctedValue?: unknown;
    reviewer?: string;
  },
): Promise<unknown> {
  return request(`/api/documents/${sourceId}/reviews`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    token,
  });
}

/* ------------------------------------------------------------------ */
/* API keys — credentials for agents/services calling Orgni            */
/* ------------------------------------------------------------------ */

export interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

/** A newly created key includes the plaintext `key` exactly once. */
export interface CreatedApiKey extends ApiKeySummary {
  key: string;
}

export function listApiKeys(token: string): Promise<{ keys: ApiKeySummary[] }> {
  return request("/api/keys", { token });
}

export function createApiKey(
  token: string,
  name: string,
): Promise<CreatedApiKey> {
  return request("/api/keys", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
    token,
  });
}

export function revokeApiKey(token: string, id: string): Promise<void> {
  return request(`/api/keys/${id}`, { method: "DELETE", token });
}

export { ApiError, API_URL };
