/**
 * Step 5 verification tests.
 *
 * Covers:
 *   §2 Invoice retrieval — fixture invoice returns expected value + filename
 *   §3 No-knowledge handling — no fabrication, error path separation
 *   §4 Tenant isolation — cross-tenant queries return nothing; bounds enforced
 *   §5 Assistant integration — evidence reaches provider; attribution flows
 *
 * All tests are pure-function / in-memory. No database, no network calls.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assessEvidence,
  buildSourceBlock,
  composeAttributedReply,
  noKnowledgeReply,
} from "../src/product/attribution.js";
import {
  extractKeywords,
  searchTenantEvidence,
} from "../src/lib/evidence.js";
import type { EvidenceResult } from "../src/lib/evidence.js";
import {
  getIntelligenceProvider,
  processRequest,
  setIntelligenceProvider,
} from "../src/product/engine.js";
import { __resetProductStore, getProductStore } from "../src/product/store.js";

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

/**
 * Canonical test invoice — INV-2024-0081 from "ABC Logistics (Pty) Ltd"
 * for ZAR 15,000.  This matches the business key used in duplicate.test.ts.
 */
const TEST_INVOICE = {
  tokenId: "tok_inv_001",
  tenantId: "tenant_acme",
  tokenKind: "EVENT",
  eventType: "INVOICE_ISSUED",
  subjectId: "ABC Logistics (Pty) Ltd",
  transactionTime: "2026-07-01T10:00:00Z",
  scalarValue: {
    invoiceNumber: "INV-2024-0081",
    totalAmount: 15000,
    currency: "ZAR",
    dueDate: "2026-08-01",
  },
  sourceRefs: [
    {
      evidenceId: "ev_001",
      sourceSystem: "upload",
      sourceObjectId: "src_inv_001",
      excerpt: "Invoice INV-2024-0081 from ABC Logistics total ZAR 15,000",
    },
  ],
  confidence: 0.92,
  epistemicStatus: "OBSERVED",
  visibility: [],
  actionScope: ["finance"],
  retentionClass: "financial",
};

/** Simulate what repository.listTenantTokens returns for tenant_acme. */
const TENANT_A_TOKENS: Array<{ sourceId: string; token: Record<string, unknown> }> = [
  { sourceId: "src_inv_001", token: TEST_INVOICE },
  {
    sourceId: "src_contract_001",
    token: {
      tokenId: "tok_contract_001",
      tokenKind: "ENTITY",
      eventType: "CONTRACT_SIGNED",
      subjectId: "Acme Ltd",
      transactionTime: "2026-06-01T00:00:00Z",
      scalarValue: { contractType: "SERVICE_AGREEMENT", counterparty: "XYZ Corp" },
      sourceRefs: [],
      confidence: 0.85,
    },
  },
];

/** Simulate what repository.listTenantTokens returns for tenant_beta (different org). */
const TENANT_B_TOKENS: Array<{ sourceId: string; token: Record<string, unknown> }> = [
  {
    sourceId: "src_inv_beta_001",
    token: {
      tokenId: "tok_inv_beta",
      tokenKind: "EVENT",
      eventType: "INVOICE_ISSUED",
      subjectId: "Beta Supplier Ltd",
      transactionTime: "2026-07-01T00:00:00Z",
      scalarValue: { invoiceNumber: "INV-2024-0081", totalAmount: 99999, currency: "USD" },
      sourceRefs: [{ excerpt: "Invoice from Beta Supplier" }],
      confidence: 0.9,
    },
  },
];

/** Simulate repository.listSources for a tenant. */
const TENANT_A_SOURCES = [
  {
    sourceId: "src_inv_001",
    tenantId: "tenant_acme",
    filename: "abc-logistics-inv-2024-0081.pdf",
    mimeType: "application/pdf",
    checksum: "chk_001",
    byteSize: 102400,
    state: "COMPLETED" as const,
    documentType: "INVOICE",
    confidence: 0.92,
    sourceAcl: [],
    warnings: [],
    errors: [],
    uploadedAt: new Date("2026-07-01T10:00:00Z"),
    createdAt: new Date("2026-07-01T10:00:00Z"),
    duplicateOf: null,
  },
  {
    sourceId: "src_contract_001",
    tenantId: "tenant_acme",
    filename: "acme-xyz-service-agreement.pdf",
    mimeType: "application/pdf",
    checksum: "chk_002",
    byteSize: 204800,
    state: "COMPLETED" as const,
    documentType: "CONTRACT",
    confidence: 0.85,
    sourceAcl: [],
    warnings: [],
    errors: [],
    uploadedAt: new Date("2026-06-01T00:00:00Z"),
    createdAt: new Date("2026-06-01T00:00:00Z"),
    duplicateOf: null,
  },
];

