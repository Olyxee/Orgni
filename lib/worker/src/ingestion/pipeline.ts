/**
 * Orgni ingestion pipeline.
 *
 * Owns everything between "bytes arrived" and "Document Intelligence has an
 * answer": validation, checksums, stable identity, duplicate detection, state
 * transitions and bounded retries.
 *
 * Two properties matter most here. First, one bad document must never stop the
 * others — every failure is caught and recorded as a FAILED record, so batch
 * processing continues. Second, logs carry identifiers and never document
 * content, because the documents are invoices and contracts.
 */

import { createHash, randomUUID } from "node:crypto";
import type { PrincipalRule } from "@workspace/contracts";

import type { NormalizedEnvelope } from "../envelope/types.js";
import {
  DocumentIntelligenceError,
  type DocumentIntelligenceOptions,
} from "../document-intelligence/client.js";

export type { DocumentIntelligenceOptions } from "../document-intelligence/client.js";

export type IngestionState = "RECEIVED" | "PROCESSING" | "COMPLETED" | "FAILED";

export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/tab-separated-values",
  "text/xml",
  "text/html",
  "application/json",
  "application/xml",
  "application/rtf",
  "text/rtf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

export interface IngestionLimits {
  /** Maximum accepted document size. Default 20 MB. */
  maxBytes: number;
  /** Attempts per document for recoverable failures. Default 5. */
  maxAttempts: number;
  /** Base delay for retry backoff, in milliseconds. Default 1000 ms (1 s). */
  retryBaseMs: number;
  /** Maximum wait time in milliseconds honored from a Retry-After header. Default 10 000 ms (10 s). */
  maxRetryAfterMs: number;
  /** Overall time budget in milliseconds across all attempts and delays. Default 60 000 ms (60 s). */
  totalTimeoutMs: number;
}

export const DEFAULT_LIMITS: IngestionLimits = {
  maxBytes: 20 * 1024 * 1024,
  maxAttempts: 5,
  retryBaseMs: 1000,
  maxRetryAfterMs: 10_000,
  totalTimeoutMs: 60_000,
};

export interface IngestionInput {
  /** Reuse an existing source identity when retrying a failed document. */
  sourceId?: string;
  filename: string;
  mimeType: string;
  content: Uint8Array | string;
  tenantId: string;
  /** Access rules carried from the source system through to the tokens. */
  sourceAcl?: PrincipalRule[];
  uploadedAt?: string;
}

export interface IngestionRecord {
  sourceId: string;
  state: IngestionState;
  checksum: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  tenantId: string;
  sourceType: "UPLOAD";
  sourceAcl: PrincipalRule[];
  uploadedAt: string;
  attempts: number;
  duplicateOf?: string;
  envelope?: NormalizedEnvelope;
  warnings: string[];
  errors: string[];
}

/** Minimal log surface so this module stays testable without a logger. */
export interface PipelineLogger {
  info(payload: Record<string, unknown>, message: string): void;
  warn(payload: Record<string, unknown>, message: string): void;
  error(payload: Record<string, unknown>, message: string): void;
}

const noopLogger: PipelineLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

/** Document Intelligence call; injected so the pipeline stays transport-agnostic. */
export type DocumentIntelligence = (
  record: IngestionRecord,
  content: Uint8Array | string,
  options?: DocumentIntelligenceOptions,
) => Promise<NormalizedEnvelope>;

/**
 * Records seen so far, keyed by checksum, for duplicate detection.
 * Swappable for a persistent store; the pipeline only needs these two methods.
 */
export interface SeenStore {
  get(checksum: string): string | undefined;
  set(checksum: string, sourceId: string): void;
}

export function createMemorySeenStore(): SeenStore {
  const seen = new Map<string, string>();
  return {
    get: (checksum) => seen.get(checksum),
    set: (checksum, sourceId) => {
      seen.set(checksum, sourceId);
    },
  };
}

export function checksumOf(content: Uint8Array | string): string {
  return createHash("sha256").update(content).digest("hex");
}

function byteLength(content: Uint8Array | string): number {
  return typeof content === "string"
    ? Buffer.byteLength(content, "utf8")
    : content.byteLength;
}

export function isSupportedMimeType(
  mimeType: string,
): mimeType is SupportedMimeType {
  return (SUPPORTED_MIME_TYPES as readonly string[]).includes(mimeType);
}

/** Errors worth retrying: transient transport/availability problems. */
export function isRecoverable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  // Structured errors from the Document Intelligence client are checked first
  // so retry classification is based strictly on typed fields, not string parsing.
  if (error instanceof DocumentIntelligenceError) {
    // Client-side timeout or connection failure: always recoverable.
    if (error.isTimeout || error.isConnectionFailure) return true;

    // HTTP response received: retry on transient server/gateway errors and
    // rate-limiting (408, 429, 502, 503, 504). Other 4xx responses, including
    // 400, are permanent client errors and must not be retried.
    if (error.status !== undefined) {
      return (
        error.status === 408 ||
        error.status === 429 ||
        error.status === 502 ||
        error.status === 503 ||
        error.status === 504
      );
    }

    // Do NOT fall back to parsing error-message strings for DocumentIntelligenceError.
    return false;
  }

  // Fallback: plain Error instances thrown by test mocks or future transports
  // that don't use DocumentIntelligenceError. Kept separate and clearly tested.
  const msg = error.message.toLowerCase();
  return (
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("econnreset") ||
    msg.includes("socket hang up") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("504") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("429") ||
    msg.includes("408")
  );
}

