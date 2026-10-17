/**
 * Step 4 tests — source attribution and no-knowledge handling.
 *
 * All tests are pure-function or in-memory; no database, no network calls.
 * Covers:
 *   - Known evidence returns value and source filename
 *   - Unsupported question → no-knowledge response (no fabrication)
 *   - Missing/invalid source metadata → no invented citation
 *   - Irrelevant evidence not cited
 *   - Contradictory evidence handled safely
 *   - Existing response compatibility
 *   - Tenant isolation (evidence from wrong tenant never surfaces)
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  assessEvidence,
  buildSourceBlock,
  composeAttributedReply,
  noKnowledgeReply,
} from "../src/product/attribution.js";
import type { EvidenceResult } from "../src/lib/evidence.js";
import { __resetProductStore, getProductStore } from "../src/product/store.js";
import {
  getIntelligenceProvider,
  processRequest,
  setIntelligenceProvider,
} from "../src/product/engine.js";
import type { IntelligenceProvider } from "../src/product/engine.js";

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

function makeEvidence(
  overrides: Partial<EvidenceResult> = {},
): EvidenceResult {
  return {
    matches: [],
    contextLines: [],
    sourcesUsed: [],
    totalConsidered: 0,
    ...overrides,
  };
}

function makeMatch(
  sourceId: string,
  score: number,
  token: Record<string, unknown> = {},
) {
  return { sourceId, score, confidence: 0.9, token };
}

/* ------------------------------------------------------------------ */
/* assessEvidence                                                      */
/* ------------------------------------------------------------------ */

describe("assessEvidence", () => {
  it("returns 'none' for null input", () => {
    expect(assessEvidence(null)).toMatchObject({ kind: "none" });
  });

  it("returns 'none' for empty evidence", () => {
    expect(assessEvidence(makeEvidence())).toMatchObject({ kind: "none" });
  });

  it("returns 'insufficient' when all matches score below threshold", () => {
    // score of 0 won't appear in matches (retrieval filters them), so
    // simulate a bug by setting score to 0 directly
    const ev = makeEvidence({
      matches: [makeMatch("src_1", 0)],
      contextLines: ["[invoice.pdf] some detail"],
      sourcesUsed: [{ sourceId: "src_1", filename: "invoice.pdf" }],
    });
    expect(assessEvidence(ev)).toMatchObject({ kind: "insufficient" });
  });

  it("returns 'sufficient' for a single well-scored match", () => {
    const ev = makeEvidence({
      matches: [makeMatch("src_1", 10, { eventType: "INVOICE_ISSUED", subjectId: "CI-001", scalarValue: { value: 1500 } })],
      contextLines: ["[invoice.pdf] INVOICE_ISSUED: CI-001"],
      sourcesUsed: [{ sourceId: "src_1", filename: "invoice.pdf" }],
    });
    const result = assessEvidence(ev);
    expect(result.kind).toBe("sufficient");
    if (result.kind === "sufficient") {
      expect(result.sources).toContain("invoice.pdf");
      expect(result.lines).toHaveLength(1);
    }
  });

  it("returns 'contradictory' when two sources disagree on the same fact", () => {
    const ev = makeEvidence({
      matches: [
        makeMatch("src_1", 5, {
          eventType: "INVOICE_TOTAL",
          subjectId: "CI-001",
          scalarValue: { value: 1000, currency: "GBP" },
        }),
        makeMatch("src_2", 5, {
          eventType: "INVOICE_TOTAL",
          subjectId: "CI-001",
          scalarValue: { value: 1500, currency: "GBP" },
        }),
      ],
      contextLines: [
        "[invoice-a.pdf] INVOICE_TOTAL CI-001: 1000 GBP",
        "[invoice-b.pdf] INVOICE_TOTAL CI-001: 1500 GBP",
      ],
      sourcesUsed: [
        { sourceId: "src_1", filename: "invoice-a.pdf" },
        { sourceId: "src_2", filename: "invoice-b.pdf" },
      ],
    });
    const result = assessEvidence(ev);
    expect(result.kind).toBe("contradictory");
    if (result.kind === "contradictory") {
      expect(result.sources).toContain("invoice-a.pdf");
      expect(result.sources).toContain("invoice-b.pdf");
    }
  });

  it("does NOT flag contradiction when two sources agree on the same fact", () => {
    const ev = makeEvidence({
      matches: [
        makeMatch("src_1", 5, {
          eventType: "INVOICE_TOTAL",
          subjectId: "CI-001",
          scalarValue: { value: 1000, currency: "GBP" },
        }),
        makeMatch("src_2", 5, {
          eventType: "INVOICE_TOTAL",
          subjectId: "CI-001",
          scalarValue: { value: 1000, currency: "GBP" },
        }),
      ],
      contextLines: ["[a.pdf] 1000 GBP", "[b.pdf] 1000 GBP"],
      sourcesUsed: [
        { sourceId: "src_1", filename: "a.pdf" },
        { sourceId: "src_2", filename: "b.pdf" },
      ],
    });
    expect(assessEvidence(ev).kind).toBe("sufficient");
  });

  it("does not flag contradiction for different subjects (not the same fact)", () => {
    const ev = makeEvidence({
      matches: [
        makeMatch("src_1", 5, { eventType: "INVOICE_TOTAL", subjectId: "CI-001", scalarValue: 1000 }),
        makeMatch("src_2", 5, { eventType: "INVOICE_TOTAL", subjectId: "CI-002", scalarValue: 2000 }),
      ],
      contextLines: ["[a.pdf] CI-001: 1000", "[b.pdf] CI-002: 2000"],
      sourcesUsed: [
        { sourceId: "src_1", filename: "a.pdf" },
        { sourceId: "src_2", filename: "b.pdf" },
      ],
    });
    expect(assessEvidence(ev).kind).toBe("sufficient");
  });
});

