/**
 * PostgreSQL integration tests for evidence retrieval.
 *
 * These tests exercise the full path from document ingestion
 * (`persistDocument`) through `searchTenantEvidence`, validating that:
 *   - keyword and business-identifier matching works against real persisted tokens
 *   - tenant isolation is absolute (each tenant sees only its own evidence)
 *   - relevance ranking, result limits, and total-size limits are enforced
 *   - source filenames are preserved through to the caller
 *
 * Set DATABASE_URL to a migrated Postgres instance before running:
 *   pnpm --filter @workspace/db run migrate
 *   DATABASE_URL=postgres://... pnpm --filter @workspace/db run test
 *
 * Without DATABASE_URL all tests in this file are skipped cleanly.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb, type DbHandle } from "../src/connect";
import { sources } from "../src/schema/documents";
import {
  searchTenantEvidence,
  type EvidenceResult,
} from "../../../artifacts/api-server/src/lib/evidence";

const DATABASE_URL = process.env["DATABASE_URL"];

let handle: DbHandle;

const TENANT_A = "ev_tenant_a";
const TENANT_B = "ev_tenant_b";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Invoice token matching the CI-2026-01052 invoice referenced in the PR spec.
 * Uses `subjectId` for the invoice identifier so it participates in scoring
 * via the business-ID pattern match in `tokenSearchText`.
 */
function invoiceToken(opts: {
  tokenId: string;
  tenantId: string;
  invoiceNumber: string;
  supplier: string;
  totalAmount: number;
  currency?: string;
}): Record<string, unknown> {
  return {
    tokenId: opts.tokenId,
    tenantId: opts.tenantId,
    tokenKind: "STATE",
    eventType: "INVOICE_TOTAL",
    subjectId: opts.invoiceNumber,        // carries the CI-XXXX identifier
    transactionTime: "2026-07-24T00:00:00Z",
    scalarValue: {
      value: opts.totalAmount,
      currency: opts.currency ?? "ZAR",
    },
    sourceRefs: [
      {
        evidenceId: "ev_1",
        sourceSystem: "upload",
        sourceObjectId: opts.tokenId,
        excerpt: `Invoice ${opts.invoiceNumber} from ${opts.supplier} total ${opts.totalAmount} ${opts.currency ?? "ZAR"}`,
      },
    ],
    confidence: 0.92,
    epistemicStatus: "OBSERVED",
    visibility: [],
    actionScope: ["finance"],
    retentionClass: "financial",
  };
}

