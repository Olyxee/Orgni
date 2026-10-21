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
 * service returns HTTP 429.  The pipeline uses this value as the delay before
 * the next attempt instead of computing it from the exponential backoff
 * formula, capped by the maximum configured delay so it can never exceed
 * operator-controlled limits.
 */
export class DocumentIntelligenceError extends Error {
  /** HTTP status code returned by the service, if a response was received. */
  readonly status?: number;
  /** Whether the failure was caused by the per-request timeout. */
  readonly isTimeout: boolean;
  /** Excerpt of the response body (≤ 500 chars), when available. */
  readonly responseBody?: string;
  /**
   * Milliseconds to wait before the next attempt, sourced from the
   * `Retry-After` response header.  Present only when the service sent that
   * header.  The pipeline caps this value against its configured maximum delay
   * before using it.
   */
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    options: {
      status?: number;
      isTimeout?: boolean;
      responseBody?: string;
      retryAfterMs?: number;
    } = {},
  ) {
    super(message);
    this.name = "DocumentIntelligenceError";
    this.status = options.status;
    this.isTimeout = options.isTimeout ?? false;
    this.responseBody = options.responseBody;
    this.retryAfterMs = options.retryAfterMs;
  }
}

export function createDocumentIntelligenceClient(
  config: DocumentIntelligenceConfig,
): DocumentIntelligence {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const timeoutMs = config.timeoutMs ?? 30_000;

  return async function callDocumentIntelligence(
    record: IngestionRecord,
    content: Uint8Array | string,
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
        // DNS failure) and when the AbortController fires.  Re-raise as a
        // DocumentIntelligenceError so isRecoverable has a consistent type to
        // inspect, and set isTimeout when the abort is ours.
        const aborted =
          controller.signal.aborted ||
          (cause instanceof Error &&
            (cause.name === "AbortError" ||
              cause.name === "TimeoutError" ||
              cause.message.toLowerCase().includes("abort")));
        throw new DocumentIntelligenceError(
          aborted
            ? `document intelligence timed out after ${timeoutMs}ms`
            : `document intelligence connection failed: ${cause instanceof Error ? cause.message : String(cause)}`,
          { isTimeout: aborted },
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

        // Parse Retry-After for rate-limiting responses so the pipeline can
        // honour the server's requested delay instead of using fixed backoff.
        // The header value may be a number of seconds or an HTTP-date; only the
        // seconds form is supported here (HTTP-date is uncommon for APIs).
        let retryAfterMs: number | undefined;
        if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after");
          if (retryAfter !== null) {
            const seconds = Number(retryAfter);
            if (Number.isFinite(seconds) && seconds >= 0) {
              retryAfterMs = Math.round(seconds * 1000);
            }
          }
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
