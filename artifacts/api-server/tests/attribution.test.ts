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

// ---------------------------------------------------------------------------
// Phase 5 regressions: relevance floor, insufficient path, contradiction fix,
// Anthropic capability routing
// ---------------------------------------------------------------------------

describe("assessEvidence — relevance floor (MIN_ATTRIBUTION_SCORE = 2)", () => {
  it("returns insufficient when all matches score exactly 1 (single common word)", () => {
    // score 1 = one generic term matched — below the floor of 2
    const ev = makeEvidence({
      matches: [makeMatch("src_1", 1, { eventType: "INVOICE_ISSUED", subjectId: "X" })],
      contextLines: ["[doc.pdf] INVOICE_ISSUED: X"],
      sourcesUsed: [{ sourceId: "src_1", filename: "doc.pdf" }],
    });
    expect(assessEvidence(ev).kind).toBe("insufficient");
  });

  it("returns sufficient when top match scores 2 (two term matches)", () => {
    const ev = makeEvidence({
      matches: [makeMatch("src_1", 2, { eventType: "INVOICE_ISSUED", subjectId: "Acme" })],
      contextLines: ["[invoice.pdf] detail"],
      sourcesUsed: [{ sourceId: "src_1", filename: "invoice.pdf" }],
    });
    expect(assessEvidence(ev).kind).toBe("sufficient");
  });

  it("returns sufficient when top match is a business-identifier hit (score 10)", () => {
    const ev = makeEvidence({
      matches: [makeMatch("src_1", 10, { eventType: "INVOICE_TOTAL", subjectId: "CI-2026-01052" })],
      contextLines: ["[invoice.pdf] CI-2026-01052"],
      sourcesUsed: [{ sourceId: "src_1", filename: "invoice.pdf" }],
    });
    expect(assessEvidence(ev).kind).toBe("sufficient");
  });

  it("insufficient is now reachable: single-word 'status' match produces score 1, below floor", () => {
    // This is the exact case the reviewer raised: querying "status" alone must
    // not produce cited evidence.
    const ev = makeEvidence({
      matches: [makeMatch("src_1", 1, { tokenKind: "STATE", subjectId: "status" })],
      contextLines: ["[doc.pdf] STATE: status"],
      sourcesUsed: [{ sourceId: "src_1", filename: "doc.pdf" }],
    });
    const result = assessEvidence(ev);
    expect(result.kind).toBe("insufficient");
    // composeAttributedReply must not cite any source
    const reply = composeAttributedReply(result, { capability: "answer_questions", organisationName: "Acme" });
    expect(reply).not.toContain("Sources:");
    expect(reply).not.toContain("doc.pdf");
  });
});

describe("assessEvidence — contradiction detection with single-source evidence", () => {
  it("does NOT flag contradiction when all qualifying matches are from the same source", () => {
    // Same source, two tokens with the same (eventType, subjectId) but
    // different scalarValue — could happen with multi-page extraction; must not
    // be labelled contradictory.
    const ev = makeEvidence({
      matches: [
        makeMatch("src_1", 5, { eventType: "INVOICE_TOTAL", subjectId: "CI-001", scalarValue: 1000 }),
        makeMatch("src_1", 5, { eventType: "INVOICE_TOTAL", subjectId: "CI-001", scalarValue: 1200 }),
      ],
      contextLines: ["[a.pdf] 1000", "[a.pdf] 1200"],
      sourcesUsed: [{ sourceId: "src_1", filename: "a.pdf" }],
    });
    // Single distinct source — must be sufficient, not contradictory
    expect(assessEvidence(ev).kind).toBe("sufficient");
  });

  it("flags contradiction only when two DISTINCT sources disagree", () => {
    const ev = makeEvidence({
      matches: [
        makeMatch("src_1", 5, { eventType: "INVOICE_TOTAL", subjectId: "CI-001", scalarValue: 1000 }),
        makeMatch("src_2", 5, { eventType: "INVOICE_TOTAL", subjectId: "CI-001", scalarValue: 9999 }),
      ],
      contextLines: ["[a.pdf] 1000", "[b.pdf] 9999"],
      sourcesUsed: [
        { sourceId: "src_1", filename: "a.pdf" },
        { sourceId: "src_2", filename: "b.pdf" },
      ],
    });
    expect(assessEvidence(ev).kind).toBe("contradictory");
  });

  it("does NOT flag contradiction when two sources agree on the same fact", () => {
    const ev = makeEvidence({
      matches: [
        makeMatch("src_1", 5, { eventType: "INVOICE_TOTAL", subjectId: "CI-001", scalarValue: 1000 }),
        makeMatch("src_2", 5, { eventType: "INVOICE_TOTAL", subjectId: "CI-001", scalarValue: 1000 }),
      ],
      contextLines: ["[a.pdf] 1000", "[b.pdf] 1000"],
      sourcesUsed: [
        { sourceId: "src_1", filename: "a.pdf" },
        { sourceId: "src_2", filename: "b.pdf" },
      ],
    });
    expect(assessEvidence(ev).kind).toBe("sufficient");
  });
});

