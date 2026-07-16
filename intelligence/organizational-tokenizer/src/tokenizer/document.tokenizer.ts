/**
 * Orgni Organizational Tokenizer — Document Tokenizer (main dispatcher)
 * schema_version: "0.1.0"
 *
 * Single entry point for all document-sourced tokenization.
 * Pure and synchronous — no I/O, no external calls, no state mutation.
 */

import type { OrganizationalToken } from "@workspace/schemas";
import type { InvoiceExtraction } from "../envelopes/invoice.js";
import type { ProofOfPaymentExtraction } from "../envelopes/proof_of_payment.js";
import type { ContractExtraction } from "../envelopes/contract.js";
import { mapInvoiceToTokens } from "../mappings/invoice.mapper.js";
import { mapProofOfPaymentToTokens } from "../mappings/proof_of_payment.mapper.js";
import { mapContractToTokens } from "../mappings/contract.mapper.js";
import { validateTokens } from "../validators/token.validator.js";

export type DocumentExtraction =
    | InvoiceExtraction
    | ProofOfPaymentExtraction
    | ContractExtraction;

export interface DocumentTokenizerResult {
    extractionId: string;
    tenantId: string;
    documentType: string;
    tokens: OrganizationalToken[];
    tokenCount: number;
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export function tokenizeDocument(extraction: DocumentExtraction): DocumentTokenizerResult {
    let tokens: OrganizationalToken[];

    switch (extraction.documentType) {
        case "INVOICE":
            tokens = mapInvoiceToTokens(extraction);
            break;
        case "PROOF_OF_PAYMENT":
            tokens = mapProofOfPaymentToTokens(extraction);
            break;
        case "CONTRACT":
            tokens = mapContractToTokens(extraction);
            break;
        default: {
            const _exhaustive: never = extraction;
            throw new Error(
                `Unsupported documentType: ${(_exhaustive as DocumentExtraction).documentType}`,
            );
        }
    }

    const validation = validateTokens(tokens);

    return {
        extractionId: extraction.extractionId,
        tenantId: extraction.tenantId,
        documentType: extraction.documentType,
        tokens,
        tokenCount: tokens.length,
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
    };
}