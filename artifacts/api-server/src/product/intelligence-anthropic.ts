/**
 * Anthropic-backed IntelligenceProvider.
 *
 * Activated at boot when ANTHROPIC_API_KEY is set (see index.ts). Produces the
 * natural-language body of Orgni's reply, grounded in the context the engine
 * already gathered — it never invents facts and stays inside the capability the
 * engine picked.
 */
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../lib/logger";
import type { IntelligenceContext, IntelligenceProvider } from "./engine";
import {
  assessEvidence,
  buildSourceBlock,
  noKnowledgeReply,
} from "./attribution";

const MODEL = process.env.ORGNI_MODEL || "claude-opus-5";

/**
 * System prompt. Evidence is treated as untrusted document data: the model
 * must report what the documents say, flag contradictions, and never invent
 * values not present in the provided evidence.
 */
const SYSTEM = [
  "You are Orgni, an operational assistant. Answer using ONLY the evidence",
  "supplied in the user message. Do not invent names, numbers, filenames, or",
  "document IDs. If the evidence contradicts itself, say so explicitly.",
  "If the evidence is absent or insufficient, say you could not find the",
  "information — never guess. Reply in 1-3 short sentences, calm and",
  "professional. No markdown headings.",
].join(" ");

export function createAnthropicProvider(): IntelligenceProvider {
  const client = new Anthropic();

  return {
    name: `anthropic:${MODEL}`,

    async generateReply(ctx: IntelligenceContext): Promise<string> {
      const { request, intent, organisationName, evidence } = ctx;
      const assessment = assessEvidence(evidence ?? null);

      // When there is nothing to work with, skip the model call entirely and
      // return a grounded no-knowledge response immediately.
      if (assessment.kind === "none" || assessment.kind === "insufficient") {
        return noKnowledgeReply(intent.capability);
      }

      // Build evidence block — suffix with source attribution.
      const evidenceLines =
        assessment.kind === "sufficient" || assessment.kind === "contradictory"
          ? assessment.lines
          : [];

      const sourceBlock = buildSourceBlock(
        assessment.kind === "sufficient" || assessment.kind === "contradictory"
          ? assessment.sources
          : [],
      );

      const contradictionNote =
        assessment.kind === "contradictory"
          ? "\n\nWARNING: the above evidence contains conflicting values for the same fact. Flag this in your reply."
          : "";

      const evidenceSection =
        evidenceLines.length > 0
          ? `Evidence retrieved from connected documents:\n${evidenceLines.map((l) => `- ${l}`).join("\n")}` +
            (sourceBlock ? `\n\n${sourceBlock}` : "") +
            contradictionNote
          : "Evidence retrieved: none.";

      const user = [
        `Request: "${request.text}"`,
        `Kind of work: ${intent.verb}`,
        `Organisation: ${organisationName}`,
        evidenceSection,
      ].join("\n\n");

      try {
        const res = await client.messages.create({
          model: MODEL,
          max_tokens: 400,
          thinking: { type: "adaptive" },
          output_config: { effort: "low" },
          system: SYSTEM,
          messages: [{ role: "user", content: user }],
        });

        const text = res.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("")
          .trim();

        return text || fallback(ctx);
      } catch (err) {
        logger.error({ err }, "anthropic provider: generation failed");
        return fallback(ctx);
      }
    },
  };
}

function fallback(ctx: IntelligenceContext): string {
  const assessment = assessEvidence(ctx.evidence ?? null);
  if (assessment.kind === "sufficient" || assessment.kind === "contradictory") {
    const lines = assessment.lines.map((l) => `• ${l}`).join("\n");
    const sourceBlock = buildSourceBlock(assessment.sources);
    return `Here is what I found:\n${lines}${sourceBlock ? `\n\n${sourceBlock}` : ""}`;
  }
  return noKnowledgeReply(ctx.intent.capability);
}