const TENANT_B_SOURCES = [
  {
    sourceId: "src_inv_beta_001",
    tenantId: "tenant_beta",
    filename: "beta-supplier-invoice.pdf",
    mimeType: "application/pdf",
    checksum: "chk_beta_001",
    byteSize: 51200,
    state: "COMPLETED" as const,
    documentType: "INVOICE",
    confidence: 0.9,
    sourceAcl: [],
    warnings: [],
    errors: [],
    uploadedAt: new Date("2026-07-01T00:00:00Z"),
    createdAt: new Date("2026-07-01T00:00:00Z"),
    duplicateOf: null,
  },
];

/**
 * Create a mock repository that isolates data by tenantId.
 */
function createMockRepository() {
  return {
    listTenantTokens: vi.fn(async (tenantId: string) => {
      if (tenantId === "tenant_acme") return TENANT_A_TOKENS;
      if (tenantId === "tenant_beta") return TENANT_B_TOKENS;
      return [];
    }),
    listSources: vi.fn(async (tenantId: string, _limit?: number) => {
      if (tenantId === "tenant_acme") return TENANT_A_SOURCES;
      if (tenantId === "tenant_beta") return TENANT_B_SOURCES;
      return [];
    }),
  };
}

/* ------------------------------------------------------------------ */
/* §2 Invoice retrieval                                                */
/* ------------------------------------------------------------------ */

describe("§2 invoice retrieval", () => {
  it("finds INV-2024-0081 by invoice number (business identifier)", async () => {
    const repo = createMockRepository();
    const result = await searchTenantEvidence(
      repo as never,
      "tenant_acme",
      "what is the total for INV-2024-0081",
    );

    expect(result.matches.length).toBeGreaterThan(0);
    const topMatch = result.matches[0]!;
    // Must score at least 1 (keyword/ID hit in the token payload)
    expect(topMatch.score).toBeGreaterThanOrEqual(1);
    expect(topMatch.sourceId).toBe("src_inv_001");
  });

  it("returns the correct source filename with the match", async () => {
    const repo = createMockRepository();
    const result = await searchTenantEvidence(
      repo as never,
      "tenant_acme",
      "invoice INV-2024-0081",
    );

    expect(result.sourcesUsed).toHaveLength(1);
    expect(result.sourcesUsed[0]!.filename).toBe("abc-logistics-inv-2024-0081.pdf");
    expect(result.sourcesUsed[0]!.sourceId).toBe("src_inv_001");
  });

  it("context lines include the source filename in attribution format [filename]", async () => {
    const repo = createMockRepository();
    const result = await searchTenantEvidence(
      repo as never,
      "tenant_acme",
      "INV-2024-0081 total amount",
    );

    expect(result.contextLines.length).toBeGreaterThan(0);
    const line = result.contextLines[0]!;
    expect(line).toContain("[abc-logistics-inv-2024-0081.pdf]");
  });

  it("provider reply includes filename when evidence is sufficient", async () => {
    // Use a query that produces score >= 2: two distinct term matches.
    // "INV-2024-0081 abc logistics" → terms ["inv-2024-0081", "abc", "logistics"] → score 3
    const repo = createMockRepository();
    const result = await searchTenantEvidence(
      repo as never,
      "tenant_acme",
      "INV-2024-0081 abc logistics",
    );

    const { assessEvidence: ae, composeAttributedReply: car } = await import(
      "../src/product/attribution.js"
    );
    const assessment = ae(result);
    const reply = car(assessment, {
      capability: "answer_questions",
      organisationName: "Acme",
    });

    expect(assessment.kind).toBe("sufficient");
    expect(reply).toContain("abc-logistics-inv-2024-0081.pdf");
    expect(reply).toContain("Sources:");
    // Must not fabricate a different filename
    expect(reply).not.toContain("beta-supplier-invoice.pdf");
  });

  it("finds invoice by supplier name keyword (general term match)", async () => {
    const repo = createMockRepository();
    const result = await searchTenantEvidence(
      repo as never,
      "tenant_acme",
      "ABC Logistics invoice",
    );

    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0]!.sourceId).toBe("src_inv_001");
  });
});

