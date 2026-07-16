/**
 * Orgni Organizational Tokenizer — Proof of Payment Mapper
 * schema_version: "0.1.0"
 *
 * Tokens produced:
 *   1. PAYMENT_MADE       (EVENT) — the act of transferring funds
 *   2. PAYMENT_SETTLEMENT (STATE) — obligation settled, only if invoiceRef present
 */

import type { OrganizationalToken } from "@workspace/schemas";
import { clampConfidence } from "@workspace/schemas";
import type { ProofOfPaymentExtraction } from "../envelopes/proof_of_payment.js";
import { minConfidence, buildSourceRef } from "./helpers.js";

export function mapProofOfPaymentToTokens(
    env: ProofOfPaymentExtraction,
): OrganizationalToken[] {
    const now = new Date().toISOString();
    const sourceRef = buildSourceRef(env);
    const tokens: OrganizationalToken[] = [];

    // ── Token 1: PAYMENT_MADE ────────────────────────────────────────────────
    tokens.push({
        tokenId: `tok_${env.extractionId}_payment_made`,
        tenantId: env.tenantId,
        tokenKind: "EVENT",
        eventType: "PAYMENT_MADE",
        subjectId: env.payerName.value,
        objectId: env.payeeName.value,
        validTime: { from: env.paymentDate.value },
        transactionTime: now,
        scalarValue: {
            referenceNumber: env.referenceNumber.value,
            amount: env.amount.value,
            currency: env.currency.value,
            method: env.paymentMethod.value,
            ...(env.payerAccountRef ? { payerAccountRef: env.payerAccountRef.value } : {}),
            ...(env.payeeAccountRef ? { payeeAccountRef: env.payeeAccountRef.value } : {}),
            ...(env.invoiceRef ? { invoiceRef: env.invoiceRef.value } : {}),
            ...(env.bankRef ? { bankRef: env.bankRef.value } : {}),
        },
        sourceRefs: [sourceRef],
        confidence: clampConfidence(
            minConfidence(
                env.referenceNumber.confidence,
                env.amount.confidence,
                env.payerName.confidence,
                env.payeeName.confidence,
                env.paymentDate.confidence,
            ),
        ),
        epistemicStatus: "OBSERVED",
        visibility: [],
        actionScope: ["finance", "accounts-payable"],
        retentionClass: "financial",
        payloadRef: env.documentRef,
    });

    // ── Token 2: PAYMENT_SETTLEMENT — only if invoiceRef present ─────────────
    if (env.invoiceRef) {
        tokens.push({
            tokenId: `tok_${env.extractionId}_payment_settlement`,
            tenantId: env.tenantId,
            tokenKind: "STATE",
            eventType: "PAYMENT_SETTLEMENT",
            subjectId: env.payerName.value,
            objectId: env.payeeName.value,
            validTime: { from: env.paymentDate.value },
            transactionTime: now,
            scalarValue: {
                invoiceRef: env.invoiceRef.value,
                amount: env.amount.value,
                currency: env.currency.value,
                method: env.paymentMethod.value,
                status: "SETTLED",
            },
            sourceRefs: [sourceRef],
            confidence: clampConfidence(
                minConfidence(env.invoiceRef.confidence, env.amount.confidence),
            ),
            epistemicStatus: "ASSERTED",
            visibility: [],
            actionScope: ["finance", "accounts-payable"],
            retentionClass: "financial",
            payloadRef: env.documentRef,
        });
    }

    return tokens;
}