import { beforeEach, describe, expect, it, vi } from "vitest";
import { performance } from "node:perf_hooks";
import { buildEntities, buildEntityDetail, buildFacts, buildRelationships, buildExceptions, type ModelInput } from "../src/lib/model";

const mocks = vi.hoisted(() => ({ load: vi.fn(), states: new Map<string, any>() }));
vi.mock("../src/lib/config", () => ({ config: { DATABASE_URL: "fixture-only", NODE_ENV: "test" } }));
vi.mock("@workspace/db/connect", () => ({ createDb: () => ({ repository: { loadTenantModel: mocks.load } }) }));
vi.mock("../src/product/store", () => ({ getProductStore: () => ({
  getState: async (tid: string) => {
    if (!mocks.states.has(tid)) mocks.states.set(tid, {
      organisation: { name: tid }, activity: [], approvals: [],
      capabilities: [{ key: "answer_questions", enabled: true }, { key: "prepare_work", enabled: true }],
    });
    return structuredClone(mocks.states.get(tid));
  },
  putState: async (tid: string, state: any) => { mocks.states.set(tid, structuredClone(state)); },
}) }));
import { processRequest } from "../src/product/engine";

function fixture(n = 2, tenant = "alpha"): ModelInput {
  return {
    sources: Array.from({ length: n }, (_, i) => ({ sourceId: `${tenant}-${i}`, filename: `${tenant}-${i}.pdf`, documentType: "CONTRACT", state: "COMPLETED", confidence: .9, errors: [], uploadedAt: new Date(Date.UTC(2026, 8, 30 - i)) })),
    facts: Array.from({ length: n }, (_, i) => ({ sourceId: `${tenant}-${i}`, result: {
      entities: [{ entity_id: `acme-${i}`, entity_type: "ORGANIZATION", name: "Acme Ltd" }, { entity_id: `globex-${i}`, entity_type: "ORGANIZATION", name: "Globex" }],
      facts: [{ fact_type: "CREDIT_LIMIT", subject: "Acme Ltd", scalar_value: i === 0 ? 20000 : 10000, epistemic_status: "OBSERVED", effective_at: i === 0 ? "2026-09-30" : "2025-01-01" }],
      relationships: [{ subject_ref: `acme-${i}`, predicate: "SUPPLIES", object_ref: `globex-${i}` }],
      conflicts: i === 1 ? [{ conflict_type: "SCALAR_MISMATCH", detail: "credit limits disagree" }] : [],
    } })), reviews: [],
  };
}

beforeEach(() => {
  mocks.states.clear(); mocks.load.mockReset();
  mocks.load.mockImplementation(async (tid: string) => fixture(2, tid));
});

describe("retrieval evaluation: verified behaviours", () => {
  it("passes the tenant to the repository and does not mix fixture tenants", async () => {
    const a = await processRequest({ tenantId: "alpha", text: "What is Acme's credit limit?" });
    const b = await processRequest({ tenantId: "beta", text: "What is Acme's credit limit?" });
    expect(mocks.load.mock.calls.map(c => c[0])).toEqual(["alpha", "beta"]);
    expect(a.action.sourcesUsed.join()).not.toContain("beta");
    expect(b.action.sourcesUsed.join()).not.toContain("alpha");
  });
  it("returns stable context for 20 repeated requests", async () => {
    const results = [];
    for (let i = 0; i < 20; i++) results.push(await processRequest({ tenantId: "alpha", text: "What is Acme's credit limit?" }));
    expect(new Set(results.map(r => JSON.stringify(r.action.sourcesUsed))).size).toBe(1);
  });
  it("handles empty input without an exception", async () => {
    mocks.load.mockResolvedValue({ sources: [], facts: [], reviews: [] });
    const result = await processRequest({ tenantId: "alpha", text: "What is Acme's credit limit?" });
    expect(result.action.sourcesUsed).toEqual([]);
    expect(result.reply).toMatch(/don't have enough/);
  });
  it("model views preserve facts, relationships, provenance and declared conflicts", () => {
    const input = fixture();
    expect(buildEntities(input)).toHaveLength(2);
    const detail = buildEntityDetail(input, "ORGANIZATION:acme ltd")!;
    expect(detail.facts).toHaveLength(2); expect(detail.relationships).toHaveLength(2);
    expect(detail.sources).toHaveLength(2); expect(buildExceptions(input).conflicts).toHaveLength(1);
  });
  it("skips orphan facts and tolerates missing result fields", () => {
    const input = fixture(1);
    input.facts.push({ sourceId: "missing", result: { facts: [{ subject: "secret" }] } });
    input.facts.push({ sourceId: "alpha-0", result: {} });
    expect(buildFacts(input)).toHaveLength(1);
  });
  it("measures aggregate-only performance at 10, 1000 and 10000 sources", () => {
    const measurements = [10, 1000, 10000].map(n => {
      const input = fixture(n); const samples = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        expect(buildEntities(input)).toHaveLength(2);
        expect(buildFacts(input)).toHaveLength(n);
        expect(buildRelationships(input)).toHaveLength(n);
        samples.push(performance.now() - start);
      }
      samples.sort((a, b) => a - b);
      return { sources: n, iterations: samples.length, medianMs: samples[5], maxMs: samples[9] };
    });
    console.log("RETRIEVAL_AGGREGATION_BENCHMARK", JSON.stringify(measurements));
  });
});

