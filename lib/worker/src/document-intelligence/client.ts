/**
 * HTTP client for the Python Document Intelligence service.
 *
 * The service owns text extraction, OCR, classification and field extraction;
 * this module only moves bytes across the boundary and returns the envelope it
 * produces. Transport failures are thrown so the ingestion pipeline's retry
 * logic can decide whether they are recoverable.
 */

import type { NormalizedEnvelope } from "../envelope/types.js";
import type {
  DocumentIntelligence,
  IngestionRecord,
} from "../ingestion/pipeline.js";

export interface DocumentIntelligenceConfig {
  /** Base URL of the document service, e.g. http://127.0.0.1:8000 */
  baseUrl: string;
  /** Per-request timeout in milliseconds. */
  timeoutMs?: number;
}

/**
 * Options passed to a single Document Intelligence invocation.
 */
export interface DocumentIntelligenceOptions {
  /**
   * Timeout in milliseconds for this specific request attempt, typically
   * clamped to the remaining overall ingestion time budget.
   */
  timeoutMs?: number;
}

/**
 * Structured error thrown by the Document Intelligence HTTP client.
 *
 * Carrying the HTTP status as a numeric field lets the pipeline's
 * `isRecoverable` function check it directly instead of parsing it out of the
 * error message string — avoiding accidental matches on status codes that
 * happen to appear in other parts of a message.
 *
 * `isTimeout` is set when the per-request `AbortController` fires.  The native
 * abort message ("This operation was aborted") does not contain the word
 * "timeout", so without this flag the pipeline would misclassify client-side
 * timeouts as non-recoverable.
 *
 * `responseBody` holds up to 500 characters of the raw response body when the
 * service returns a non-2xx status.  This preserves diagnostic information that
 * would otherwise be silently discarded.
 *
 * `retryAfterMs` is populated from the `Retry-After` response header when the
 * service returns HTTP 429 or 503.  The pipeline uses this value as the delay
 * before the next attempt instead of computing it from the exponential backoff
 * formula, capped by the operator-configured maximum wait.
 */
export class DocumentIntelligenceError extends Error {
  /** HTTP status code returned by the service, if a response was received. */
  readonly status?: number;
  /** Whether the failure was caused by the per-request timeout. */
  readonly isTimeout: boolean;
  /** Whether the failure was caused by a network/transport connection failure. */
  readonly isConnectionFailure: boolean;
  /** Underlying system error code (e.g. "ECONNREFUSED", "ETIMEDOUT") when available. */
  readonly code?: string;
  /** Excerpt of the response body (≤ 500 chars), when available. */
  readonly responseBody?: string;
  /**
   * Milliseconds to wait before the next attempt, sourced from the
   * `Retry-After` response header when the service returns HTTP 429 or 503.
   * The pipeline uses this value as the delay before the next attempt instead
   * of computing it from the exponential backoff formula, capped by the
   * operator-configured maximum wait.
   */
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    options: {
      status?: number;
      isTimeout?: boolean;
      isConnectionFailure?: boolean;
      code?: string;
      responseBody?: string;
      retryAfterMs?: number;
      cause?: unknown;
    } = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "DocumentIntelligenceError";
    this.status = options.status;
    this.isTimeout = options.isTimeout ?? false;
    this.isConnectionFailure = options.isConnectionFailure ?? false;
    this.code = options.code;
    this.responseBody = options.responseBody;
    this.retryAfterMs = options.retryAfterMs;
  }
}

export interface ConnectionErrorDetails {
  message: string;
  code?: string;
  address?: string;
  port?: number;
}

/**
 * Extracts low-level socket and connection failure details from caught fetch errors.
 * Node's native fetch (undici) wraps socket errors in a TypeError("fetch failed")
 * with the underlying socket error attached as `cause`.
 */