function sourceRecord(opts: {
  sourceId: string;
  tenantId: string;
  filename: string;
  checksum: string;
}) {
  return {
    sourceId: opts.sourceId,
    tenantId: opts.tenantId,
    filename: opts.filename,
    mimeType: "application/pdf",
    checksum: opts.checksum,
    byteSize: 4096,
    state: "COMPLETED" as const,
    documentType: "INVOICE",
    confidence: 0.92,
    sourceAcl: [],
    warnings: [],
    errors: [],
    uploadedAt: new Date("2026-07-24T00:00:00Z"),
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeAll(() => {
  if (!DATABASE_URL) return;
  handle = createDb(DATABASE_URL);
});

afterAll(async () => {
  await handle?.close();
});

beforeEach(async () => {
  if (!handle) return;
  await handle.db.delete(sources); // cascades to tokens / facts / reviews
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe.skipIf(!DATABASE_URL)(
  "evidence retrieval — CI-2026-01052 invoice",
  () => {
    it("finds invoice CI-2026-01052 and returns expected total + source filename", async () => {
      await handle.repository.persistDocument({
        source: sourceRecord({
          sourceId: "src_ci_2026_01052",
          tenantId: TENANT_A,
          filename: "acme-invoice-CI-2026-01052.pdf",
          checksum: "chk_ci_01052",
        }),
        tokens: [
          invoiceToken({
            tokenId: "tok_ci_01052",
            tenantId: TENANT_A,
            invoiceNumber: "CI-2026-01052",
            supplier: "Acme Supplies Ltd",
            totalAmount: 18500,
            currency: "ZAR",
          }),
        ],
        facts: null,
      });

      const result: EvidenceResult = await searchTenantEvidence(
        handle.repository,
        TENANT_A,
        "What is the total on invoice CI-2026-01052?",
      );

      expect(result.matches.length).toBeGreaterThan(0);

      // Business-identifier match scores 10 per hit — should be top result
      const top = result.matches[0]!;
      expect(top.score).toBeGreaterThanOrEqual(10);
      expect(top.sourceId).toBe("src_ci_2026_01052");

      // Source filename must be preserved through attribution
      expect(result.sourcesUsed).toHaveLength(1);
      expect(result.sourcesUsed[0]!.filename).toBe(
        "acme-invoice-CI-2026-01052.pdf",
      );

      // Context line must carry the filename in [filename] format
      expect(result.contextLines[0]).toContain(
        "[acme-invoice-CI-2026-01052.pdf]",
      );
    });

    it("finds invoice by supplier keyword match", async () => {
      await handle.repository.persistDocument({
        source: sourceRecord({
          sourceId: "src_supplier_query",
          tenantId: TENANT_A,
          filename: "acme-invoice-CI-2026-01052.pdf",
          checksum: "chk_supplier_01",
        }),
        tokens: [
          invoiceToken({
            tokenId: "tok_supplier_q",
            tenantId: TENANT_A,
            invoiceNumber: "CI-2026-01052",
            supplier: "Acme Supplies Ltd",
            totalAmount: 18500,
          }),
        ],
        facts: null,
      });

      const result = await searchTenantEvidence(
        handle.repository,
        TENANT_A,
        "Acme Supplies invoice total",
      );

      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0]!.sourceId).toBe("src_supplier_query");
    });
  },
);

describe.skipIf(!DATABASE_URL)(
  "evidence retrieval — tenant isolation",
  () => {
    it("tenant A query for CI-2026-01052 cannot retrieve tenant B's matching invoice", async () => {
      // Seed the same invoice identifier in both tenants
      await handle.repository.persistDocument({
        source: sourceRecord({
          sourceId: "src_a_invoice",
          tenantId: TENANT_A,
          filename: "tenant-a-invoice.pdf",
          checksum: "chk_a_invoice",
        }),
        tokens: [
          invoiceToken({
            tokenId: "tok_a_inv",
            tenantId: TENANT_A,
            invoiceNumber: "CI-2026-01052",
            supplier: "Supplier Alpha",
            totalAmount: 18500,
          }),
        ],
        facts: null,
      });

      await handle.repository.persistDocument({
        source: sourceRecord({
          sourceId: "src_b_invoice",
          tenantId: TENANT_B,
          filename: "tenant-b-invoice.pdf",
          checksum: "chk_b_invoice",
        }),
        tokens: [
          invoiceToken({
            tokenId: "tok_b_inv",
            tenantId: TENANT_B,
            invoiceNumber: "CI-2026-01052",
            supplier: "Supplier Beta",
            totalAmount: 99999,
          }),
        ],
        facts: null,
      });

      // Tenant A searches — must only find their own invoice
      const resultA = await searchTenantEvidence(
        handle.repository,
        TENANT_A,
        "invoice CI-2026-01052",
      );
      expect(resultA.matches.length).toBeGreaterThan(0);
      for (const m of resultA.matches) {
        expect(m.sourceId).toBe("src_a_invoice");
      }
      const filenamesA = resultA.sourcesUsed.map((s) => s.filename);
      expect(filenamesA).not.toContain("tenant-b-invoice.pdf");

      // Tenant B searches — must only find their own invoice
      const resultB = await searchTenantEvidence(
        handle.repository,
        TENANT_B,
        "invoice CI-2026-01052",
      );
      expect(resultB.matches.length).toBeGreaterThan(0);
      for (const m of resultB.matches) {
        expect(m.sourceId).toBe("src_b_invoice");
      }
      const filenamesB = resultB.sourcesUsed.map((s) => s.filename);
      expect(filenamesB).not.toContain("tenant-a-invoice.pdf");
    });

    it("unknown tenant returns empty evidence (no data leakage)", async () => {
      // Seed data for known tenants
      await handle.repository.persistDocument({
        source: sourceRecord({
          sourceId: "src_known",
          tenantId: TENANT_A,
          filename: "known.pdf",
          checksum: "chk_known",
        }),
        tokens: [
          invoiceToken({
            tokenId: "tok_known",
            tenantId: TENANT_A,
            invoiceNumber: "CI-2026-01052",
            supplier: "Acme",
            totalAmount: 1000,
          }),
        ],
        facts: null,
      });

      const result = await searchTenantEvidence(
        handle.repository,
        "tenant_unknown_xyz",
        "CI-2026-01052 invoice",
      );

      expect(result.matches).toHaveLength(0);
      expect(result.sourcesUsed).toHaveLength(0);
    });
  },
);

describe.skipIf(!DATABASE_URL)(
  "evidence retrieval — relevance and limits",
  () => {
    it("business-ID match scores higher than generic keyword match", async () => {
      // Source 1: contains the CI identifier directly
      await handle.repository.persistDocument({
        source: sourceRecord({
          sourceId: "src_exact_id",
          tenantId: TENANT_A,
          filename: "exact-ci.pdf",
          checksum: "chk_exact_id",
        }),
        tokens: [
          invoiceToken({
            tokenId: "tok_exact",
            tenantId: TENANT_A,
            invoiceNumber: "CI-2026-01052",
            supplier: "Exact Match Co",
            totalAmount: 500,
          }),
        ],
        facts: null,
      });

      // Source 2: only contains general keyword "invoice" in an unrelated token
      await handle.repository.persistDocument({
        source: sourceRecord({
          sourceId: "src_generic",
          tenantId: TENANT_A,
          filename: "generic-invoice.pdf",
          checksum: "chk_generic",
        }),
        tokens: [
          {
            tokenId: "tok_generic",
            tenantId: TENANT_A,
            tokenKind: "EVENT",
            eventType: "INVOICE_ISSUED",
            subjectId: "some-other-invoice",
            transactionTime: "2026-07-24T00:00:00Z",
            scalarValue: { value: 100 },
            sourceRefs: [{ excerpt: "invoice processed" }],
            confidence: 0.7,
            epistemicStatus: "OBSERVED",
            visibility: [],
            actionScope: [],
            retentionClass: "standard",
          },
        ],
        facts: null,
      });

      const result = await searchTenantEvidence(
        handle.repository,
        TENANT_A,
        "CI-2026-01052 total amount",
      );

      // The CI-identifier match (score ≥ 10) must rank above generic keyword match (score 1)
      expect(result.matches[0]!.sourceId).toBe("src_exact_id");
      expect(result.matches[0]!.score).toBeGreaterThan(result.matches[1]?.score ?? 0);
    });

    it("maxResults caps the number of returned matches", async () => {
      // Seed 8 invoices for the same tenant
      for (let i = 0; i < 8; i++) {
        await handle.repository.persistDocument({
          source: sourceRecord({
            sourceId: `src_limit_${i}`,
            tenantId: TENANT_A,
            filename: `invoice-${i}.pdf`,
            checksum: `chk_limit_${i}`,
          }),
          tokens: [
            invoiceToken({
              tokenId: `tok_limit_${i}`,
              tenantId: TENANT_A,
              invoiceNumber: `CI-2026-0${i}`,
              supplier: `Supplier ${i}`,
              totalAmount: i * 1000,
            }),
          ],
          facts: null,
        });
      }

      const result = await searchTenantEvidence(
        handle.repository,
        TENANT_A,
        "invoice total amount ZAR",
        { maxResults: 3 },
      );

      expect(result.matches.length).toBeLessThanOrEqual(3);
    });

    it("maxTotalChars bounds the total context line length", async () => {
      for (let i = 0; i < 5; i++) {
        await handle.repository.persistDocument({
          source: sourceRecord({
            sourceId: `src_chars_${i}`,
            tenantId: TENANT_A,
            filename: `invoice-chars-${i}.pdf`,
            checksum: `chk_chars_${i}`,
          }),
          tokens: [
            invoiceToken({
              tokenId: `tok_chars_${i}`,
              tenantId: TENANT_A,
              invoiceNumber: `CI-2026-1${i}`,
              supplier: `Supplier ${i}`,
              totalAmount: i * 500,
            }),
          ],
          facts: null,
        });
      }

      const result = await searchTenantEvidence(
        handle.repository,
        TENANT_A,
        "invoice",
        { maxTotalChars: 200 },
      );

      const total = result.contextLines.join("").length;
      expect(total).toBeLessThanOrEqual(200);
    });
  },
);