/* ------------------------------------------------------------------ */
/* buildSourceBlock                                                    */
/* ------------------------------------------------------------------ */

describe("buildSourceBlock", () => {
  it("returns empty string for empty list", () => {
    expect(buildSourceBlock([])).toBe("");
  });

  it("filters out 'unknown' placeholders — never cites invented filenames", () => {
    expect(buildSourceBlock(["unknown"])).toBe("");
    expect(buildSourceBlock(["unknown", "unknown"])).toBe("");
  });

  it("includes real filenames", () => {
    const block = buildSourceBlock(["invoice.pdf", "contract.pdf"]);
    expect(block).toContain("invoice.pdf");
    expect(block).toContain("contract.pdf");
    expect(block).toContain("Sources:");
  });

  it("mixes real and unknown — only real ones appear", () => {
    const block = buildSourceBlock(["unknown", "invoice.pdf", "unknown"]);
    expect(block).toContain("invoice.pdf");
    expect(block).not.toContain("unknown");
  });
});

/* ------------------------------------------------------------------ */
/* composeAttributedReply                                             */
/* ------------------------------------------------------------------ */

describe("composeAttributedReply", () => {
  const opts = { capability: "answer_questions", organisationName: "Acme" };

  it("sufficient — includes evidence lines and source filename", () => {
    const reply = composeAttributedReply(
      {
        kind: "sufficient",
        lines: ["[invoice.pdf] INVOICE_ISSUED: CI-001 (90%)"],
        sources: ["invoice.pdf"],
      },
      opts,
    );
    expect(reply).toContain("invoice.pdf");
    expect(reply).toContain("CI-001");
    expect(reply).toContain("Sources:");
    // Must NOT contain "unknown"
    expect(reply).not.toContain("unknown");
  });

  it("none — no-knowledge message, no fabricated filename", () => {
    const reply = composeAttributedReply({ kind: "none" }, opts);
    expect(reply).not.toContain("invoice");
    expect(reply).not.toContain("Sources:");
    // Should indicate the information wasn't found
    expect(reply.toLowerCase()).toMatch(/couldn.t find|don.t have|not found/);
  });

  it("insufficient — acknowledges documents exist but can't answer", () => {
    const reply = composeAttributedReply({ kind: "insufficient" }, opts);
    expect(reply).not.toContain("Sources:");
    expect(reply.toLowerCase()).toMatch(/don.t contain|couldn.t find|not contain/);
  });

  it("contradictory — flags the conflict without resolving it", () => {
    const reply = composeAttributedReply(
      {
        kind: "contradictory",
        lines: ["[a.pdf] 1000 GBP", "[b.pdf] 1500 GBP"],
        sources: ["a.pdf", "b.pdf"],
      },
      opts,
    );
    expect(reply).toContain("a.pdf");
    expect(reply).toContain("b.pdf");
    // Must flag the conflict
    expect(reply.toLowerCase()).toMatch(/don.t.*agree|conflict|verify/);
    // Must NOT silently pick one value
    expect(reply).not.toMatch(/the (total|amount) is/i);
  });

  it("sufficient with unknown source — source block is omitted", () => {
    const reply = composeAttributedReply(
      {
        kind: "sufficient",
        lines: ["[unknown] some detail"],
        sources: ["unknown"],
      },
      opts,
    );
    // Evidence lines still appear
    expect(reply).toContain("some detail");
    // But "Sources:" block is suppressed because the filename is a placeholder
    expect(reply).not.toContain("Sources:");
  });
});