/**
 * Compute the delay in milliseconds before the next retry attempt.
 *
 * Uses exponential backoff with ±10 % uniform jitter.  When the error carries
 * a `Retry-After` header value the server's requested delay is used instead,
 * capped at the configured `maxRetryAfterMs` so operator limits are respected.
 *
 * Exported for direct unit testing.
 *
 * @param attempt        1-based index of the attempt that just failed.
 * @param limits         Active ingestion limits.
 * @param error          The error that was thrown (may carry retryAfterMs).
 * @param randomFraction A value in [0, 1) substituted for Math.random() in
 *                       tests to make jitter deterministic.
 */
export function computeRetryDelay(
  attempt: number,
  limits: IngestionLimits,
  error: unknown,
  randomFraction = Math.random(),
): number {
  // Maximum delay any attempt may wait.
  const maxDelay = limits.retryBaseMs * 2 ** (limits.maxAttempts - 1);

  // Honour a server-supplied Retry-After, capped at maxRetryAfterMs.
  if (error instanceof DocumentIntelligenceError && error.retryAfterMs !== undefined) {
    return Math.min(error.retryAfterMs, limits.maxRetryAfterMs);
  }

  // Exponential base for this attempt index (attempt is 1-based; the delay
  // applies before attempt+1, so we use the current attempt as the exponent).
  const base = limits.retryBaseMs * 2 ** (attempt - 1);
  // ±10 % uniform jitter: multiplier in [0.9, 1.1)
  const jittered = Math.round(base * (0.9 + randomFraction * 0.2));
  return Math.min(jittered, maxDelay);
}

const defaultDelay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface IngestOptions {
  limits?: Partial<IngestionLimits>;
  logger?: PipelineLogger;
  seen?: SeenStore;
  /**
   * Override the sleep function used between retry attempts.
   * Injected in tests to record delay values without actually waiting.
   * Production code leaves this unset and gets real `setTimeout`-based delay.
   */
  _delayfn?: (ms: number) => Promise<void>;
}

/**
 * Ingest one document. Always resolves: failures are returned as a FAILED
 * record rather than thrown, so callers processing a batch keep going.
 */