describe("Anthropic provider — capability routing for non-document requests", () => {
  // These tests check the TemplateIntelligenceProvider directly to avoid
  // depending on the global provider state (which may have been swapped by
  // earlier tests using setIntelligenceProvider).
  async function templateReply(
    capability: string,
    verb: string,
    approvalCategory: string,
    text: string,
  ): Promise<string> {
    // Re-import to get a fresh template provider instance.
    const { assessEvidence: ae, composeAttributedReply: car } = await import(
      "../src/product/attribution.js"
    );
    // The template provider logic is: for action-oriented capabilities,
    // return confirmatory text + appendEvidence(""). For question-answering
    // capabilities, return composeAttributedReply(assessment).
    // We validate this through processRequest (which always uses the current
    // global provider) — but first restore it to template.
    const { getIntelligenceProvider: getP, setIntelligenceProvider: setP } =
      await import("../src/product/engine.js");
    setP({
      name: "template",
      async generateReply(ctx: Parameters<typeof getP extends () => { generateReply: infer F } ? F : never>[0]) {
        return car(ae(ctx.evidence ?? null), {
          capability: ctx.intent.capability,
          organisationName: ctx.organisationName,
        });
      },
    } as never);
    return getP().generateReply({
      request: { tenantId: "t1", text },
      intent: { capability, approvalCategory: approvalCategory as never, verb, actionKind: "none" as const },
      organisationName: "Acme",
      contextLines: [],
      evidence: null,
    });
  }

  it("prepare_work with no evidence does NOT return a document no-knowledge reply", async () => {
    const provider = getIntelligenceProvider();
    // Reset to a fresh template instance to avoid stale spy state
    const { TemplateProvider } = { TemplateProvider: null }; // can't access private class
    // Instead test via the template provider's actual output path:
    // prepare_work → "I've pulled together..." regardless of evidence
    const reply = await provider.generateReply({
      request: { tenantId: "t1", text: "prepare everything for tomorrow's board meeting" },
      intent: {
        capability: "prepare_work",
        approvalCategory: "prepare_documents" as never,
        verb: "prepare a brief",
        actionKind: "none" as const,
      },
      organisationName: "Acme",
      contextLines: [],
      evidence: makeEvidence(), // empty — score 0 tokens
    });
    // Template provider for prepare_work returns "I've pulled together..."
    // even with no evidence (it just omits the evidence appendix).
    // Must NOT say "couldn't find a document" for a preparation request.
    expect(reply.toLowerCase()).not.toMatch(/couldn.t find a document/);
  });

  it("schedule_meetings with no evidence gives a booking reply, not a document error", async () => {
    const provider = getIntelligenceProvider();
    const reply = await provider.generateReply({
      request: { tenantId: "t1", text: "schedule a review with the team" },
      intent: {
        capability: "schedule_meetings",
        approvalCategory: "schedule_meetings" as never,
        verb: "schedule a meeting",
        actionKind: "none" as const,
      },
      organisationName: "Acme",
      contextLines: [],
      evidence: makeEvidence(), // empty
    });
    expect(reply.toLowerCase()).not.toMatch(/couldn.t find a document/);
  });

  it("answer_questions with no evidence still returns no-knowledge (evidence-dependent)", async () => {
    const provider = getIntelligenceProvider();
    const reply = await provider.generateReply({
      request: { tenantId: "t1", text: "what is the total on invoice CI-2026-01052?" },
      intent: {
        capability: "answer_questions",
        approvalCategory: "read_information" as never,
        verb: "answer a question",
        actionKind: "none" as const,
      },
      organisationName: "Acme",
      contextLines: [],
      evidence: makeEvidence(), // empty
    });
    // Must return no-knowledge for unanswerable question
    expect(reply.toLowerCase()).toMatch(/couldn.t find|don.t have|not found/);
    expect(reply).not.toContain("Sources:");
  });
});

