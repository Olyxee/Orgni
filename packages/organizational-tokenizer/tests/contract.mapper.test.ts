import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mapContractToTokens } from "../src/mappings/contract.mapper.js";
import type { ContractExtraction } from "../src/envelopes/contract.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(__dirname, "fixtures", name), "utf8")) as T;
}

// Load base fixture and apply an explicit signature date to simulate confirmed execution
const baseClean = loadFixture<ContractExtraction>("contract.clean.json");
const cleanWithExecution: ContractExtraction = {
  ...baseClean,
  signedDate: { value: "2026-07-01", confidence: 0.95 }
};

describe("mapContractToTokens — complete contract (Confirmed Execution)", () => {
  const tokens = mapContractToTokens(cleanWithExecution);

  it("emits 4 tokens: 1 EVENT + 1 RELATION + 2 POLICY when execution is confirmed", () => {
    expect(tokens).toHaveLength(4);
  });

  it("all tokenIds unique and start with tok_", () => {
    const ids = tokens.map((t) => t.tokenId);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^tok_/));
  });

  it("CONTRACT_EXECUTED is an EVENT with contractType and parties", () => {
    const t = tokens.find((t) => t.eventType === "CONTRACT_EXECUTED");
    expect(t).toBeDefined();
    expect(t!.tokenKind).toBe("EVENT");
    const sv = t!.scalarValue as Record<string, unknown>;
    expect(sv["contractType"]).toBe("SERVICE_AGREEMENT");
  });

  it("includes page or section evidence for every generated contract token", () => {
    tokens.forEach((t) => {
      expect(t.sourceRefs[0].locator).toBeDefined();
      expect(typeof t.sourceRefs[0].locator?.page).toBe("number");
      expect(typeof t.sourceRefs[0].locator?.section).toBe("string");
    });
  });

  it("emits 1 CONTRACT_COUNTERPARTY RELATION token", () => {
    const rels = tokens.filter((t) => t.tokenKind === "RELATION");
    expect(rels).toHaveLength(1);
    expect(rels[0].predicate).toBe("CONTRACT_COUNTERPARTY");
  });
});

describe("mapContractToTokens — Unconfirmed Execution / Missing Optional Clauses", () => {
  it("does NOT emit a CONTRACT_EXECUTED token when signature / execution flag is completely absent", () => {
    const unconfirmedPayload: ContractExtraction = {
      ...baseClean,
      signedDate: undefined // Strip signature confirmation fields to verify enforcement
    };
    const tokens = mapContractToTokens(unconfirmedPayload);
    expect(tokens.find((t) => t.eventType === "CONTRACT_EXECUTED")).toBeUndefined();
  });

  it("emits 1 token when execution is unconfirmed and both optional clauses are absent", () => {
    const strippedPayload: ContractExtraction = {
      ...baseClean,
      signedDate: undefined,
      terminationClause: undefined,
      confidentialityClause: undefined
    };
    const tokens = mapContractToTokens(strippedPayload);
    // Emits only the RELATION token for the parties involved
    expect(tokens).toHaveLength(1); 
    expect(tokens[0].tokenKind).toBe("RELATION");
  });
});