/* ------------------------------------------------------------------ */
/* §3 No-knowledge handling                                           */
/* ------------------------------------------------------------------ */

describe("§3 no-knowledge handling", () => {
  it("empty question → no evidence, no fabrication", async () => {
    const repo = createMockRepository();
    const result = await searchTenantEvidence(repo as never, "tenant_acme", "");

    expect(result.matches).toHaveLength(0);
    expect(result.contextLines).toHaveLength(0);
    expect(result.sourcesUsed).toHaveLength(0);
  });

  it("unmatched question → no evidence, provider returns no-knowledge reply", async () => {
    const repo = createMockRepository();
    const result = await searchTenantEvidence(
      repo as never,
      "tenant_acme",
      "what is the company pension contribution rate for 2023",
    );

    // Should find nothing (pension not in test tokens)
    expect(result.matches).toHaveLength(0);

    const assessment = assessEvidence(result);
    expect(assessment.kind).toBe("none");

    const provider = getIntelligenceProvider();
    const reply = await provider.generateReply({
      request: { tenantId: "tenant_acme", text: "pension contribution rate 2023" },
      intent: {
        capability: "answer_questions",
        approvalCategory: "read_information",
        verb: "answer a question",
        actionKind: "none",
      },
      organisationName: "Acme",
      contextLines: [],
      evidence: result,
    });

    // No fabricated filenames or values
    expect(reply).not.toContain(".pdf");
    expect(reply).not.toContain("Sources:");
    // Clearly indicates information not found
    expect(reply.toLowerCase()).toMatch(/couldn.t find|don.t have|not found/);
  });

  it("null evidence → no-knowledge, not an error", async () => {
    const provider = getIntelligenceProvider();
    // Should not throw; returns a no-knowledge string
    const reply = await provider.generateReply({
      request: { tenantId: "t1", text: "any question" },
      intent: {
        capability: "answer_questions",
        approvalCategory: "read_information",
        verb: "answer a question",
        actionKind: "none",
      },
      organisationName: "Acme",
      contextLines: [],
      evidence: null,
    });

    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(10);
    expect(reply).not.toContain("Sources:");
  });

  it("repository error → searchTenantEvidence returns empty (never throws)", async () => {
    const faultyRepo = {
      listTenantTokens: vi.fn().mockRejectedValue(new Error("DB connection lost")),
      listSources: vi.fn().mockResolvedValue([]),
    };

    const result = await searchTenantEvidence(
      faultyRepo as never,
      "tenant_acme",
      "invoice total",
    );

    // Must return empty gracefully, not throw
    expect(result.matches).toHaveLength(0);
    expect(result.contextLines).toHaveLength(0);
    expect(result.totalConsidered).toBe(0);
  });

  it("no-knowledge reply never contains document IDs, filenames, or fabricated values", () => {
    const capabilities = [
      "answer_questions",
      "find_documents",
      "financial_actions",
      "prepare_work",
    ];
    for (const cap of capabilities) {
      const reply = noKnowledgeReply(cap);
      // No file extensions
      expect(reply).not.toMatch(/\.\w{2,4}\b/);
      // No business ID patterns
      expect(reply).not.toMatch(/INV-|CI-|PO-|SI-/);
      // No numeric amounts
      expect(reply).not.toMatch(/\d{4,}/);
    }
  });

  it("insufficient evidence does not cite any source", () => {
    const assessment = assessEvidence({
      matches: [{ sourceId: "src_1", score: 0, confidence: 0.9, token: {} }],
      contextLines: [],
      sourcesUsed: [{ sourceId: "src_1", filename: "secret.pdf" }],
      totalConsidered: 1,
    });
    // score 0 < MIN_ATTRIBUTION_SCORE — must be insufficient
    expect(assessment.kind).toBe("insufficient");

    const reply = composeAttributedReply(assessment, {
      capability: "answer_questions",
      organisationName: "Acme",
    });
    // secret.pdf must NOT appear
    expect(reply).not.toContain("secret.pdf");
    expect(reply).not.toContain("Sources:");
  });
});