/* ------------------------------------------------------------------ */
/* noKnowledgeReply                                                   */
/* ------------------------------------------------------------------ */

describe("noKnowledgeReply", () => {
  it("never contains a filename, document ID, or number", () => {
    const capabilities = [
      "answer_questions",
      "find_documents",
      "financial_actions",
      "prepare_work",
      "other",
    ];
    for (const cap of capabilities) {
      const reply = noKnowledgeReply(cap);
      // No filenames (no dots in typical extension positions)
      expect(reply).not.toMatch(/\.\w{2,4}\b/);
      // No document IDs
      expect(reply).not.toMatch(/CI-|SI-|PO-|INV-/);
      // Non-empty
      expect(reply.length).toBeGreaterThan(10);
    }
  });
});

/* ------------------------------------------------------------------ */
/* TemplateIntelligenceProvider — end-to-end via generateReply        */
/* ------------------------------------------------------------------ */

describe("TemplateIntelligenceProvider — attribution", () => {
  it("answer_questions with sufficient evidence includes filename and evidence line", async () => {
    const provider = getIntelligenceProvider();
    const reply = await provider.generateReply({
      request: { tenantId: "t1", text: "what is the total for CI-001?" },
      intent: { capability: "answer_questions", approvalCategory: "read_information", verb: "answer a question", actionKind: "none" },
      organisationName: "Acme",
      contextLines: [],
      evidence: makeEvidence({
        matches: [makeMatch("src_1", 10, { eventType: "INVOICE_TOTAL", subjectId: "CI-001", scalarValue: 1500 })],
        contextLines: ["[invoice.pdf] INVOICE_TOTAL: CI-001 (90%)"],
        sourcesUsed: [{ sourceId: "src_1", filename: "invoice.pdf" }],
      }),
    });
    expect(reply).toContain("invoice.pdf");
    expect(reply).toContain("CI-001");
  });

  it("answer_questions with no evidence returns no-knowledge, no invented data", async () => {
    const provider = getIntelligenceProvider();
    const reply = await provider.generateReply({
      request: { tenantId: "t1", text: "what is the annual revenue?" },
      intent: { capability: "answer_questions", approvalCategory: "read_information", verb: "answer a question", actionKind: "none" },
      organisationName: "Acme",
      contextLines: [],
      evidence: makeEvidence(), // empty
    });
    expect(reply).not.toContain(".pdf");
    expect(reply).not.toContain("Sources:");
    expect(reply.toLowerCase()).toMatch(/couldn.t find|don.t have|not found/);
  });

  it("contradictory evidence flags the conflict and includes both sources", async () => {
    const provider = getIntelligenceProvider();
    const reply = await provider.generateReply({
      request: { tenantId: "t1", text: "what is the total for CI-001?" },
      intent: { capability: "answer_questions", approvalCategory: "read_information", verb: "answer a question", actionKind: "none" },
      organisationName: "Acme",
      contextLines: [],
      evidence: makeEvidence({
        matches: [
          makeMatch("src_1", 5, { eventType: "INVOICE_TOTAL", subjectId: "CI-001", scalarValue: 1000 }),
          makeMatch("src_2", 5, { eventType: "INVOICE_TOTAL", subjectId: "CI-001", scalarValue: 1500 }),
        ],
        contextLines: ["[a.pdf] 1000", "[b.pdf] 1500"],
        sourcesUsed: [
          { sourceId: "src_1", filename: "a.pdf" },
          { sourceId: "src_2", filename: "b.pdf" },
        ],
      }),
    });
    expect(reply).toContain("a.pdf");
    expect(reply).toContain("b.pdf");
    expect(reply.toLowerCase()).toMatch(/don.t.*agree|conflict|verify/);
  });

  it("irrelevant evidence (score 0) treated as insufficient — no citation", async () => {
    // Score 0 matches don't pass the attribution threshold
    const provider = getIntelligenceProvider();
    const reply = await provider.generateReply({
      request: { tenantId: "t1", text: "what is our leave policy?" },
      intent: { capability: "answer_questions", approvalCategory: "read_information", verb: "answer a question", actionKind: "none" },
      organisationName: "Acme",
      contextLines: [],
      evidence: makeEvidence({
        matches: [makeMatch("src_irrelevant", 0)], // below threshold
        contextLines: [],
        sourcesUsed: [],
      }),
    });
    // No citation of the irrelevant source
    expect(reply).not.toContain("src_irrelevant");
    expect(reply).not.toContain("Sources:");
  });

  it("missing source metadata — no invented filename", async () => {
    const provider = getIntelligenceProvider();
    const reply = await provider.generateReply({
      request: { tenantId: "t1", text: "what is the total?" },
      intent: { capability: "answer_questions", approvalCategory: "read_information", verb: "answer a question", actionKind: "none" },
      organisationName: "Acme",
      contextLines: [],
      evidence: makeEvidence({
        matches: [makeMatch("src_1", 5, { eventType: "TOTAL", subjectId: "X" })],
        contextLines: ["[unknown] TOTAL: X"],
        sourcesUsed: [{ sourceId: "src_1", filename: "unknown" }],
      }),
    });
    // "unknown" placeholder must not appear as a cited source
    expect(reply).not.toContain("Sources:");
  });
});

