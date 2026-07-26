/**
 * Orgni Organizational Tokenizer — Contract Mapper
 * schema_version: "0.1.0"
 */
import type { OrganizationalToken } from "@workspace/contracts";
import { clampConfidence } from "@workspace/contracts";
import type { ContractExtraction } from "../envelopes/contract.js";
import { minConfidence, buildSourceRef, getStableTimestamp } from "./helpers.js";

export function mapContractToTokens(env: ContractExtraction): OrganizationalToken[] {
  const stableNow = getStableTimestamp(env);
  const tokens: OrganizationalToken[] = [];
  const primaryParty = env.parties?.[0]?.name?.value ?? "UNKNOWN";

  // ── Token 1: CONTRACT_EXECUTED ───────────────────────────────────────────
  const hasExecutionConfirmation = !!(env.signedDate?.value || (env as any).isExecuted?.value);

  if (hasExecutionConfirmation) {
    tokens.push({
      tokenId: `tok_${env.extractionId}_contract_executed`,
      tenantId: env.tenantId,
      tokenKind: "EVENT",
      eventType: "CONTRACT_EXECUTED",
      subjectId: primaryParty,
      validTime: {
        from: env.effectiveDate.value,
        ...(env.expiryDate ? { to: env.expiryDate.value } : {}),
      },
      transactionTime: stableNow,
      scalarValue: {
        contractType: env.contractType.value,
        ...(env.title ? { title: env.title.value } : {}),
        parties: env.parties.map((p: any) => ({
          name: p.name.value,
          role: p.role.value,
          ...(p.registrationNumber ? { registrationNumber: p.registrationNumber.value } : {}),
          ...(p.jurisdiction ? { jurisdiction: p.jurisdiction.value } : {}),
        })),
        ...(env.contractValue ? { contractValue: env.contractValue.value, currency: env.currency?.value } : {}),
        ...(env.governingLaw ? { governingLaw: env.governingLaw.value } : {}),
        ...(env.signedDate ? { signedDate: env.signedDate.value } : {}),
        ...(env.autoRenewal ? { autoRenewal: env.autoRenewal.value } : {}),
      },
      sourceRefs: [buildSourceRef(env as any, 1, "signature-block")],
      confidence: clampConfidence(
        minConfidence(env.contractType.confidence, env.effectiveDate.confidence),
      ),
      epistemicStatus: "OBSERVED",
      visibility: [],
      actionScope: ["legal", "contracts"],
      retentionClass: "legal",
      payloadRef: env.documentRef,
    });
  }

  // ── Tokens 2+: CONTRACT_COUNTERPARTY ─────────────────────────────────────
  for (let i = 0; i < env.parties.length; i++) {
    for (let j = i + 1; j < env.parties.length; j++) {
      const a = env.parties[i];
      const b = env.parties[j];
      tokens.push({
        tokenId: `tok_${env.extractionId}_relation_${i}_${j}`,
        tenantId: env.tenantId,
        tokenKind: "RELATION",
        subjectId: a.name.value,
        predicate: "CONTRACT_COUNTERPARTY",
        objectId: b.name.value,
        validTime: {
          from: env.effectiveDate.value,
          ...(env.expiryDate ? { to: env.expiryDate.value } : {}),
        },
        transactionTime: stableNow,
        scalarValue: {
          contractType: env.contractType.value,
          subjectRole: a.role.value,
          objectRole: b.role.value,
        },
        sourceRefs: [buildSourceRef(env as any, 1, `preamble-parties-${i}-${j}`)],
        confidence: clampConfidence(minConfidence(a.name.confidence, b.name.confidence)),
        epistemicStatus: "OBSERVED",
        visibility: [],
        actionScope: ["legal"],
        retentionClass: "legal",
        payloadRef: env.documentRef,
      });
    }
  }

  // ── Policy: CONTRACT_TERMINATION_TERMS ───────────────────────────────────
  if (env.terminationClause) {
    tokens.push({
      tokenId: `tok_${env.extractionId}_termination_policy`,
      tenantId: env.tenantId,
      tokenKind: "POLICY",
      eventType: "CONTRACT_TERMINATION_TERMS",
      transactionTime: stableNow,
      scalarValue: {
        clause: env.terminationClause.value,
        ...(env.noticePeriodDays ? { noticePeriodDays: env.noticePeriodDays.value } : {}),
        ...(env.autoRenewal ? { autoRenewal: env.autoRenewal.value } : {}),
      },
      sourceRefs: [buildSourceRef(env as any, 2, "termination-section")],
      confidence: clampConfidence(env.terminationClause.confidence),
      epistemicStatus: "OBSERVED",
      visibility: [],
      actionScope: ["legal"],
      retentionClass: "legal",
      payloadRef: env.documentRef,
    });
  }

  // ── Policy: CONTRACT_CONFIDENTIALITY_TERMS ───────────────────────────────
  if (env.confidentialityClause) {
    tokens.push({
      tokenId: `tok_${env.extractionId}_confidentiality_policy`,
      tenantId: env.tenantId,
      tokenKind: "POLICY",
      eventType: "CONTRACT_CONFIDENTIALITY_TERMS",
      transactionTime: stableNow,
      scalarValue: { clause: env.confidentialityClause.value },
      sourceRefs: [buildSourceRef(env as any, 2, "confidentiality-section")],
      confidence: clampConfidence(env.confidentialityClause.confidence),
      epistemicStatus: "OBSERVED",
      visibility: [],
      actionScope: ["legal"],
      retentionClass: "legal",
      payloadRef: env.documentRef,
    });
  }

  return tokens;
}
