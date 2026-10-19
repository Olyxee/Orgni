import { describe, expect, it, vi } from "vitest";
import type { PrincipalRule } from "@workspace/contracts";

import {
  checksumOf,
  computeRetryDelay,
  createMemorySeenStore,
  DEFAULT_LIMITS,
  ingestBatch,
  ingestDocument,
  isRecoverable,
  isSupportedMimeType,
  type DocumentIntelligence,
  type IngestionInput,
} from "../src/ingestion/pipeline.js";
import type { NormalizedEnvelope } from "../src/envelope/types.js";

function envelopeFor(sourceId: string, tenantId: string): NormalizedEnvelope {
  return {
    source_id: sourceId,
    source_type: "UPLOAD",
    document_type: "UNKNOWN",
    content: { text: "x", language: "en" },
    extracted_fields: {},
    tables: [],
    metadata: {
      filename: "f.txt",
      mime_type: "text/plain",
      checksum: "c",
      tenant_id: tenantId,
    },
    evidence_locations: [],
    confidence: 0,
    warnings: [],
    schema_version: "0.1.0",
  };
}

const ok: DocumentIntelligence = async (record) =>
  envelopeFor(record.sourceId, record.tenantId);

function input(overrides: Partial<IngestionInput> = {}): IngestionInput {
  return {
    filename: "invoice.txt",
    mimeType: "text/plain",
    content: "TAX INVOICE",
    tenantId: "tenant_olyxee",
    ...overrides,
  };
}

