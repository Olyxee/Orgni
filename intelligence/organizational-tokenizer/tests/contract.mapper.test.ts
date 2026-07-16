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

const clean = loadFixture<ContractExtraction>("contract.clean.json");

describe("mapContractToTokens — complete contract (2 parties, both clauses)", () => {
    const tokens = mapContractToTokens(clean);

    it("emits 4 tokens: 1 EVENT + 1 RELATION + 2 POLICY", () => {
        expect(tokens).toHaveLength(4);
    });

    it("all tokenIds unique and start with tok_", () => {
        const ids = tokens.map((t) => t.tokenId);
        expect(new Set(ids).size).toBe(ids.length);
        ids.forEach((id) => expect(id).toMatch(/^tok_/));
    });

    it("CONTRACT_EXECUTED is an EVENT with contractType and parties", () => {
        const t = tokens.find((t) => t.eventType === "CONTRACT_EXECUTED");
        expect(t!.tokenKind).toBe("EVENT");
        const sv = t!.scalarValue as Record<string, unknown>;
        expect(sv["contractType"]).toBe("SERVICE_AGREEMENT");
        const names = (sv["parties"] as Array<{ name: string }>).map((p) => p.name);
        expect(names).toContain("Olyxee AI (Pty) Ltd");
        expect(names).toContain("Apex Solutions (Pty) Ltd");
    });

    it("CONTRACT_EXECUTED validTime spans effectiveDate to expiryDate", () => {
        const t = tokens.find((t) => t.eventType === "CONTRACT_EXECUTED");
        expect(t!.validTime).toEqual({ from: "2026-07-01", to: "2027-06-30" });
    });

    it("emits 1 CONTRACT_COUNTERPARTY RELATION token", () => {
        const rels = tokens.filter((t) => t.tokenKind === "RELATION");
        expect(rels).toHaveLength(1);
        expect(rels[0].predicate).toBe("CONTRACT_COUNTERPARTY");
        const partyNames = ["Olyxee AI (Pty) Ltd", "Apex Solutions (Pty) Ltd"];
        expect(partyNames).toContain(rels[0].subjectId);
        expect(partyNames).toContain(rels[0].objectId);
        expect(rels[0].subjectId).not.toBe(rels[0].objectId);
    });

    it("emits CONTRACT_TERMINATION_TERMS POLICY with noticePeriodDays", () => {
        const t = tokens.find((t) => t.eventType === "CONTRACT_TERMINATION_TERMS");
        expect(t!.tokenKind).toBe("POLICY");
        expect((t!.scalarValue as Record<string, unknown>)["noticePeriodDays"]).toBe(30);
    });

    it("emits CONTRACT_CONFIDENTIALITY_TERMS POLICY", () => {
        const t = tokens.find((t) => t.eventType === "CONTRACT_CONFIDENTIALITY_TERMS");
        expect(t!.tokenKind).toBe("POLICY");
    });

    it("retentionClass is legal for all tokens", () => {
        tokens.forEach((t) => expect(t.retentionClass).toBe("legal"));
    });
});

describe("mapContractToTokens — no optional clauses", () => {
    const tokens = mapContractToTokens({
        ...clean,
        extractionId: "ext_con_002",
        terminationClause: undefined,
        confidentialityClause: undefined,
    });

    it("emits 2 tokens when both optional clauses absent", () => {
        expect(tokens).toHaveLength(2);
    });

    it("emits no POLICY tokens", () => {
        expect(tokens.filter((t) => t.tokenKind === "POLICY")).toHaveLength(0);
    });
});