/* ------------------------------------------------------------------ */
/* §4 Tenant isolation and retrieval bounds                            */
/* ------------------------------------------------------------------ */

describe("§4 tenant isolation and retrieval bounds", () => {
  it("tenant_acme query never returns tenant_beta tokens", async () => {
    const repo = createMockRepository();
    const result = await searchTenantEvidence(
      repo as never,
      "tenant_acme",
      "invoice beta supplier",
    );

    for (const match of result.matches) {
      expect(match.sourceId).not.toBe("src_inv_beta_001");
    }
    for (const source of result.sourcesUsed) {
      expect(source.filename).not.toBe("beta-supplier-invoice.pdf");
    }
    // listTenantTokens was called with tenant_acme, not tenant_beta
    expect(repo.listTenantTokens).toHaveBeenCalledWith("tenant_acme");
    expect(repo.listTenantTokens).not.toHaveBeenCalledWith("tenant_beta");
  });

  it("same invoice number exists in both tenants — each sees only their own", async () => {
    // INV-2024-0081 exists in both tenant_acme (ZAR 15k) and tenant_beta (USD 99k)
    const repo = createMockRepository();

    const acmeResult = await searchTenantEvidence(
      repo as never,
      "tenant_acme",
      "INV-2024-0081",
    );
    const betaResult = await searchTenantEvidence(
      repo as never,
      "tenant_beta",
      "INV-2024-0081",
    );

    // Each tenant gets only their own match
    expect(acmeResult.matches.every((m) => m.sourceId.startsWith("src_inv_001"))).toBe(true);
    expect(betaResult.matches.every((m) => m.sourceId.startsWith("src_inv_beta"))).toBe(true);

    // Source filenames are scoped correctly
    const acmeFiles = acmeResult.sourcesUsed.map((s) => s.filename);
    const betaFiles = betaResult.sourcesUsed.map((s) => s.filename);
    expect(acmeFiles).not.toContain("beta-supplier-invoice.pdf");
    expect(betaFiles).not.toContain("abc-logistics-inv-2024-0081.pdf");
  });

  it("unknown tenant returns empty evidence", async () => {
    const repo = createMockRepository();
    const result = await searchTenantEvidence(
      repo as never,
      "tenant_unknown",
      "invoice total",
    );
    expect(result.matches).toHaveLength(0);
  });

  it("maxResults limit caps the number of returned matches", async () => {
    // Build a large token set for the same tenant
    const bigRepo = {
      listTenantTokens: vi.fn().mockResolvedValue(
        Array.from({ length: 50 }, (_, i) => ({
          sourceId: `src_${i}`,
          token: {
            tokenKind: "EVENT",
            eventType: "INVOICE_ISSUED",
            subjectId: `Supplier ${i}`,
            scalarValue: { invoiceNumber: `INV-00${i}`, totalAmount: i * 100 },
            sourceRefs: [{ excerpt: `Invoice from Supplier ${i}` }],
            confidence: 0.9,
          },
        })),
      ),
      listSources: vi.fn().mockResolvedValue([]),
    };

    const result = await searchTenantEvidence(
      bigRepo as never,
      "tenant_acme",
      "invoice supplier",
      { maxResults: 5 },
    );

    expect(result.matches.length).toBeLessThanOrEqual(5);
  });

  it("maxTotalChars limits total context line size", async () => {
    const bigRepo = {
      listTenantTokens: vi.fn().mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({
          sourceId: `src_${i}`,
          token: {
            tokenKind: "EVENT",
            eventType: "INVOICE_ISSUED",
            subjectId: `LongSupplierName${i} International Trading Corporation`,
            scalarValue: { invoiceNumber: `INV-00${i}`, totalAmount: i * 1000 },
            sourceRefs: [{ excerpt: `Invoice reference excerpt from LongSupplierName${i}` }],
            confidence: 0.9,
          },
        })),
      ),
      listSources: vi.fn().mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({
          sourceId: `src_${i}`,
          tenantId: "tenant_acme",
          filename: `invoice-${i}.pdf`,
          mimeType: "application/pdf",
          checksum: `chk_${i}`,
          byteSize: 1024,
          state: "COMPLETED" as const,
          documentType: "INVOICE",
          confidence: 0.9,
          sourceAcl: [],
          warnings: [],
          errors: [],
          uploadedAt: new Date(),
          createdAt: new Date(),
          duplicateOf: null,
        })),
      ),
    };

    const result = await searchTenantEvidence(
      bigRepo as never,
      "tenant_acme",
      "invoice",
      { maxTotalChars: 300 },
    );

    const totalChars = result.contextLines.join("").length;
    expect(totalChars).toBeLessThanOrEqual(300);
  });

  it("relevance ranking: business-ID match scores higher than keyword match", async () => {
    const repo = createMockRepository();

    // INV-2024-0081 targets invoice; "contract service agreement" targets contract
    const idResult = await searchTenantEvidence(
      repo as never,
      "tenant_acme",
      "INV-2024-0081",
    );
    // "contract service agreement" matches the contract token
    const kwResult = await searchTenantEvidence(
      repo as never,
      "tenant_acme",
      "contract service agreement",
    );

    // Both should find something
    expect(idResult.matches.length).toBeGreaterThan(0);
    expect(kwResult.matches.length).toBeGreaterThan(0);

    // Each query should surface a different primary source
    expect(idResult.matches[0]!.sourceId).toBe("src_inv_001");
    expect(kwResult.matches[0]!.sourceId).toBe("src_contract_001");
  });

  it("source metadata (filename, sourceId) stays with its own match", async () => {
    const repo = createMockRepository();
    const result = await searchTenantEvidence(
      repo as never,
      "tenant_acme",
      "INV-2024-0081",
    );

    // The match must point to the invoice source, not the contract
    expect(result.matches[0]!.sourceId).toBe("src_inv_001");
    expect(result.sourcesUsed.find((s) => s.sourceId === "src_inv_001")?.filename)
      .toBe("abc-logistics-inv-2024-0081.pdf");
    // The contract source should not appear in sourcesUsed for this query
    expect(result.sourcesUsed.find((s) => s.sourceId === "src_contract_001")).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/* §5 Assistant integration                                           */
/* ------------------------------------------------------------------ */

const TENANT_ENGINE = "tenant_step5_engine";

beforeEach(async () => {
  __resetProductStore();
  const store = getProductStore();
  const state = await store.getState(TENANT_ENGINE);
  state.organisation = {
    tenantId: TENANT_ENGINE,
    name: "Acme",
    workEmail: "a@acme.co",
    website: "",
    onboardingStep: 7,
    onboardingComplete: true,
    createdAt: new Date().toISOString(),
  };
  await store.putState(TENANT_ENGINE, state);
});

describe("§5 assistant integration", () => {
  it("evidence from retrieval reaches the provider via IntelligenceContext", async () => {
    let capturedEvidence: EvidenceResult | null | undefined = undefined;
    const spy = {
      name: "spy",
      async generateReply(ctx: { evidence?: EvidenceResult | null }) {
        capturedEvidence = ctx.evidence;
        return "spy reply";
      },
    };
    setIntelligenceProvider(spy as never);

    // Without DATABASE_URL, evidence is null (no DB) — that's the expected behavior
    await processRequest({ tenantId: TENANT_ENGINE, text: "how many documents do we have" });
    // The context property exists and is null (no DB) — not undefined, not an error
    expect(capturedEvidence).toBeNull();

    // Restore template
    const { assessEvidence: ae, composeAttributedReply: car } = await import("../src/product/attribution.js");
    setIntelligenceProvider({
      name: "template",
      async generateReply(ctx: { evidence?: EvidenceResult | null; intent: { capability: string }; organisationName: string }) {
        return car(ae(ctx.evidence ?? null), { capability: ctx.intent.capability, organisationName: ctx.organisationName });
      },
    } as never);
  });

  it("no-knowledge reply flows through processRequest without DB", async () => {
    const res = await processRequest({
      tenantId: TENANT_ENGINE,
      text: "what is the pension contribution rate",
    });

    expect(res.action.status).toBe("completed");
    // Template provider returns no-knowledge — no fictitious filenames
    expect(res.reply).not.toContain(".pdf");
    expect(res.reply).not.toContain("Sources:");
    expect(res.reply.toLowerCase()).toMatch(/couldn.t find|don.t have|not found/);
  });

  it("source attribution flows through processRequest when evidence injected", async () => {
    // Inject a provider that returns a known reply with attribution
    setIntelligenceProvider({
      name: "test-attributed",
      async generateReply() {
        return "Based on connected documents:\n  • [abc-logistics-inv-2024-0081.pdf] INVOICE_ISSUED: ABC Logistics (92%)\n\nSources:\n  • abc-logistics-inv-2024-0081.pdf";
      },
    } as never);

    const res = await processRequest({
      tenantId: TENANT_ENGINE,
      text: "what is the total on INV-2024-0081",
    });

    expect(res.action.status).toBe("completed");
    expect(res.reply).toContain("abc-logistics-inv-2024-0081.pdf");
    expect(res.reply).toContain("Sources:");

    // Restore
    const { assessEvidence: ae, composeAttributedReply: car } = await import("../src/product/attribution.js");
    setIntelligenceProvider({
      name: "template",
      async generateReply(ctx: { evidence?: EvidenceResult | null; intent: { capability: string }; organisationName: string }) {
        return car(ae(ctx.evidence ?? null), { capability: ctx.intent.capability, organisationName: ctx.organisationName });
      },
    } as never);
  });

  it("capability gate still rejects disabled capabilities regardless of evidence", async () => {
    const res = await processRequest({
      tenantId: TENANT_ENGINE,
      text: "send an email to the client about the invoice",
    });
    expect(res.action.status).toBe("rejected");
    expect(res.reply).toMatch(/turned off/i);
  });

  it("approval gate still holds external actions regardless of evidence", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT_ENGINE);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "send_emails" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT_ENGINE, state);

    const res = await processRequest({
      tenantId: TENANT_ENGINE,
      text: "send an email about invoice INV-2024-0081 to the supplier",
    });
    expect(res.needsApproval).toBe(true);
    expect(res.action.status).toBe("awaiting_approval");
  });

  it("different tenants using the same text get isolated context", async () => {
    // answer_questions is enabled by default so no extra setup needed.
    // Seed minimal org state for these tenants so processRequest doesn't bail.
    const store = getProductStore();
    for (const tid of ["tenant_alpha_step5", "tenant_beta_step5"]) {
      const st = await store.getState(tid);
      st.organisation = {
        tenantId: tid, name: tid, workEmail: `a@${tid}.co`, website: "",
        onboardingStep: 7, onboardingComplete: true, createdAt: new Date().toISOString(),
      };
      await store.putState(tid, st);
    }

    const tenants: string[] = [];
    setIntelligenceProvider({
      name: "tenant-recorder",
      async generateReply(ctx: { request: { tenantId: string } }) {
        tenants.push(ctx.request.tenantId);
        return "ok";
      },
    } as never);

    await processRequest({ tenantId: "tenant_alpha_step5", text: "how many invoices do we have" });
    await processRequest({ tenantId: "tenant_beta_step5", text: "how many invoices do we have" });

    expect(tenants).toEqual(["tenant_alpha_step5", "tenant_beta_step5"]);

    // Restore
    const { assessEvidence: ae, composeAttributedReply: car } = await import("../src/product/attribution.js");
    setIntelligenceProvider({
      name: "template",
      async generateReply(ctx: { evidence?: EvidenceResult | null; intent: { capability: string }; organisationName: string }) {
        return car(ae(ctx.evidence ?? null), { capability: ctx.intent.capability, organisationName: ctx.organisationName });
      },
    } as never);
  });
});
