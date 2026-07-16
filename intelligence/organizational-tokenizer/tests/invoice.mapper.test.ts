import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mapInvoiceToTokens } from "../src/mappings/invoice.mapper.js";
import type { InvoiceExtraction } from "../src/envelopes/invoice.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadFixture<T>(name: string): T {
    return JSON.parse(readFileSync(resolve(__dirname, "fixtures", name), "utf8")) as T;
}

const clean = loadFixture<InvoiceExtraction>("invoice.clean.json");
const partial = loadFixture<InvoiceExtraction>("invoice.partial.json");

describe("mapInvoiceToTokens — clean invoice", () => {
    const tokens = mapInvoiceToTokens(clean);

    it("emits 3 tokens for a complete invoice with line items", () => {
        expect(tokens).toHaveLength(3);
    });

    it("all tokenIds are unique and start with tok_", () => {
        const ids = tokens.map((t) => t.tokenId);
        expect(new Set(ids).size).toBe(ids.length);
        ids.forEach((id) => expect(id).toMatch(/^tok_/));
    });

    it("emits EVENT and STATE token kinds", () => {
        const kinds = tokens.map((t) => t.tokenKind);
        expect(kinds).toContain("EVENT");
        expect(kinds).toContain("STATE");
    });

    it("INVOICE_ISSUED has correct vendor and buyer", () => {
        const t = tokens.find((t) => t.eventType === "INVOICE_ISSUED");
        expect(t!.subjectId).toBe("Apex Solutions (Pty) Ltd");
        expect(t!.objectId).toBe("Olyxee AI (Pty) Ltd");
    });

    it("INVOICE_ISSUED carries invoiceNumber, totalAmount, currency", () => {
        const t = tokens.find((t) => t.eventType === "INVOICE_ISSUED");
        expect(t!.scalarValue).toMatchObject({
            invoiceNumber: "INV-2026-0042",
            totalAmount: 49450,
            currency: "ZAR",
        });
    });

    it("INVOICE_OBLIGATION — buyer owes vendor, status OUTSTANDING", () => {
        const t = tokens.find((t) => t.eventType === "INVOICE_OBLIGATION");
        expect(t!.tokenKind).toBe("STATE");
        expect(t!.subjectId).toBe("Olyxee AI (Pty) Ltd");
        expect(t!.objectId).toBe("Apex Solutions (Pty) Ltd");
        expect((t!.scalarValue as Record<string, unknown>)["status"]).toBe("OUTSTANDING");
    });

    it("INVOICE_LINE_ITEMS emitted with count 2", () => {
        const t = tokens.find((t) => t.eventType === "INVOICE_LINE_ITEMS");
        expect(t).toBeDefined();
        expect((t!.scalarValue as Record<string, unknown>)["count"]).toBe(2);
    });

    it("all tokens have non-empty sourceRefs from document-service", () => {
        tokens.forEach((t) => {
            expect(t.sourceRefs.length).toBeGreaterThan(0);
            expect(t.sourceRefs[0].evidenceId).toMatch(/^ev_/);
            expect(t.sourceRefs[0].sourceSystem).toBe("orgni.document-service");
        });
    });

    it("all tokens have confidence in [0, 1]", () => {
        tokens.forEach((t) => {
            expect(t.confidence).toBeGreaterThanOrEqual(0);
            expect(t.confidence).toBeLessThanOrEqual(1);
        });
    });

    it("all tokens carry tenantId and retentionClass", () => {
        tokens.forEach((t) => {
            expect(t.tenantId).toBe("tenant_olyxee");
            expect(t.retentionClass).toBe("financial");
        });
    });
});

describe("mapInvoiceToTokens — partial invoice (no line items)", () => {
    const tokens = mapInvoiceToTokens(partial);

    it("emits only 2 tokens when lineItems is empty", () => {
        expect(tokens).toHaveLength(2);
    });

    it("does NOT emit INVOICE_LINE_ITEMS token", () => {
        expect(tokens.find((t) => t.eventType === "INVOICE_LINE_ITEMS")).toBeUndefined();
    });

    it("confidence reflects the weakest field (0.72)", () => {
        const t = tokens.find((t) => t.eventType === "INVOICE_ISSUED");
        expect(t!.confidence).toBeCloseTo(0.72, 5);
    });
});