// Expected-failure tests are requirements, not passes for retrieval quality.
// Vitest fails the suite if a defect disappears: convert that case to a normal test.
describe("retrieval evaluation: confirmed unmet requirements", () => {
  it.fails("retrieves the requested business fact and relationship", async () => {
    const result = await processRequest({ tenantId: "alpha", text: "What is Acme's credit limit and who does it supply?" });
    expect(result.action.sourcesUsed.join()).toContain("20000");
    expect(result.action.sourcesUsed.join()).toContain("Globex");
  });
  it.fails("changes retrieved evidence when the question changes", async () => {
    const a = await processRequest({ tenantId: "alpha", text: "What is Acme's credit limit?" });
    const b = await processRequest({ tenantId: "alpha", text: "Who does Globex buy from?" });
    expect(a.action.sourcesUsed).not.toEqual(b.action.sourcesUsed);
  });
  it.fails("signals unavailable retrieval rather than completed success", async () => {
    mocks.load.mockRejectedValue(new Error("database unavailable"));
    const result = await processRequest({ tenantId: "alpha", text: "What is Acme's credit limit?" });
    expect(result.action.status).not.toBe("completed");
  });
  it.fails("does not claim a brief has context when no context is available", async () => {
    mocks.load.mockResolvedValue({ sources: [], facts: [], reviews: [] });
    const result = await processRequest({ tenantId: "alpha", text: "prepare a brief for Acme" });
    expect(result.reply).not.toContain("recent conversations, open issues and documents");
  });
  it.fails("entity detail includes canonical aliases and their relationships", () => {
    const input = fixture();
    (input.facts[0].result.entities as any[])[0].canonical_id = "acme";
    (input.facts[0].result.entities as any[])[0].aliases = ["ACME Trading"];
    (input.facts[1].result.entities as any[])[0].name = "ACME Trading";
    (input.facts[1].result.facts as any[])[0].subject = "ACME Trading";
    const detail = buildEntityDetail(input, "CANONICAL:acme")!;
    expect(detail.facts).toHaveLength(2); expect(detail.relationships).toHaveLength(2);
  });
  it.fails("does not match a relationship to another source's reused entity id", () => {
    const input = fixture();
    (input.facts[1].result.entities as any[])[0].name = "Other Company";
    (input.facts[1].result.entities as any[])[0].entity_id = "acme-0";
    (input.facts[1].result.relationships as any[])[0].subject_ref = "acme-0";
    expect(buildEntityDetail(input, "ORGANIZATION:acme ltd")!.relationships).toHaveLength(1);
  });
  it.fails("flags outdated facts and distinguishes them from current facts", () => {
    const facts = buildFacts(fixture());
    expect(facts.some(f => (f as any).stale === true)).toBe(true);
  });
  it.fails("deduplicates identical facts within one source", () => {
    const input = fixture(1); const facts = input.facts[0].result.facts as any[];
    facts.push(structuredClone(facts[0])); expect(buildFacts(input)).toHaveLength(1);
  });
  it.fails("persists every action under 20 concurrent requests", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => processRequest({ tenantId: "alpha", text: "What is Acme's credit limit?" })));
    expect(results).toHaveLength(20);
    expect(mocks.states.get("alpha").activity).toHaveLength(20);
  });
});
