import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mapProofOfPaymentToTokens } from "../src/mappings/proof_of_payment.mapper.js";
import type { ProofOfPaymentExtraction } from "../src/envelopes/proof_of_payment.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadFixture<T>(name: string): T {
    return JSON.parse(readFileSync(resolve(__dirname, "fixtures", name), "utf8")) as T;
}

const clean = loadFixture<ProofOfPaymentExtraction>("pop.clean.json");

describe("mapProofOfPaymentToTokens — complete PoP with invoiceRef", () => {
    const tokens = mapProofOfPaymentToTokens(clean);

    it("emits 2 tokens when invoiceRef is present", () => {
        expect(tokens).toHaveLength(2);
    });

    it("PAYMENT_MADE is an EVENT with correct payer / payee", () => {
        const t = tokens.find((t) => t.eventType === "PAYMENT_MADE");
        expect(t!.tokenKind).toBe("EVENT");
        expect(t!.subjectId).toBe("Olyxee AI (Pty) Ltd");
        expect(t!.objectId).toBe("Apex Solutions (Pty) Ltd");
    });

    it("PAYMENT_MADE carries amount, currency, method, referenceNumber", () => {
        const t = tokens.find((t) => t.eventType === "PAYMENT_MADE");
        expect(t!.scalarValue).toMatchObject({
            amount: 49450,
            currency: "ZAR",
            method: "EFT",
            referenceNumber: "TXN-FNB-20260715-998877",
        });
    });

    it("PAYMENT_SETTLEMENT is a STATE with status SETTLED", () => {
        const t = tokens.find((t) => t.eventType === "PAYMENT_SETTLEMENT");
        expect(t!.tokenKind).toBe("STATE");
        expect((t!.scalarValue as Record<string, unknown>)["status"]).toBe("SETTLED");
        expect((t!.scalarValue as Record<string, unknown>)["invoiceRef"]).toBe("INV-2026-0042");
    });

    it("all tokens have valid sourceRefs", () => {
        tokens.forEach((t) => {
            expect(t.sourceRefs[0].sourceSystem).toBe("orgni.document-service");
        });
    });

    it("all tokens have confidence in [0, 1]", () => {
        tokens.forEach((t) => {
            expect(t.confidence).toBeGreaterThanOrEqual(0);
            expect(t.confidence).toBeLessThanOrEqual(1);
        });
    });
});

describe("mapProofOfPaymentToTokens — PoP WITHOUT invoiceRef", () => {
    const tokens = mapProofOfPaymentToTokens({ ...clean, extractionId: "ext_pop_002", invoiceRef: undefined });

    it("emits only 1 token when invoiceRef is absent", () => {
        expect(tokens).toHaveLength(1);
    });

    it("does NOT emit PAYMENT_SETTLEMENT token", () => {
        expect(tokens.find((t) => t.eventType === "PAYMENT_SETTLEMENT")).toBeUndefined();
    });
});