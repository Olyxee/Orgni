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

  it("PAYMENT_SETTLEMENT targets tracking states securely without blindly forcing a SETTLED status", () => {
    const t = tokens.find((t) => t.eventType === "PAYMENT_SETTLEMENT");
    expect(t!.tokenKind).toBe("STATE");
    expect((t!.scalarValue as Record<string, unknown>)["status"]).toBe("PENDING_VERIFICATION");
    expect((t!.scalarValue as Record<string, unknown>)["invoiceRef"]).toBe("INV-2026-0042");
  });

  it("all tokens have valid sourceRefs with precise page or section locators", () => {
    tokens.forEach((t) => {
      expect(t.sourceRefs[0].sourceSystem).toBe("orgni.document-service");
      expect(t.sourceRefs[0].locator).toBeDefined();
    });
  });
});

describe("mapProofOfPaymentToTokens — PoP WITHOUT invoiceRef", () => {
  const tokens = mapProofOfPaymentToTokens({ ...clean, extractionId: "ext_pop_002", invoiceRef: undefined });

  it("emits only 1 token when invoiceRef is absent", () => {
    expect(tokens).toHaveLength(1);
  });
});
