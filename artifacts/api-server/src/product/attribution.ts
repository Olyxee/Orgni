/**
 * Source attribution and no-knowledge handling.
 *
 * All logic for:
 *   - Detecting whether retrieved evidence actually supports an answer.
 *   - Spotting potential contradictions across sources.
 *   - Formatting a grounded reply with source filenames.
 *   - Generating safe no-knowledge responses when evidence is absent or
 *     insufficient.
 *
 * Pure functions — no I/O, no provider calls.
 */

import type { EvidenceResult } from "../lib/evidence";

/* ------------------------------------------------------------------ */
/* Evidence assessment                                                 */
/* ------------------------------------------------------------------ */

export type EvidenceAssessment =
  | { kind: "sufficient"; lines: string[]; sources: string[] }
  | { kind: "insufficient" }
  | { kind: "contradictory"; lines: string[]; sources: string[] }
  | { kind: "none" };

/**
 * The minimum relevance score a token must have to be considered
 * "sufficient" for attribution. Lower-scored tokens may have matched
 * on a stop-word that slipped through; we do not cite them.
 */
const MIN_ATTRIBUTION_SCORE = 1;

/**
 * Assess the evidence result and classify it for the provider.
 *
 * Rules:
 * - No matches at all            → kind: "none"
 * - All matches below min score  → kind: "insufficient"
 * - Multiple sources give values that disagree on the same eventType
 *   for the same subject         → kind: "contradictory"
 * - Otherwise                    → kind: "sufficient"
 */
export function assessEvidence(evidence: EvidenceResult | null | undefined): EvidenceAssessment {
  if (!evidence || evidence.matches.length === 0) {
    return { kind: "none" };
  }

  const qualifying = evidence.matches.filter((m) => m.score >= MIN_ATTRIBUTION_SCORE);
  if (qualifying.length === 0) {
    return { kind: "insufficient" };
  }

  // Contradiction check: same (eventType, subjectId) appearing in more than
  // one distinct source with different scalar values.
  const valueMap = new Map<string, { value: unknown; sourceId: string }>();
  let contradictionDetected = false;

  for (const m of qualifying) {
    const tok = m.token as Record<string, unknown>;
    const eventType = typeof tok["eventType"] === "string" ? tok["eventType"] : null;
    const subjectId = typeof tok["subjectId"] === "string" ? tok["subjectId"] : null;
    if (!eventType || !subjectId) continue;

    const key = `${eventType}::${subjectId}`;
    const scalar = tok["scalarValue"];
    if (scalar === undefined || scalar === null) continue;

    const existing = valueMap.get(key);
    if (!existing) {
      valueMap.set(key, { value: scalar, sourceId: m.sourceId });
    } else if (
      existing.sourceId !== m.sourceId &&
      JSON.stringify(existing.value) !== JSON.stringify(scalar)
    ) {
      contradictionDetected = true;
      break;
    }
  }

  const lines = evidence.contextLines;
  const sources = evidence.sourcesUsed.map((s) => s.filename);

  if (contradictionDetected) {
    return { kind: "contradictory", lines, sources };
  }

  return { kind: "sufficient", lines, sources };
}

/* ------------------------------------------------------------------ */
/* Reply composition                                                   */
/* ------------------------------------------------------------------ */

export interface AttributionOptions {
  capability: string;
  organisationName: string;
}

/**
 * Compose a grounded natural-language reply from an evidence assessment.
 *
 * - "sufficient"    → answer body + "Sources:" attribution block
 * - "contradictory" → shows what was found, flags the conflict
 * - "insufficient"  → no-knowledge message (evidence exists but doesn't help)
 * - "none"          → no-knowledge message (nothing found at all)
 *
 * Never invents filenames, document IDs, or values not present in the
 * assessment.
 */
export function composeAttributedReply(
  assessment: EvidenceAssessment,
  opts: AttributionOptions,
): string {
  switch (assessment.kind) {
    case "sufficient": {
      const evidenceBlock = assessment.lines.map((l) => `  • ${l}`).join("\n");
      const sourceBlock = buildSourceBlock(assessment.sources);
      return `Based on connected documents:\n\n${evidenceBlock}\n\n${sourceBlock}`;
    }

    case "contradictory": {
      const evidenceBlock = assessment.lines.map((l) => `  • ${l}`).join("\n");
      const sourceBlock = buildSourceBlock(assessment.sources);
      return (
        `I found relevant information but the connected documents don't fully agree on this.\n\n` +
        `What I found:\n\n${evidenceBlock}\n\n` +
        `${sourceBlock}\n\n` +
        `Please verify the correct value directly in those documents before acting on it.`
      );
    }

    case "insufficient":
      return (
        `I found some related documents, but they don't contain a clear answer to your question. ` +
        `Try asking about a specific document reference, amount, or date.`
      );

    case "none":
    default:
      return noKnowledgeReply(opts.capability);
  }
}

/**
 * Format a source attribution block from a list of filenames.
 * Returns an empty string for an empty list so callers don't render
 * a "Sources:" heading with nothing underneath.
 */
export function buildSourceBlock(filenames: string[]): string {
  // Filter out placeholder filenames — never cite "unknown"
  const real = filenames.filter((f) => f && f !== "unknown");
  if (real.length === 0) return "";
  const list = real.map((f) => `  • ${f}`).join("\n");
  return `Sources:\n${list}`;
}

/**
 * Produce a capability-appropriate no-knowledge response.
 * Does not mention any document, filename, or value.
 */
export function noKnowledgeReply(capability: string): string {
  switch (capability) {
    case "find_documents":
      return (
        "I couldn't find a document matching that in the connected workspace. " +
        "Check that the file has been uploaded and processed."
      );
    case "answer_questions":
      return (
        "I couldn't find information to answer that in the connected documents. " +
        "Once the relevant files are uploaded and processed, I'll be able to help."
      );
    case "financial_actions":
      return (
        "I couldn't locate the relevant financial record in the connected documents. " +
        "Please check the document has been uploaded and processed."
      );
    default:
      return (
        "I don't have enough information in the connected documents to do that confidently. " +
        "Once the relevant files are uploaded and processed, I'll be able to help."
      );
  }
}