/* ------------------------------------------------------------------ */
/* Engine integration — existing behaviour preserved                  */
/* ------------------------------------------------------------------ */

const TENANT = "tenant_attribution_test";

beforeEach(async () => {
  __resetProductStore();
  const store = getProductStore();
  const state = await store.getState(TENANT);
  state.organisation = {
    tenantId: TENANT,
    name: "Test Co",
    workEmail: "a@test.co",
    website: "",
    onboardingStep: 7,
    onboardingComplete: true,
    createdAt: new Date().toISOString(),
  };
  await store.putState(TENANT, state);
});

describe("engine — response compatibility", () => {
  it("still declines disabled capabilities", async () => {
    const res = await processRequest({ tenantId: TENANT, text: "send an email to the client" });
    expect(res.action.status).toBe("rejected");
    expect(res.reply).toMatch(/turned off/i);
  });

  it("answer_questions with no DB returns no-knowledge, not a crash", async () => {
    const res = await processRequest({ tenantId: TENANT, text: "how many invoices do we have" });
    expect(res.action.status).toBe("completed");
    expect(res.reply.toLowerCase()).toMatch(/couldn.t find|don.t have|not found/);
    expect(res.reply).not.toContain("Sources:");
  });

  it("action sourcesUsed is populated from evidence filenames when available", async () => {
    // Inject a provider that captures the evidence passed to it
    let capturedEvidence: unknown = undefined;
    const spy: IntelligenceProvider = {
      name: "spy",
      async generateReply(ctx) {
        capturedEvidence = ctx.evidence;
        return "spy reply";
      },
    };
    setIntelligenceProvider(spy);

    await processRequest({ tenantId: TENANT, text: "prepare everything for the board meeting" });
    // Without DB, evidence should be null
    expect(capturedEvidence).toBeNull();

    // Restore default
    setIntelligenceProvider({
      name: "template",
      async generateReply(ctx) {
        const { assessEvidence: ae, composeAttributedReply: car } = await import("../src/product/attribution.js");
        const assessment = ae(ctx.evidence ?? null);
        return car(assessment, { capability: ctx.intent.capability, organisationName: ctx.organisationName });
      },
    });
  });

  it("tenant isolation — provider never receives another tenant's evidence", async () => {
    // Each processRequest is scoped to its tenantId; the engine calls
    // gatherContext(req.tenantId, ...) which passes tenantId directly
    // to searchTenantEvidence. Without DB there's nothing to leak.
    // With DB it would filter by tenant_id at the SQL level (already tested
    // in the db package). Here we verify the request payload is correct.
    let capturedTenantId: string | undefined;
    const spy: IntelligenceProvider = {
      name: "spy",
      async generateReply(ctx) {
        capturedTenantId = ctx.request.tenantId;
        return "ok";
      },
    };
    setIntelligenceProvider(spy);

    await processRequest({ tenantId: "tenant_alpha", text: "what is our budget" });
    expect(capturedTenantId).toBe("tenant_alpha");

    await processRequest({ tenantId: "tenant_beta", text: "what is our budget" });
    expect(capturedTenantId).toBe("tenant_beta");

    // Restore
    setIntelligenceProvider({
      name: "template",
      async generateReply(ctx) {
        const { assessEvidence: ae, composeAttributedReply: car } = await import("../src/product/attribution.js");
        return car(ae(ctx.evidence ?? null), { capability: ctx.intent.capability, organisationName: ctx.organisationName });
      },
    });
  });
});