export async function ingestDocument(
  input: IngestionInput,
  documentIntelligence: DocumentIntelligence,
  options: IngestOptions = {},
): Promise<IngestionRecord> {
  const limits: IngestionLimits = {
    ...DEFAULT_LIMITS,
    ...options.limits,
  };

  // Reject invalid, non-positive limit configurations
  if (
    limits.maxAttempts <= 0 ||
    limits.retryBaseMs <= 0 ||
    limits.maxBytes <= 0 ||
    limits.maxRetryAfterMs <= 0 ||
    limits.totalTimeoutMs <= 0
  ) {
    throw new RangeError("Ingestion limits must have positive values");
  }

  const log = options.logger ?? noopLogger;
  const seen = options.seen;
  const sleep = options._delayfn ?? defaultDelay;

  const checksum = checksumOf(input.content);
  const byteSize = byteLength(input.content);

  const record: IngestionRecord = {
    sourceId: input.sourceId ?? `src_${randomUUID()}`,
    state: "RECEIVED",
    checksum,
    filename: input.filename,
    mimeType: input.mimeType,
    byteSize,
    tenantId: input.tenantId,
    sourceType: "UPLOAD",
    sourceAcl: input.sourceAcl ?? [],
    uploadedAt: input.uploadedAt ?? new Date().toISOString(),
    attempts: 0,
    warnings: [],
    errors: [],
  };

  // Identifiers and sizes only — never filename contents or document text.
  log.info(
    {
      sourceId: record.sourceId,
      tenantId: record.tenantId,
      mimeType: record.mimeType,
      byteSize,
    },
    "document received",
  );

  // ── Validation ──────────────────────────────────────────────────────────
  if (!isSupportedMimeType(input.mimeType)) {
    record.state = "FAILED";
    record.errors.push(`unsupported_mime_type: ${input.mimeType}`);
    log.warn(
      { sourceId: record.sourceId, mimeType: input.mimeType },
      "unsupported type rejected",
    );
    return record;
  }

  if (byteSize === 0) {
    record.state = "FAILED";
    record.errors.push("empty_document");
    return record;
  }

  if (byteSize > limits.maxBytes) {
    record.state = "FAILED";
    record.errors.push(`document_too_large: ${byteSize} > ${limits.maxBytes}`);
    log.warn(
      { sourceId: record.sourceId, byteSize, maxBytes: limits.maxBytes },
      "oversize rejected",
    );
    return record;
  }

  // ── Duplicate detection ─────────────────────────────────────────────────
  const previous = seen?.get(checksum);
  if (previous) {
    record.state = "COMPLETED";
    record.duplicateOf = previous;
    record.warnings.push(`duplicate_of: ${previous}`);
    log.info(
      { sourceId: record.sourceId, duplicateOf: previous },
      "duplicate detected, skipping",
    );
    return record;
  }

  // ── Document Intelligence, with bounded retries & deadline budget ───────
  record.state = "PROCESSING";

  const startTime = Date.now();
  let lastError: unknown;
  let deadlineExceeded = false;

  for (let attempt = 1; attempt <= limits.maxAttempts; attempt += 1) {
    const elapsedBefore = Date.now() - startTime;
    const remainingTimeBudget = limits.totalTimeoutMs - elapsedBefore;
    if (remainingTimeBudget <= 0) {
      deadlineExceeded = true;
      log.warn(
        {
          sourceId: record.sourceId,
          attempt,
          elapsedBefore,
          totalTimeoutMs: limits.totalTimeoutMs,
        },
        "retry aborted: total time budget exhausted before attempt",
      );
      break;
    }

    record.attempts = attempt;
    try {
      const envelope = await documentIntelligence(record, input.content, {
        timeoutMs: remainingTimeBudget,
      });
      record.envelope = envelope;
      record.warnings.push(...envelope.warnings);
      record.state = "COMPLETED";
      seen?.set(checksum, record.sourceId);
      log.info(
        {
          sourceId: record.sourceId,
          documentType: envelope.document_type,
          confidence: envelope.confidence,
          attempts: attempt,
        },
        "document intelligence completed",
      );
      return record;
    } catch (error) {
      lastError = error;
      const recoverable = isRecoverable(error);
      log.warn(
        {
          sourceId: record.sourceId,
          attempt,
          maxAttempts: limits.maxAttempts,
          recoverable,
          error: error instanceof Error ? error.name : "unknown",
        },
        "document intelligence attempt failed",
      );
      if (!recoverable || attempt === limits.maxAttempts) break;

      const delayMs = computeRetryDelay(attempt, limits, error);
      const elapsedAfter = Date.now() - startTime;
      const remainingBudget = limits.totalTimeoutMs - elapsedAfter;

      if (delayMs > remainingBudget) {
        deadlineExceeded = true;
        log.warn(
          {
            sourceId: record.sourceId,
            attempt,
            delayMs,
            remainingBudget,
            totalTimeoutMs: limits.totalTimeoutMs,
          },
          "retry aborted: delay exceeds remaining timeout budget",
        );
        break;
      }

      log.info(
        { sourceId: record.sourceId, attempt, delayMs },
        "retrying after delay",
      );
      await sleep(delayMs);
    }
  }

  record.state = "FAILED";

  // Classify the failure so callers can distinguish between a permanent client
  // error (e.g. HTTP 400 — no point retrying) and a transient failure that
  // exhausted all configured attempts or time budget.
  const isPermanent =
    lastError instanceof DocumentIntelligenceError &&
    lastError.status !== undefined &&
    !isRecoverable(lastError);

  const failureKind = isPermanent
    ? "permanent"
    : "transient_exhausted";

  // Build a diagnostic message that preserves the HTTP status, response body
  // excerpt, and deadline budget exhaustion details.
  let failureDetail: string;
  if (deadlineExceeded) {
    const elapsed = Date.now() - startTime;
    const causeMsg =
      lastError instanceof DocumentIntelligenceError && lastError.message
        ? lastError.message
        : lastError instanceof Error
          ? lastError.message
          : String(lastError ?? "no response");
    failureDetail = `time budget of ${limits.totalTimeoutMs}ms exceeded after ${elapsed}ms (last error: ${causeMsg})`;
  } else if (lastError instanceof DocumentIntelligenceError) {
    const parts = [lastError.message];
    if (lastError.responseBody) {
      parts.push(`response: ${lastError.responseBody}`);
    }
    failureDetail = parts.join(" | ");
  } else {
    failureDetail =
      lastError instanceof Error ? lastError.message : String(lastError);
  }
  record.errors.push(`document_intelligence_failed (${failureKind}): ${failureDetail}`);

  log.error(
    {
      sourceId: record.sourceId,
      attempts: record.attempts,
      failureKind,
      deadlineExceeded,
      status:
        lastError instanceof DocumentIntelligenceError
          ? lastError.status
          : undefined,
      // Include the original error name and message so structured log sinks
      // can surface the root cause without parsing the string above.
      cause:
        lastError instanceof Error
          ? { name: lastError.name, message: lastError.message }
          : undefined,
    },
    "document intelligence failed after retries",
  );
  return record;
}

/**
 * Ingest many documents, isolating failures.
 * A rejection in one document never affects the others.
 */
export async function ingestBatch(
  inputs: IngestionInput[],
  documentIntelligence: DocumentIntelligence,
  options: IngestOptions = {},
): Promise<IngestionRecord[]> {
  const seen = options.seen ?? createMemorySeenStore();
  const records: IngestionRecord[] = [];
  for (const input of inputs) {
    records.push(
      await ingestDocument(input, documentIntelligence, { ...options, seen }),
    );
  }
  return records;
}