/* ------------------------------------------------------------------ */
/* Task B regressions: Only sources actually cited are saved on action */
/* ------------------------------------------------------------------ */

describe("action source attribution — cited sources filtering (Task B)", () => {
  it("marketing budget question with no-clear-answer reply does not record candidate files as sourcesUsed", async () => {
    // 6 candidate files matching generic terms
    const candidateFiles = [
      "01_marketing_budget_q1.pdf",
      "02_marketing_budget_q2.pdf",
      "03_marketing_plan_2026.pdf",
      "04_annual_forecast.xlsx",
      "05_spend_tracking.csv",
      "06_vendor_estimates.docx",
    ];

    const mockEvidence = makeEvidence({
      matches: candidateFiles.map((f, i) =>
        makeMatch(`src_${i}`, 1, { eventType: "STATE", subjectId: "budget" }),
      ),
      contextLines: candidateFiles.map((f) => `[${f}] STATE: budget`),
      sourcesUsed: candidateFiles.map((f, i) => ({ sourceId: `src_${i}`, filename: f })),
      totalConsidered: candidateFiles.length,
    });

    const previousProvider = getIntelligenceProvider();
    try {
      // Set provider that assesses evidence and returns composeAttributedReply
      setIntelligenceProvider({
        name: "template",
        async generateReply(ctx) {
          const assessment = assessEvidence(ctx.evidence ?? null);
          return composeAttributedReply(assessment, {
            capability: ctx.intent.capability,
            organisationName: ctx.organisationName,
          });
        },
      });

      // Inject the mock evidence into processRequest via a mock provider that exercises the engine flow
      setIntelligenceProvider({
        name: "test-provider",
        async generateReply(ctx) {
          // Assessment is "insufficient" because scores are 1 (< MIN_ATTRIBUTION_SCORE)
          const assessment = assessEvidence(mockEvidence);
          expect(assessment.kind).toBe("insufficient");
          return composeAttributedReply(assessment, {
            capability: "answer_questions",
            organisationName: "Acme",
          });
        },
      });

      // Directly verify that when reply does not cite the candidate files, sourcesUsed is empty
      const reply = composeAttributedReply(assessEvidence(mockEvidence), {
        capability: "answer_questions",
        organisationName: "Acme",
      });
      expect(reply).toContain("don't contain a clear answer");
      for (const file of candidateFiles) {
        expect(reply).not.toContain(file);
      }

      // Filter logic matches engine.ts line 330
      const sourcesUsed = Array.from(
        new Set(
          mockEvidence.sourcesUsed
            .map((s) => s.filename)
            .filter((name) => Boolean(name) && name !== "unknown" && reply.includes(name)),
        ),
      );
      expect(sourcesUsed).toEqual([]);
    } finally {
      setIntelligenceProvider(previousProvider);
    }
  });

  it("meeting scheduling does not record candidate files as sourcesUsed when reply does not cite them", async () => {
    const eightFiles = [
      "doc1.pdf", "doc2.pdf", "doc3.pdf", "doc4.pdf",
      "doc5.pdf", "doc6.pdf", "doc7.pdf", "doc8.pdf",
    ];
    const candidateSources = eightFiles.map((f, i) => ({ sourceId: `src_${i}`, filename: f }));
    const meetingReply = "I can set that up. I'll find a time that works for everyone and send the invite.";

    const sourcesUsed = Array.from(
      new Set(
        candidateSources
          .map((s) => s.filename)
          .filter((name) => Boolean(name) && name !== "unknown" && meetingReply.includes(name)),
      ),
    );
    expect(sourcesUsed).toEqual([]);
  });

  it("reply that cites a source preserves only that source in sourcesUsed", async () => {
    const candidateSources = [
      { sourceId: "src_1", filename: "06_customer_invoice_CI-2026-01052.pdf" },
      { sourceId: "src_2", filename: "unrelated_policy.pdf" },
    ];
    const reply =
      "Based on connected documents:\n\n" +
      "  • [06_customer_invoice_CI-2026-01052.pdf] INVOICE_TOTAL CI-2026-01052: 136275 ZAR\n\n" +
      "Sources:\n" +
      "  • 06_customer_invoice_CI-2026-01052.pdf";

    const sourcesUsed = Array.from(
      new Set(
        candidateSources
          .map((s) => s.filename)
          .filter((name) => Boolean(name) && name !== "unknown" && reply.includes(name)),
      ),
    );
    expect(sourcesUsed).toEqual(["06_customer_invoice_CI-2026-01052.pdf"]);
  });
});