export function extractConnectionDetails(cause: unknown): ConnectionErrorDetails {
  if (!cause) {
    return { message: "unknown connection failure" };
  }

  const inner =
    typeof cause === "object" && cause !== null && "cause" in cause && (cause as { cause?: unknown }).cause
      ? (cause as { cause?: unknown }).cause
      : cause;

  const code =
    typeof inner === "object" && inner !== null && "code" in inner && typeof (inner as { code?: unknown }).code === "string"
      ? (inner as { code: string }).code
      : typeof cause === "object" && cause !== null && "code" in cause && typeof (cause as { code?: unknown }).code === "string"
        ? (cause as { code: string }).code
        : undefined;

  const address =
    typeof inner === "object" && inner !== null && "address" in inner && typeof (inner as { address?: unknown }).address === "string"
      ? (inner as { address: string }).address
      : undefined;

  const port =
    typeof inner === "object" && inner !== null && "port" in inner && typeof (inner as { port?: unknown }).port === "number"
      ? (inner as { port: number }).port
      : undefined;

  let detailMessage: string;
  if (inner instanceof Error && inner.message && inner.message !== "fetch failed") {
    detailMessage = inner.message;
  } else if (cause instanceof Error && cause.message && cause.message !== "fetch failed") {
    detailMessage = cause.message;
  } else if (typeof inner === "string") {
    detailMessage = inner;
  } else if (typeof cause === "string") {
    detailMessage = cause;
  } else {
    detailMessage = "fetch failed";
  }

  // Augment detail message if it lacks the code or destination address/port
  if (code && !detailMessage.includes(code)) {
    detailMessage = `${detailMessage} (${code})`;
  }
  if (address && port && !detailMessage.includes(address)) {
    detailMessage = `${detailMessage} [${address}:${port}]`;
  }

  return {
    message: detailMessage,
    code,
    address,
    port,
  };
}

/**
 * Parses the HTTP `Retry-After` header value into a delay in milliseconds.
 * Supports both integer/decimal seconds and RFC 7231 / RFC 9110 HTTP-date formats.
 */
export function parseRetryAfter(header: string | null): number | undefined {
  if (header === null) return undefined;
  const trimmed = header.trim();
  if (trimmed === "") return undefined;

  // 1. Numeric seconds: e.g. "30" or "2.5"
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }

  // 2. HTTP-date: IMF-fixdate (e.g. "Wed, 21 Oct 2026 07:28:00 GMT")
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    return Math.max(0, diff);
  }

  return undefined;
}

export function createDocumentIntelligenceClient(
  config: DocumentIntelligenceConfig,
): DocumentIntelligence {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const defaultTimeoutMs = config.timeoutMs ?? 30_000;

  return async function callDocumentIntelligence(
    record: IngestionRecord,
    content: Uint8Array | string,
    options?: DocumentIntelligenceOptions,
  ): Promise<NormalizedEnvelope> {
    const body = new FormData();
    // Copy into a plain ArrayBuffer: a Uint8Array may be backed by a
    // SharedArrayBuffer, which Blob does not accept.
    const source =
      typeof content === "string" ? new TextEncoder().encode(content) : content;
    const bytes = new Uint8Array(source.byteLength);
    bytes.set(source);
    body.append(
      "file",
      new Blob([bytes], { type: record.mimeType }),
      record.filename,
    );
    body.append("source_id", record.sourceId);
    body.append("tenant_id", record.tenantId);

    // Respect remaining overall time budget if specified by the pipeline
    const timeoutMs =
      options?.timeoutMs !== undefined
        ? Math.max(1, Math.min(options.timeoutMs, defaultTimeoutMs))
        : defaultTimeoutMs;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/v1/analyze`, {
          method: "POST",
          body,
          signal: controller.signal,
        });
      } catch (cause) {
        // fetch() rejects on network-level failures (ECONNREFUSED, ECONNRESET,
        // DNS failure) and when the AbortController fires. Re-raise as a
        // DocumentIntelligenceError with typed flags so isRecoverable does not
        // rely on message string parsing.
        const aborted =
          controller.signal.aborted ||
          (cause instanceof Error &&
            (cause.name === "AbortError" ||
              cause.name === "TimeoutError" ||
              cause.message.toLowerCase().includes("abort")));

        if (aborted) {
          throw new DocumentIntelligenceError(
            `document intelligence timed out after ${timeoutMs}ms`,
            {
              isTimeout: true,
              isConnectionFailure: false,
              cause,
            },
          );
        }

        const details = extractConnectionDetails(cause);
        throw new DocumentIntelligenceError(
          `document intelligence connection failed: ${details.message}`,
          {
            isTimeout: false,
            isConnectionFailure: true,
            code: details.code,
            cause,
          },
        );
      }

      if (!response.ok) {
        // Read up to 500 chars of the body for diagnostics; ignore read errors.
        let responseBody: string | undefined;
        try {
          const raw = await response.text();
          responseBody = raw.length > 500 ? raw.slice(0, 500) + "…" : raw;
        } catch {
          // non-fatal — status + statusText are still recorded
        }

        // Parse Retry-After for rate-limiting and temporary unavailability responses.
        // Supports both numeric seconds and HTTP-date strings.
        let retryAfterMs: number | undefined;
        if (response.status === 429 || response.status === 503) {
          retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
        }

        throw new DocumentIntelligenceError(
          `document intelligence returned ${response.status} ${response.statusText}`,
          { status: response.status, responseBody, retryAfterMs },
        );
      }

      return (await response.json()) as NormalizedEnvelope;
    } finally {
      clearTimeout(timer);
    }
  };
}
