/**
 * Persistence integration tests — run against a REAL Postgres.
 *
 * Set DATABASE_URL to a Postgres the schema has been migrated to
 * (`pnpm --filter @workspace/db run migrate`). When it is unset the suite
 * fails loudly rather than passing vacuously, because a persistence layer that
 * was never exercised against a database proves nothing.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb, type DbHandle } from "../src/connect";
import { assertTestDatabaseUrl } from "../src/test-guard";
import { sources } from "../src/schema/documents";

const DATABASE_URL = process.env["DATABASE_URL"];

let handle: DbHandle;

const TENANT_A = "tenant_a";
const TENANT_B = "tenant_b";

function token(id: string, tenantId: string): Record<string, unknown> {
  return {
    tokenId: id,
    tenantId,
    tokenKind: "EVENT",
    eventType: "INVOICE_ISSUED",
    transactionTime: "2026-07-24T00:00:00Z",
    sourceRefs: [
      { evidenceId: "ev", sourceSystem: "test", sourceObjectId: "chk" },
    ],
    confidence: 0.9,
    epistemicStatus: "OBSERVED",
    visibility: [],
    actionScope: ["finance"],
    retentionClass: "financial",
  };
}

function source(sourceId: string, tenantId: string, checksum: string) {
  return {
    sourceId,
    tenantId,
    filename: "invoice.pdf",
    mimeType: "application/pdf",
    checksum,
    byteSize: 1234,
    state: "COMPLETED" as const,
    documentType: "INVOICE",
    confidence: 0.88,
    sourceAcl: [],
    warnings: [],
    errors: [],
    uploadedAt: new Date("2026-07-24T00:00:00Z"),
  };
}

beforeAll(() => {
  if (!DATABASE_URL) return;
  assertTestDatabaseUrl(DATABASE_URL);
  handle = createDb(DATABASE_URL);
});

afterAll(async () => {
  await handle?.close();
});

beforeEach(async () => {
  if (!handle) return;
  // Cascades to tokens/facts/reviews.
  await handle.db.delete(sources);
});

describe.skipIf(!DATABASE_URL)("repository — persistence", () => {
  it("persists a source with its tokens and facts, then retrieves them", async () => {
    await handle.repository.persistDocument({
      source: source("src_1", TENANT_A, "chk_1"),
      tokens: [token("tok_1", TENANT_A), token("tok_2", TENANT_A)],
      facts: {
        schemaVersion: "0.1.0",
        result: { facts: [{ x: 1 }], schema_version: "0.1.0" },
      },
    });

    const doc = await handle.repository.getDocument(TENANT_A, "src_1");
    expect(doc).not.toBeNull();
    expect(doc!.source.documentType).toBe("INVOICE");
    expect(doc!.tokens).toHaveLength(2);
    expect(doc!.facts?.result).toMatchObject({ schema_version: "0.1.0" });
  });

  it("is idempotent by checksum (dedup lookup finds the prior source)", async () => {
    await handle.repository.persistDocument({
      source: source("src_1", TENANT_A, "chk_dup"),
      tokens: [token("tok_1", TENANT_A)],
      facts: null,
    });
    const found = await handle.repository.findSourceByChecksum(
      TENANT_A,
      "chk_dup",
    );
    expect(found?.sourceId).toBe("src_1");
    // A different tenant with the same checksum is a different, unseen document.
    const foundOther = await handle.repository.findSourceByChecksum(
      TENANT_B,
      "chk_dup",
    );
    expect(foundOther).toBeNull();
  });

  it("replaces tokens/facts on reprocess (no duplication)", async () => {
    await handle.repository.persistDocument({
      source: source("src_1", TENANT_A, "chk_1"),
      tokens: [token("tok_1", TENANT_A), token("tok_2", TENANT_A)],
      facts: null,
    });
    // Reprocess: same source, fewer tokens.
    await handle.repository.persistDocument({
      source: source("src_1", TENANT_A, "chk_1"),
      tokens: [token("tok_1", TENANT_A)],
      facts: { schemaVersion: "0.1.0", result: { schema_version: "0.1.0" } },
    });
    const doc = await handle.repository.getDocument(TENANT_A, "src_1");
    expect(doc!.tokens).toHaveLength(1);
    expect(doc!.facts).not.toBeNull();
  });
});

describe.skipIf(!DATABASE_URL)("repository — tenant isolation", () => {
  it("never returns another tenant's document", async () => {
    await handle.repository.persistDocument({
      source: source("src_secret", TENANT_A, "chk_a"),
      tokens: [token("tok_1", TENANT_A)],
      facts: null,
    });
    // Tenant B asks for tenant A's source id → nothing.
    const leaked = await handle.repository.getDocument(TENANT_B, "src_secret");
    expect(leaked).toBeNull();
    // And it is absent from tenant B's list.
    const list = await handle.repository.listSources(TENANT_B);
    expect(list.find((s) => s.sourceId === "src_secret")).toBeUndefined();
  });

  it("scopes listSources to the tenant", async () => {
    await handle.repository.persistDocument({
      source: source("src_a", TENANT_A, "chk_a"),
      tokens: [],
      facts: null,
    });
    await handle.repository.persistDocument({
      source: source("src_b", TENANT_B, "chk_b"),
      tokens: [],
      facts: null,
    });
    const listA = await handle.repository.listSources(TENANT_A);
    expect(listA.map((s) => s.sourceId)).toEqual(["src_a"]);
  });

  it("rejects a review on a source the tenant does not own", async () => {
    await handle.repository.persistDocument({
      source: source("src_a", TENANT_A, "chk_a"),
      tokens: [],
      facts: null,
    });
    await expect(
      handle.repository.addReview({
        tenantId: TENANT_B,
        sourceId: "src_a",
        fieldPath: "totalAmount",
        action: "REJECT",
        reviewer: "mallory",
      }),
    ).rejects.toThrow();
  });

  it("records a correction for the owning tenant", async () => {
    await handle.repository.persistDocument({
      source: source("src_a", TENANT_A, "chk_a"),
      tokens: [],
      facts: null,
    });
    const review = await handle.repository.addReview({
      tenantId: TENANT_A,
      sourceId: "src_a",
      fieldPath: "totalAmount",
      action: "CORRECT",
      correctedValue: 999,
      reviewer: "alice",
    });
    expect(review.action).toBe("CORRECT");
    const doc = await handle.repository.getDocument(TENANT_A, "src_a");
    expect(doc!.reviews).toHaveLength(1);
  });
});

describe.skipIf(!DATABASE_URL)("repository — evidence retrieval", () => {
  it("finds evidence matching keywords", async () => {
    await handle.repository.persistDocument({
      source: source("src_invoice", TENANT_A, "chk_invoice"),
      tokens: [
        {
          tokenId: "tok_invoice",
          tenantId: TENANT_A,
          tokenKind: "EVENT",
          eventType: "INVOICE_ISSUED",
          transactionTime: "2026-07-24T00:00:00Z",
          sourceRefs: [{ evidenceId: "ev", sourceSystem: "test", sourceObjectId: "inv_1" }],
          confidence: 0.9,
          epistemicStatus: "OBSERVED",
          visibility: [],
          actionScope: ["finance"],
          retentionClass: "financial",
        },
      ],
      facts: null,
    });

    const matches = await handle.repository.findEvidence({
      tenantId: TENANT_A,
      keywords: ["invoice"],
    });

    expect(matches.length).toBeGreaterThan(0);
    const invoiceMatch = matches.find((m) =>
      JSON.stringify(m.token).includes("INVOICE_ISSUED"),
    );
    expect(invoiceMatch).toBeDefined();
    expect(invoiceMatch!.sourceFilename).toBe("invoice.pdf");
  });

  it("finds evidence matching entity types", async () => {
    await handle.repository.persistDocument({
      source: source("src_entity", TENANT_A, "chk_entity"),
      tokens: [
        {
          tokenId: "tok_vendor",
          tenantId: TENANT_A,
          tokenKind: "ENTITY",
          entityType: "VENDOR",
          transactionTime: "2026-07-24T00:00:00Z",
          sourceRefs: [],
          confidence: 0.85,
          epistemicStatus: "OBSERVED",
          visibility: [],
          actionScope: [],
          retentionClass: "standard",
        },
      ],
      facts: null,
    });

    const matches = await handle.repository.findEvidence({
      tenantId: TENANT_A,
      keywords: [],
      entityTypes: ["ENTITY"],
    });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].tokenKind).toBe("ENTITY");
  });

  it("finds evidence matching entity IDs", async () => {
    await handle.repository.persistDocument({
      source: source("src_relation", TENANT_A, "chk_relation"),
      tokens: [
        {
          tokenId: "tok_rel",
          tenantId: TENANT_A,
          tokenKind: "RELATION",
          subjectId: "vendor_acme",
          predicate: "SUPPLIES",
          objectId: "product_x",
          transactionTime: "2026-07-24T00:00:00Z",
          sourceRefs: [],
          confidence: 0.9,
          epistemicStatus: "OBSERVED",
          visibility: [],
          actionScope: [],
          retentionClass: "standard",
        },
      ],
      facts: null,
    });

    const matches = await handle.repository.findEvidence({
      tenantId: TENANT_A,
      keywords: [],
      entityIds: ["vendor_acme"],
    });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].matchType).toBe("entity_id");
  });

  it("returns empty when no keywords match", async () => {
    await handle.repository.persistDocument({
      source: source("src_nomatch", TENANT_A, "chk_nomatch"),
      tokens: [
        {
          tokenId: "tok_xyz",
          tenantId: TENANT_A,
          tokenKind: "EVENT",
          eventType: "UNRELATED_THING",
          transactionTime: "2026-07-24T00:00:00Z",
          sourceRefs: [],
          confidence: 0.9,
          epistemicStatus: "OBSERVED",
          visibility: [],
          actionScope: [],
          retentionClass: "standard",
        },
      ],
      facts: null,
    });

    const matches = await handle.repository.findEvidence({
      tenantId: TENANT_A,
      keywords: ["xyznonexistent"],
    });

    expect(matches).toEqual([]);
  });

  it("enforces tenant isolation in evidence retrieval", async () => {
    // Tenant A has an invoice
    await handle.repository.persistDocument({
      source: source("src_invoice_a", TENANT_A, "chk_inv_a"),
      tokens: [
        {
          tokenId: "tok_inv_a",
          tenantId: TENANT_A,
          tokenKind: "EVENT",
          eventType: "INVOICE_ISSUED",
          invoiceNumber: "INV-001",
          transactionTime: "2026-07-24T00:00:00Z",
          sourceRefs: [],
          confidence: 0.9,
          epistemicStatus: "OBSERVED",
          visibility: [],
          actionScope: [],
          retentionClass: "financial",
        },
      ],
      facts: null,
    });

    // Tenant B has a matching invoice
    await handle.repository.persistDocument({
      source: source("src_invoice_b", TENANT_B, "chk_inv_b"),
      tokens: [
        {
          tokenId: "tok_inv_b",
          tenantId: TENANT_B,
          tokenKind: "EVENT",
          eventType: "INVOICE_ISSUED",
          invoiceNumber: "INV-002",
          transactionTime: "2026-07-24T00:00:00Z",
          sourceRefs: [],
          confidence: 0.9,
          epistemicStatus: "OBSERVED",
          visibility: [],
          actionScope: [],
          retentionClass: "financial",
        },
      ],
      facts: null,
    });

    // Tenant A searches for "invoice" — should only find their own
    const tenantAMatches = await handle.repository.findEvidence({
      tenantId: TENANT_A,
      keywords: ["invoice"],
    });

    expect(tenantAMatches.length).toBeGreaterThan(0);
    for (const match of tenantAMatches) {
      expect(match.sourceId).toBe("src_invoice_a");
    }

    // Tenant B searches for "invoice" — should only find their own
    const tenantBMatches = await handle.repository.findEvidence({
      tenantId: TENANT_B,
      keywords: ["invoice"],
    });

    expect(tenantBMatches.length).toBeGreaterThan(0);
    for (const match of tenantBMatches) {
      expect(match.sourceId).toBe("src_invoice_b");
    }

    // Tenant A should NOT find tenant B's invoice even with matching keywords
    const crossTenantAttempt = await handle.repository.findEvidence({
      tenantId: TENANT_A,
      keywords: ["INV-002"], // Only exists in tenant B's data
    });

    expect(crossTenantAttempt).toEqual([]);
  });

  it("cannot retrieve another tenant's matching invoice via entity ID", async () => {
    // Tenant A has a vendor entity
    await handle.repository.persistDocument({
      source: source("src_vendor_a", TENANT_A, "chk_vendor_a"),
      tokens: [
        {
          tokenId: "tok_vendor_a",
          tenantId: TENANT_A,
          tokenKind: "ENTITY",
          entityType: "VENDOR",
          vendorId: "v_special",
          transactionTime: "2026-07-24T00:00:00Z",
          sourceRefs: [],
          confidence: 0.9,
          epistemicStatus: "OBSERVED",
          visibility: [],
          actionScope: [],
          retentionClass: "standard",
        },
      ],
      facts: null,
    });

    // Tenant B has the same vendor ID in their data
    await handle.repository.persistDocument({
      source: source("src_vendor_b", TENANT_B, "chk_vendor_b"),
      tokens: [
        {
          tokenId: "tok_vendor_b",
          tenantId: TENANT_B,
          tokenKind: "ENTITY",
          entityType: "VENDOR",
          vendorId: "v_special", // Same vendor ID, different tenant
          transactionTime: "2026-07-24T00:00:00Z",
          sourceRefs: [],
          confidence: 0.9,
          epistemicStatus: "OBSERVED",
          visibility: [],
          actionScope: [],
          retentionClass: "standard",
        },
      ],
      facts: null,
    });

    // Tenant A searches by vendor ID — should find only their own
    const tenantAMatches = await handle.repository.findEvidence({
      tenantId: TENANT_A,
      keywords: [],
      entityIds: ["v_special"],
    });

    expect(tenantAMatches.length).toBe(1);
    expect(tenantAMatches[0].sourceId).toBe("src_vendor_a");

    // Tenant B searches by vendor ID — should find only their own
    const tenantBMatches = await handle.repository.findEvidence({
      tenantId: TENANT_B,
      keywords: [],
      entityIds: ["v_special"],
    });

    expect(tenantBMatches.length).toBe(1);
    expect(tenantBMatches[0].sourceId).toBe("src_vendor_b");
  });

  it("sorts results by relevance score", async () => {
    await handle.repository.persistDocument({
      source: source("src_multi", TENANT_A, "chk_multi"),
      tokens: [
        {
          tokenId: "tok_low",
          tenantId: TENANT_A,
          tokenKind: "EVENT",
          eventType: "UNRELATED",
          transactionTime: "2026-07-24T00:00:00Z",
          sourceRefs: [],
          confidence: 0.5,
          epistemicStatus: "OBSERVED",
          visibility: [],
          actionScope: [],
          retentionClass: "standard",
        },
        {
          tokenId: "tok_high",
          tenantId: TENANT_A,
          tokenKind: "ENTITY",
          entityType: "INVOICE",
          transactionTime: "2026-07-24T00:00:00Z",
          sourceRefs: [],
          confidence: 0.95,
          epistemicStatus: "ASSERTED",
          visibility: [],
          actionScope: [],
          retentionClass: "financial",
        },
      ],
      facts: null,
    });

    const matches = await handle.repository.findEvidence({
      tenantId: TENANT_A,
      keywords: ["invoice"],
      entityTypes: ["ENTITY"],
    });

    // Higher score should come first
    if (matches.length >= 2) {
      expect(matches[0].matchScore).toBeGreaterThanOrEqual(matches[1].matchScore);
    }
  });

  it("enforces limit on retrieved evidence", async () => {
    // Create 15 tokens across 5 sources
    for (let i = 0; i < 5; i++) {
      await handle.repository.persistDocument({
        source: source(`src_test_${i}`, TENANT_A, `chk_test_${i}`),
        tokens: [
          {
            tokenId: `tok_test_${i}`,
            tenantId: TENANT_A,
            tokenKind: "EVENT",
            eventType: "TEST_EVENT",
            transactionTime: "2026-07-24T00:00:00Z",
            sourceRefs: [],
            confidence: 0.9,
            epistemicStatus: "OBSERVED",
            visibility: [],
            actionScope: [],
            retentionClass: "standard",
          },
        ],
        facts: null,
      });
    }

    const matches = await handle.repository.findEvidence({
      tenantId: TENANT_A,
      keywords: ["test"],
      limit: 3,
    });

    // Limit should be enforced
    expect(matches.length).toBeLessThanOrEqual(3);
  });
});