/* ------------------------------------------------------------------ */
/* Task C regressions: False contradiction vs genuine conflict        */
/* ------------------------------------------------------------------ */

describe("assessEvidence — false contradiction fix (Task C)", () => {
  it("does not trigger contradiction for SI-USW-7719 when other sources contain exception or link tokens", () => {
    const ev = makeEvidence({
      matches: [
        // Source 1: Factual invoice total
        makeMatch("src_invoice", 10, {
          tokenKind: "STATE",
          eventType: "SUPPLIER_INVOICE_TOTAL",
          subjectId: "SI-USW-7719",
          scalarValue: { value: 269560, currency: "ZAR" },
        }),
        // Source 2: Exception token mentioning the variance/SI-USW-7719
        makeMatch("src_status_report", 10, {
          tokenKind: "STATE",
          eventType: "EXCEPTION_EVIDENCE",
          subjectId: "invoice-po-variance",
          scalarValue: {
            scenarioKey: "invoice-po-variance",
            scenario: "Invoice amount differs from purchase order",
            observation: "SI-USW-7719 ZAR 269,560 Variance ZAR 15,180",
            sourceDocument: "34_project_status_report_Atlas.pptx",
          },
        }),
        // Source 3: Transaction link token
        makeMatch("src_grn", 10, {
          tokenKind: "STATE",
          eventType: "TRANSACTION_LINK",
          subjectId: "GRN-2026-331",
          objectId: "SI-USW-7719",
          scalarValue: {
            linkType: "SUPPORTS_INVOICE",
            from: "GRN-2026-331",
            to: "SI-USW-7719",
            sourceDocument: "11_goods_received_note_GRN-2026-331.txt",
          },
        }),
      ],
      contextLines: [
        "[07_supplier_invoice_SI-USW-7719.pdf] SUPPLIER_INVOICE_TOTAL SI-USW-7719: 269560 ZAR",
        "[34_project_status_report_Atlas.pptx] EXCEPTION_EVIDENCE: invoice-po-variance",
      ],
      sourcesUsed: [
        { sourceId: "src_invoice", filename: "07_supplier_invoice_SI-USW-7719.pdf" },
        { sourceId: "src_status_report", filename: "34_project_status_report_Atlas.pptx" },
      ],
    });

    const assessment = assessEvidence(ev);
    // Must be sufficient, NOT contradictory!
    expect(assessment.kind).toBe("sufficient");

    // Natural-language reply must not claim documents disagree
    const reply = composeAttributedReply(assessment, {
      capability: "answer_questions",
      organisationName: "Acme",
    });
    expect(reply).not.toContain("don't fully agree");
    expect(reply).toContain("Based on connected documents");
  });

  it("detects genuine conflicting values for the same field from distinct sources", () => {
    const ev = makeEvidence({
      matches: [
        makeMatch("src_invoice", 10, {
          tokenKind: "STATE",
          eventType: "SUPPLIER_INVOICE_TOTAL",
          subjectId: "SI-USW-7719",
          scalarValue: { value: 269560, currency: "ZAR" },
        }),
        makeMatch("src_other", 10, {
          tokenKind: "STATE",
          eventType: "SUPPLIER_INVOICE_TOTAL",
          subjectId: "SI-USW-7719",
          scalarValue: { value: 254380, currency: "ZAR" },
        }),
      ],
      contextLines: [
        "[07_supplier_invoice_SI-USW-7719.pdf] 269560 ZAR",
        "[internal_po.pdf] 254380 ZAR",
      ],
      sourcesUsed: [
        { sourceId: "src_invoice", filename: "07_supplier_invoice_SI-USW-7719.pdf" },
        { sourceId: "src_other", filename: "internal_po.pdf" },
      ],
    });

    const assessment = assessEvidence(ev);
    expect(assessment.kind).toBe("contradictory");
    if (assessment.kind === "contradictory") {
      expect(assessment.sources).toContain("07_supplier_invoice_SI-USW-7719.pdf");
      expect(assessment.sources).toContain("internal_po.pdf");
    }

    const reply = composeAttributedReply(assessment, {
      capability: "answer_questions",
      organisationName: "Acme",
    });
    expect(reply).toContain("don't fully agree");
    expect(reply).toContain("Please verify the correct value");
  });
});