describe("ingestion — validation", () => {
  it("accepts the supported types and rejects others", () => {
    expect(isSupportedMimeType("application/pdf")).toBe(true);
    expect(isSupportedMimeType("image/png")).toBe(true);
    expect(isSupportedMimeType("image/jpeg")).toBe(true);
    expect(isSupportedMimeType("text/plain")).toBe(true);
    expect(isSupportedMimeType("text/csv")).toBe(true);
    expect(isSupportedMimeType("application/json")).toBe(true);
    expect(
      isSupportedMimeType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe(true);
    expect(
      isSupportedMimeType(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe(true);
    expect(isSupportedMimeType("application/zip")).toBe(false);
  });

  it("reuses a source id when retrying a failed document", async () => {
    const record = await ingestDocument(input({ sourceId: "src_retry" }), ok);

    expect(record.sourceId).toBe("src_retry");
    expect(record.state).toBe("COMPLETED");
  });

  it("fails an unsupported type without calling document intelligence", async () => {
    const di = vi.fn(ok);
    const record = await ingestDocument(
      input({ mimeType: "application/zip" }),
      di,
    );

    expect(record.state).toBe("FAILED");
    expect(record.errors[0]).toContain("unsupported_mime_type");
    expect(di).not.toHaveBeenCalled();
  });

  it("fails an empty document", async () => {
    const record = await ingestDocument(input({ content: "" }), ok);
    expect(record.state).toBe("FAILED");
    expect(record.errors).toContain("empty_document");
  });

  it("enforces the configured size limit", async () => {
    const record = await ingestDocument(
      input({ content: "x".repeat(500) }),
      ok,
      {
        limits: { maxBytes: 100 },
      },
    );
    expect(record.state).toBe("FAILED");
    expect(record.errors[0]).toContain("document_too_large");
  });
});

describe("ingestion — identity and checksums", () => {
  it("computes a stable sha256 checksum", async () => {
    const record = await ingestDocument(input(), ok);
    expect(record.checksum).toBe(checksumOf("TAX INVOICE"));
    expect(record.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates a unique source_id per submission", async () => {
    const a = await ingestDocument(input(), ok);
    const b = await ingestDocument(input(), ok);
    expect(a.sourceId).not.toBe(b.sourceId);
    expect(a.sourceId).toMatch(/^src_/);
  });

  it("records filename, mime type, size, upload time and source type", async () => {
    const record = await ingestDocument(input(), ok);
    expect(record.filename).toBe("invoice.txt");
    expect(record.mimeType).toBe("text/plain");
    expect(record.byteSize).toBe(11);
    expect(record.sourceType).toBe("UPLOAD");
    expect(Date.parse(record.uploadedAt)).not.toBeNaN();
  });
});

describe("ingestion — duplicate handling", () => {
  it("flags a repeat checksum as a duplicate and skips reprocessing", async () => {
    const seen = createMemorySeenStore();
    const di = vi.fn(ok);

    const first = await ingestDocument(input(), di, { seen });
    const second = await ingestDocument(input(), di, { seen });

    expect(first.duplicateOf).toBeUndefined();
    expect(second.duplicateOf).toBe(first.sourceId);
    expect(second.warnings.join()).toContain("duplicate_of");
    expect(di).toHaveBeenCalledTimes(1);
  });

  it("treats different content as distinct documents", async () => {
    const seen = createMemorySeenStore();
    const first = await ingestDocument(input(), ok, { seen });
    const second = await ingestDocument(input({ content: "OTHER" }), ok, {
      seen,
    });
    expect(second.duplicateOf).toBeUndefined();
    expect(second.checksum).not.toBe(first.checksum);
  });
});

describe("ingestion — state machine", () => {
  it("reaches COMPLETED on success", async () => {
    const record = await ingestDocument(input(), ok);
    expect(record.state).toBe("COMPLETED");
    expect(record.envelope).toBeDefined();
  });

  it("reaches FAILED when document intelligence keeps failing", async () => {
    const record = await ingestDocument(
      input(),
      async () => {
        throw new Error("boom");
      },
      { limits: { maxAttempts: 1 } },
    );
    expect(record.state).toBe("FAILED");
    expect(record.errors[0]).toContain("document_intelligence_failed");
  });
});

describe("ingestion — retries", () => {
  it("classifies transient transport errors as recoverable", () => {
    expect(isRecoverable(new Error("ECONNREFUSED"))).toBe(true);
    expect(isRecoverable(new Error("service returned 503"))).toBe(true);
    expect(isRecoverable(new Error("request timeout"))).toBe(true);
    expect(isRecoverable(new Error("unsupported file"))).toBe(false);
  });

  it("retries a recoverable failure up to the bound and then succeeds", async () => {
    let calls = 0;
    const flaky: DocumentIntelligence = async (record) => {
      calls += 1;
      if (calls < 3) throw new Error("ECONNRESET");
      return envelopeFor(record.sourceId, record.tenantId);
    };

    const record = await ingestDocument(input(), flaky, {
      limits: { maxAttempts: 3, retryBaseMs: 1 },
    });

    expect(record.state).toBe("COMPLETED");
    expect(record.attempts).toBe(3);
  });

  it("does not retry a non-recoverable failure", async () => {
    let calls = 0;
    const record = await ingestDocument(
      input(),
      async () => {
        calls += 1;
        throw new Error("malformed document");
      },
      { limits: { maxAttempts: 3, retryBaseMs: 1 } },
    );

    expect(record.state).toBe("FAILED");
    expect(calls).toBe(1);
  });

  it("stops after maxAttempts for a persistently recoverable failure", async () => {
    let calls = 0;
    const record = await ingestDocument(
      input(),
      async () => {
        calls += 1;
        throw new Error("ETIMEDOUT");
      },
      { limits: { maxAttempts: 3, retryBaseMs: 1 } },
    );

    expect(record.state).toBe("FAILED");
    expect(calls).toBe(3);
  });
});

describe("ingestion — failure isolation", () => {
  it("keeps processing the batch when one document fails", async () => {
    const di: DocumentIntelligence = async (record) => {
      if (record.filename === "bad.txt") throw new Error("malformed document");
      return envelopeFor(record.sourceId, record.tenantId);
    };

    const records = await ingestBatch(
      [
        input({ filename: "a.txt", content: "A" }),
        input({ filename: "bad.txt", content: "B" }),
        input({ filename: "c.txt", content: "C" }),
      ],
      di,
      { limits: { maxAttempts: 1 } },
    );

    expect(records).toHaveLength(3);
    expect(records.map((r) => r.state)).toEqual([
      "COMPLETED",
      "FAILED",
      "COMPLETED",
    ]);
  });

  it("keeps processing when one document is an unsupported type", async () => {
    const records = await ingestBatch(
      [
        input({ content: "A" }),
        input({ content: "B", mimeType: "application/zip" }),
        input({ content: "C" }),
      ],
      ok,
    );
    expect(records.map((r) => r.state)).toEqual([
      "COMPLETED",
      "FAILED",
      "COMPLETED",
    ]);
  });
});

describe("ingestion — security and access metadata", () => {
  it("propagates tenant id and source ACL onto the record", async () => {
    const acl: PrincipalRule[] = [
      {
        principalId: "group_finance",
        principalType: "GROUP",
        effect: "ALLOW",
        actions: ["READ"],
      },
    ];

    const record = await ingestDocument(
      input({ tenantId: "tenant_acme", sourceAcl: acl }),
      ok,
    );

    expect(record.tenantId).toBe("tenant_acme");
    expect(record.sourceAcl).toEqual(acl);
  });

  it("passes the tenant through to document intelligence", async () => {
    const seenTenants: string[] = [];
    await ingestDocument(input({ tenantId: "tenant_xyz" }), async (record) => {
      seenTenants.push(record.tenantId);
      return envelopeFor(record.sourceId, record.tenantId);
    });
    expect(seenTenants).toEqual(["tenant_xyz"]);
  });

  it("never writes document content into the logs", async () => {
    const entries: Record<string, unknown>[] = [];
    const logger = {
      info: (payload: Record<string, unknown>) => entries.push(payload),
      warn: (payload: Record<string, unknown>) => entries.push(payload),
      error: (payload: Record<string, unknown>) => entries.push(payload),
    };

    const secret = "TAX INVOICE for Clover Retail Group totalling 13225.00";
    await ingestDocument(input({ content: secret }), ok, { logger });

    const serialised = JSON.stringify(entries);
    expect(serialised).not.toContain("Clover Retail Group");
    expect(serialised).not.toContain("13225.00");
    // Identifiers are still present for traceability.
    expect(serialised).toContain("sourceId");
  });
});
import { DocumentIntelligenceError } from "../src/document-intelligence/client.js";

// ---------------------------------------------------------------------------
// isRecoverable — structured DocumentIntelligenceError classification
// ---------------------------------------------------------------------------

describe("isRecoverable — DocumentIntelligenceError typed checks", () => {
  it("treats isTimeout:true as recoverable regardless of message text", () => {
    const err = new DocumentIntelligenceError(
      "document intelligence timed out after 30000ms",
      { isTimeout: true },
    );
    expect(isRecoverable(err)).toBe(true);
  });

  it("treats a plain AbortError-like error that lacks 'timeout' as recoverable via isTimeout flag", () => {
    // Node.js AbortController message: "This operation was aborted"
    // Without the isTimeout flag the old code would miss this.
    const err = new DocumentIntelligenceError("This operation was aborted", {
      isTimeout: true,
    });
    expect(isRecoverable(err)).toBe(true);
  });

  it("treats HTTP 503 as recoverable", () => {
    const err = new DocumentIntelligenceError(
      "document intelligence returned 503 Service Unavailable",
      { status: 503 },
    );
    expect(isRecoverable(err)).toBe(true);
  });

  it("treats HTTP 502 as recoverable", () => {
    const err = new DocumentIntelligenceError(
      "document intelligence returned 502 Bad Gateway",
      { status: 502 },
    );
    expect(isRecoverable(err)).toBe(true);
  });

  it("treats HTTP 429 as recoverable", () => {
    const err = new DocumentIntelligenceError(
      "document intelligence returned 429 Too Many Requests",
      { status: 429 },
    );
    expect(isRecoverable(err)).toBe(true);
  });

  it("treats HTTP 400 as non-recoverable", () => {
    const err = new DocumentIntelligenceError(
      "document intelligence returned 400 Bad Request",
      { status: 400 },
    );
    expect(isRecoverable(err)).toBe(false);
  });

  it("treats HTTP 401 as non-recoverable", () => {
    const err = new DocumentIntelligenceError(
      "document intelligence returned 401 Unauthorized",
      { status: 401 },
    );
    expect(isRecoverable(err)).toBe(false);
  });

  it("treats HTTP 413 as non-recoverable", () => {
    const err = new DocumentIntelligenceError(
      "document intelligence returned 413 Request Entity Too Large",
      { status: 413 },
    );
    expect(isRecoverable(err)).toBe(false);
  });

  it("treats HTTP 415 as non-recoverable", () => {
    const err = new DocumentIntelligenceError(
      "document intelligence returned 415 Unsupported Media Type",
      { status: 415 },
    );
    expect(isRecoverable(err)).toBe(false);
  });

  it("treats a connection-refused DocumentIntelligenceError (no status) as recoverable", () => {
    // Network failure before a response — no status set, message carries ECONNREFUSED.
    const err = new DocumentIntelligenceError(
      "document intelligence connection failed: connect ECONNREFUSED 127.0.0.1:8000",
    );
    expect(isRecoverable(err)).toBe(true);
  });

  it("treats a connection-reset DocumentIntelligenceError (no status) as recoverable", () => {
    const err = new DocumentIntelligenceError(
      "document intelligence connection failed: read ECONNRESET",
    );
    expect(isRecoverable(err)).toBe(true);
  });

  // Plain Error instances (e.g. from test mocks) still work via the fallback path.
  it("still classifies plain ECONNREFUSED errors as recoverable (fallback)", () => {
    expect(isRecoverable(new Error("ECONNREFUSED"))).toBe(true);
  });

  it("still classifies plain timeout errors as recoverable (fallback)", () => {
    expect(isRecoverable(new Error("request timeout"))).toBe(true);
  });

  it("still classifies plain 503-in-message errors as recoverable (fallback)", () => {
    expect(isRecoverable(new Error("service returned 503"))).toBe(true);
  });

  it("treats a non-Error as non-recoverable", () => {
    expect(isRecoverable("some string")).toBe(false);
    expect(isRecoverable(null)).toBe(false);
    expect(isRecoverable(42)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ingestDocument — retry behaviour driven by DocumentIntelligenceError
// ---------------------------------------------------------------------------

describe("ingestion — retry classification with DocumentIntelligenceError", () => {
  it("does not retry HTTP 400 — fails after exactly one attempt", async () => {
    let calls = 0;
    const record = await ingestDocument(
      input(),
      async () => {
        calls += 1;
        throw new DocumentIntelligenceError(
          "document intelligence returned 400 Bad Request",
          { status: 400, responseBody: '{"detail":"source_id missing"}' },
        );
      },
      { limits: { maxAttempts: 3, retryBaseMs: 1 } },
    );

    expect(record.state).toBe("FAILED");
    expect(calls).toBe(1);
    expect(record.errors[0]).toContain("document_intelligence_failed");
    expect(record.errors[0]).toContain("400");
  });

  it("preserves the responseBody excerpt in record.errors after HTTP 400", async () => {
    const record = await ingestDocument(
      input(),
      async () => {
        throw new DocumentIntelligenceError(
          "document intelligence returned 400 Bad Request",
          {
            status: 400,
            responseBody: '{"detail":"tenant_id missing"}',
          },
        );
      },
      { limits: { maxAttempts: 1, retryBaseMs: 1 } },
    );

    expect(record.errors[0]).toContain("tenant_id missing");
  });

  it("retries HTTP 503 up to maxAttempts", async () => {
    let calls = 0;
    const record = await ingestDocument(
      input(),
      async () => {
        calls += 1;
        throw new DocumentIntelligenceError(
          "document intelligence returned 503 Service Unavailable",
          { status: 503 },
        );
      },
      { limits: { maxAttempts: 3, retryBaseMs: 1 } },
    );

    expect(record.state).toBe("FAILED");
    expect(calls).toBe(3);
  });

  it("retries HTTP 503 then succeeds when service recovers", async () => {
    let calls = 0;
    const record = await ingestDocument(
      input(),
      async (rec) => {
        calls += 1;
        if (calls < 3) {
          throw new DocumentIntelligenceError(
            "document intelligence returned 503 Service Unavailable",
            { status: 503 },
          );
        }
        return envelopeFor(rec.sourceId, rec.tenantId);
      },
      { limits: { maxAttempts: 3, retryBaseMs: 1 } },
    );

    expect(record.state).toBe("COMPLETED");
    expect(calls).toBe(3);
  });

  it("retries a timeout (isTimeout:true) up to maxAttempts", async () => {
    let calls = 0;
    const record = await ingestDocument(
      input(),
      async () => {
        calls += 1;
        throw new DocumentIntelligenceError(
          "document intelligence timed out after 30000ms",
          { isTimeout: true },
        );
      },
      { limits: { maxAttempts: 3, retryBaseMs: 1 } },
    );

    expect(record.state).toBe("FAILED");
    expect(calls).toBe(3);
  });

  it("retries a connection-refused error (no status) up to maxAttempts", async () => {
    let calls = 0;
    const record = await ingestDocument(
      input(),
      async () => {
        calls += 1;
        throw new DocumentIntelligenceError(
          "document intelligence connection failed: connect ECONNREFUSED 127.0.0.1:8000",
        );
      },
      { limits: { maxAttempts: 3, retryBaseMs: 1 } },
    );

    expect(record.state).toBe("FAILED");
    expect(calls).toBe(3);
  });

  it("does not retry HTTP 413 — fails after exactly one attempt", async () => {
    let calls = 0;
    const record = await ingestDocument(
      input(),
      async () => {
        calls += 1;
        throw new DocumentIntelligenceError(
          "document intelligence returned 413 Request Entity Too Large",
          { status: 413 },
        );
      },
      { limits: { maxAttempts: 3, retryBaseMs: 1 } },
    );

    expect(record.state).toBe("FAILED");
    expect(calls).toBe(1);
  });

  it("retries HTTP 429 and records the status in the final error", async () => {
    let calls = 0;
    const record = await ingestDocument(
      input(),
      async () => {
        calls += 1;
        throw new DocumentIntelligenceError(
          "document intelligence returned 429 Too Many Requests",
          { status: 429 },
        );
      },
      { limits: { maxAttempts: 2, retryBaseMs: 1 } },
    );

    expect(record.state).toBe("FAILED");
    expect(calls).toBe(2);
    expect(record.errors[0]).toContain("429");
  });
});

// ---------------------------------------------------------------------------
// computeRetryDelay — pure unit tests
// ---------------------------------------------------------------------------

describe("computeRetryDelay", () => {
  // Use randomFraction = 0.5 (midpoint) to get exact jitter-free base values
  // when we just want to verify the exponential formula.
  const MID = 0.5; // 0.9 + 0.5 * 0.2 = 1.0  → no jitter at midpoint

  it("returns retryBaseMs for attempt 1 at midpoint jitter", () => {
    expect(computeRetryDelay(1, DEFAULT_LIMITS, null, MID)).toBe(
      DEFAULT_LIMITS.retryBaseMs,
    );
  });

  it("doubles the delay for attempt 2 (exponential growth)", () => {
    const d1 = computeRetryDelay(1, DEFAULT_LIMITS, null, MID);
    const d2 = computeRetryDelay(2, DEFAULT_LIMITS, null, MID);
    expect(d2).toBe(d1 * 2);
  });

  it("caps at maxDelay regardless of attempt number", () => {
    const limits = { maxBytes: 0, maxAttempts: 3, retryBaseMs: 100 };
    // maxDelay = 100 * 2^2 = 400; attempt 10 would be 100 * 2^9 = 51200
    const capped = computeRetryDelay(10, limits, null, MID);
    expect(capped).toBe(400);
  });

  it("applies jitter: randomFraction 0 gives 90% of base, 1 gives 110%", () => {
    const base = 100;
    const limits = { maxBytes: 0, maxAttempts: 10, retryBaseMs: base };
    const low = computeRetryDelay(1, limits, null, 0); // 0.9 + 0*0.2 = 0.9
    const high = computeRetryDelay(1, limits, null, 1); // 0.9 + 1*0.2 = 1.1
    expect(low).toBe(Math.round(base * 0.9));
    expect(high).toBe(Math.round(base * 1.1));
  });

  it("honours Retry-After from DocumentIntelligenceError, ignoring backoff formula", () => {
    const err = new DocumentIntelligenceError(
      "document intelligence returned 429 Too Many Requests",
      { status: 429, retryAfterMs: 80 },
    );
    const limits = { maxBytes: 0, maxAttempts: 3, retryBaseMs: 50 };
    // maxDelay = 50 * 2^2 = 200; retryAfterMs 80 is within the cap.
    expect(computeRetryDelay(1, limits, err, MID)).toBe(80);
  });

  it("caps Retry-After at maxDelay so it cannot exceed configured limits", () => {
    const err = new DocumentIntelligenceError(
      "document intelligence returned 429 Too Many Requests",
      { status: 429, retryAfterMs: 999_999 },
    );
    const limits = { maxBytes: 0, maxAttempts: 3, retryBaseMs: 50 };
    const maxDelay = 50 * 2 ** 2; // 200 ms
    expect(computeRetryDelay(1, limits, err, MID)).toBe(maxDelay);
  });

  it("ignores retryAfterMs on non-DocumentIntelligenceError and uses backoff", () => {
    // Plain Error has no retryAfterMs — should fall back to formula
    const plain = new Error("ECONNREFUSED");
    const limits = { maxBytes: 0, maxAttempts: 3, retryBaseMs: 100 };
    expect(computeRetryDelay(1, limits, plain, MID)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Step 4 reliability scenarios
// ---------------------------------------------------------------------------

describe("ingestion — connection refusal and eventual success", () => {
  it("succeeds after two ECONNREFUSED failures on attempt 3", async () => {
    const delays: number[] = [];
    let calls = 0;

    const record = await ingestDocument(
      input(),
      async (rec) => {
        calls += 1;
        if (calls < 3) {
          throw new DocumentIntelligenceError(
            "document intelligence connection failed: connect ECONNREFUSED 127.0.0.1:8000",
          );
        }
        return envelopeFor(rec.sourceId, rec.tenantId);
      },
      {
        limits: { maxAttempts: 3, retryBaseMs: 100 },
        _delayfn: async (ms) => { delays.push(ms); },
      },
    );

    expect(record.state).toBe("COMPLETED");
    expect(calls).toBe(3);
    expect(delays).toHaveLength(2); // delay before attempt 2 and 3
  });

  it("exhausts maxAttempts on persistent ECONNREFUSED and records transient_exhausted", async () => {
    let calls = 0;

    const record = await ingestDocument(
      input(),
      async () => {
        calls += 1;
        throw new DocumentIntelligenceError(
          "document intelligence connection failed: connect ECONNREFUSED 127.0.0.1:8000",
        );
      },
      { limits: { maxAttempts: 3, retryBaseMs: 1 }, _delayfn: async () => {} },
    );

    expect(record.state).toBe("FAILED");
    expect(calls).toBe(3);
    expect(record.errors[0]).toContain("transient_exhausted");
    expect(record.errors[0]).toContain("ECONNREFUSED");
  });
});

describe("ingestion — timeout and eventual success", () => {
  it("succeeds after two timeouts on attempt 3", async () => {
    let calls = 0;

    const record = await ingestDocument(
      input(),
      async (rec) => {
        calls += 1;
        if (calls < 3) {
          throw new DocumentIntelligenceError(
            "document intelligence timed out after 30000ms",
            { isTimeout: true },
          );
        }
        return envelopeFor(rec.sourceId, rec.tenantId);
      },
      { limits: { maxAttempts: 3, retryBaseMs: 1 }, _delayfn: async () => {} },
    );

    expect(record.state).toBe("COMPLETED");
    expect(calls).toBe(3);
  });

  it("exhausts maxAttempts on persistent timeout and records transient_exhausted", async () => {
    let calls = 0;

    const record = await ingestDocument(
      input(),
      async () => {
        calls += 1;
        throw new DocumentIntelligenceError(
          "document intelligence timed out after 30000ms",
          { isTimeout: true },
        );
      },
      { limits: { maxAttempts: 3, retryBaseMs: 1 }, _delayfn: async () => {} },
    );

    expect(record.state).toBe("FAILED");
    expect(calls).toBe(3);
    expect(record.errors[0]).toContain("transient_exhausted");
    expect(record.errors[0]).toContain("timed out");
  });
});

describe("ingestion — HTTP 400 permanent failure", () => {
  it("fails immediately on HTTP 400 without any delay", async () => {
    const delays: number[] = [];
    let calls = 0;

    const record = await ingestDocument(
      input(),
      async () => {
        calls += 1;
        throw new DocumentIntelligenceError(
          "document intelligence returned 400 Bad Request",
          { status: 400, responseBody: '{"detail":"missing source_id"}' },
        );
      },
      {
        limits: { maxAttempts: 3, retryBaseMs: 100 },
        _delayfn: async (ms) => { delays.push(ms); },
      },
    );

    expect(record.state).toBe("FAILED");
    expect(calls).toBe(1);        // exactly one attempt
    expect(delays).toHaveLength(0); // no delay taken
    expect(record.errors[0]).toContain("permanent");
    expect(record.errors[0]).toContain("400");
    expect(record.errors[0]).toContain("missing source_id");
  });
});

describe("ingestion — backoff sequence and maximum attempts", () => {
  it("records exponentially increasing delays across attempts", async () => {
    const delays: number[] = [];
    const BASE = 100;
    const MAX_ATTEMPTS = 4;

    await ingestDocument(
      input(),
      async () => {
        throw new DocumentIntelligenceError(
          "document intelligence connection failed: connect ECONNREFUSED 127.0.0.1:8000",
        );
      },
      {
        limits: { maxAttempts: MAX_ATTEMPTS, retryBaseMs: BASE },
        // Fix randomFraction at midpoint (1.0 multiplier) by overriding delay.
        // We cannot inject randomFraction through _delayfn, but we can verify
        // that each successive delay is >= the previous one.
        _delayfn: async (ms) => { delays.push(ms); },
      },
    );

    // Should have MAX_ATTEMPTS - 1 delays (one between each attempt pair)
    expect(delays).toHaveLength(MAX_ATTEMPTS - 1);
    // Each delay must be >= the previous (exponential growth, even with jitter)
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]!);
    }
    // Every delay must be <= maxDelay = BASE * 2^(MAX_ATTEMPTS-1)
    const maxDelay = BASE * 2 ** (MAX_ATTEMPTS - 1);
    for (const d of delays) {
      expect(d).toBeLessThanOrEqual(maxDelay);
    }
  });

  it("never exceeds maxAttempts regardless of recoverable errors", async () => {
    let calls = 0;
    const MAX = 5;

    await ingestDocument(
      input(),
      async () => {
        calls += 1;
        throw new DocumentIntelligenceError(
          "document intelligence returned 503 Service Unavailable",
          { status: 503 },
        );
      },
      { limits: { maxAttempts: MAX, retryBaseMs: 1 }, _delayfn: async () => {} },
    );

    expect(calls).toBe(MAX);
  });
});

describe("ingestion — final failure details and failure kind", () => {
  it("records HTTP status in the error string for a permanent 4xx failure", async () => {
    const record = await ingestDocument(
      input(),
      async () => {
        throw new DocumentIntelligenceError(
          "document intelligence returned 415 Unsupported Media Type",
          { status: 415, responseBody: "unsupported content type" },
        );
      },
      { limits: { maxAttempts: 3, retryBaseMs: 1 }, _delayfn: async () => {} },
    );

    expect(record.errors[0]).toContain("permanent");
    expect(record.errors[0]).toContain("415");
    expect(record.errors[0]).toContain("unsupported content type");
  });

  it("records HTTP status in the error string for an exhausted 503 failure", async () => {
    const record = await ingestDocument(
      input(),
      async () => {
        throw new DocumentIntelligenceError(
          "document intelligence returned 503 Service Unavailable",
          { status: 503 },
        );
      },
      { limits: { maxAttempts: 2, retryBaseMs: 1 }, _delayfn: async () => {} },
    );

    expect(record.errors[0]).toContain("transient_exhausted");
    expect(record.errors[0]).toContain("503");
  });

  it("preserves ECONNREFUSED detail in the transient_exhausted error message", async () => {
    const record = await ingestDocument(
      input(),
      async () => {
        throw new DocumentIntelligenceError(
          "document intelligence connection failed: connect ECONNREFUSED 127.0.0.1:8000",
        );
      },
      { limits: { maxAttempts: 1, retryBaseMs: 1 }, _delayfn: async () => {} },
    );

    expect(record.errors[0]).toContain("transient_exhausted");
    expect(record.errors[0]).toContain("ECONNREFUSED");
    expect(record.errors[0]).toContain("127.0.0.1:8000");
  });

  it("records failure-kind in the structured log on a permanent error", async () => {
    const errorEntries: Record<string, unknown>[] = [];
    const logger = {
      info: () => {},
      warn: () => {},
      error: (payload: Record<string, unknown>) => errorEntries.push(payload),
    };

    await ingestDocument(
      input(),
      async () => {
        throw new DocumentIntelligenceError(
          "document intelligence returned 400 Bad Request",
          { status: 400 },
        );
      },
      {
        limits: { maxAttempts: 3, retryBaseMs: 1 },
        _delayfn: async () => {},
        logger,
      },
    );

    const finalEntry = errorEntries.at(-1)!;
    expect(finalEntry["failureKind"]).toBe("permanent");
    expect(finalEntry["status"]).toBe(400);
    expect((finalEntry["cause"] as Record<string, unknown>)["name"]).toBe(
      "DocumentIntelligenceError",
    );
  });

  it("records failure-kind in the structured log on a transient_exhausted error", async () => {
    const errorEntries: Record<string, unknown>[] = [];
    const logger = {
      info: () => {},
      warn: () => {},
      error: (payload: Record<string, unknown>) => errorEntries.push(payload),
    };

    await ingestDocument(
      input(),
      async () => {
        throw new DocumentIntelligenceError(
          "document intelligence timed out after 30000ms",
          { isTimeout: true },
        );
      },
      {
        limits: { maxAttempts: 2, retryBaseMs: 1 },
        _delayfn: async () => {},
        logger,
      },
    );

    const finalEntry = errorEntries.at(-1)!;
    expect(finalEntry["failureKind"]).toBe("transient_exhausted");
    expect(finalEntry["status"]).toBeUndefined();
    expect((finalEntry["cause"] as Record<string, unknown>)["message"]).toContain(
      "timed out",
    );
  });

  it("does not log document content in any log entry during a failure", async () => {
    const allEntries: Record<string, unknown>[] = [];
    const logger = {
      info: (p: Record<string, unknown>) => allEntries.push(p),
      warn: (p: Record<string, unknown>) => allEntries.push(p),
      error: (p: Record<string, unknown>) => allEntries.push(p),
    };
    const secret = "CONFIDENTIAL invoice for Global Trade 42750.00";

    await ingestDocument(
      input({ content: secret }),
      async () => {
        throw new DocumentIntelligenceError(
          "document intelligence connection failed: connect ECONNREFUSED",
        );
      },
      {
        limits: { maxAttempts: 2, retryBaseMs: 1 },
        _delayfn: async () => {},
        logger,
      },
    );

    const serialised = JSON.stringify(allEntries);
    expect(serialised).not.toContain("Global Trade");
    expect(serialised).not.toContain("42750.00");
    expect(serialised).toContain("sourceId");
  });
});
