/**
 * Evidence retrieval — keyword extraction, matching, and relevance ranking.
 *
 * Pure functions that turn a user question into scored, bounded evidence lines
 * with source attribution. The retrieval query is always tenant-scoped — the
 * caller passes a tenantId from the authenticated session, and every database
 * read is filtered by it.
 *
 * No vector databases, no embeddings, no graph lookups: bounded keyword and
 * entity matching over the JSONB token payloads already persisted.
 */

import type { Repository } from "@workspace/db/repository";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

export interface EvidenceRetrievalLimits {
  /** Maximum evidence records returned. */
  maxResults: number;
  /** Maximum total characters across all context lines. */
  maxTotalChars: number;
  /** Maximum characters for a single context line. */
  maxLineChars: number;
}

export const DEFAULT_LIMITS: EvidenceRetrievalLimits = {
  maxResults: 10,
  maxTotalChars: 3000,
  maxLineChars: 300,
};

/* ------------------------------------------------------------------ */
/* Keyword extraction                                                  */
/* ------------------------------------------------------------------ */

/**
 * Common English stop-words that add noise to evidence matching.
 * Kept small and intentional — a missing stop-word is a minor relevance
 * penalty, but a falsely-removed business term is a missed match.
 */
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "can", "shall", "not", "no",
  "what", "which", "who", "whom", "when", "where", "why", "how",
  "this", "that", "these", "those", "it", "its",
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "they", "them",
  "about", "into", "through", "during", "before", "after", "above", "below",
  "between", "up", "down", "out", "off", "over", "under", "again", "further",
  "then", "once", "here", "there", "all", "each", "every", "both", "few",
  "more", "most", "other", "some", "such", "only", "own", "same", "so",
  "than", "too", "very", "just", "if", "because", "as", "until", "while",
  "tell", "show", "find", "get", "give", "know", "think", "see", "look",
  "make", "go", "us", "let", "need", "want", "much", "many", "any",
]);

/**
 * Business-identifier patterns. These get high weight because they are
 * unambiguous references to specific documents or entities.
 */
const BUSINESS_ID_PATTERNS = [
  /\b(CI-\d[\w-]*)\b/gi,          // Customer invoice
  /\b(SI-[\w-]+)\b/gi,            // Supplier invoice
  /\b(PO-\d[\w-]*)\b/gi,          // Purchase order
  /\b(DN-\d[\w-]*)\b/gi,          // Delivery note
  /\b(RA-\d[\w-]*)\b/gi,          // Remittance advice
  /\b(GRN-\d[\w-]*)\b/gi,         // Goods received note
  /\b(SO-\d[\w-]*)\b/gi,          // Sales order
  /\b(EMP-\d+)\b/gi,              // Employee ID
  /\b(AST-[\w-]+)\b/gi,           // Asset ID
  /\b(CUST-\d+)\b/gi,             // Customer ID
  /\b(SUP-\d+)\b/gi,              // Supplier ID
  /\b(SLA-[\w-]+)\b/gi,           // SLA reference
  /\b(NDA-[\w-]+)\b/gi,           // NDA reference
  /\b(PRJ-[\w-]+)\b/gi,           // Project reference
  /\b(PROD-\d+)\b/gi,             // Product ID
  /\b(VFS-INV-\d+)\b/gi,          // Vendor invoice
  /\b(BR-[\w-]+)\b/gi,            // Board resolution
];

export interface ExtractedKeywords {
  /** General terms (lowercased, de-duped). */
  terms: string[];
  /** Business identifiers found in the text (original case preserved). */
  identifiers: string[];
}

/**
 * Extract meaningful keywords and business identifiers from a question.
 *
 * Returns de-duplicated terms suitable for matching against token payloads.
 * Empty or whitespace-only input returns empty arrays — never throws.
 */
export function extractKeywords(question: string): ExtractedKeywords {
  if (!question || !question.trim()) {
    return { terms: [], identifiers: [] };
  }

  // 1. Extract business identifiers before normalisation (they have structure).
  const identifiers: string[] = [];
  for (const pattern of BUSINESS_ID_PATTERNS) {
    // Reset lastIndex for global patterns.
    pattern.lastIndex = 0;
    for (const match of question.matchAll(pattern)) {
      identifiers.push(match[1]!.toUpperCase());
    }
  }
  const identifierSet = new Set(identifiers);

  // 2. Normalise and tokenise the remaining text.
  const normalised = question.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
  const words = normalised
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  // De-duplicate, excluding words that are just a lowered form of an identifier.
  const termSet = new Set<string>();
  for (const word of words) {
    if (!identifierSet.has(word.toUpperCase())) {
      termSet.add(word);
    }
  }

  return {
    terms: [...termSet],
    identifiers: [...identifierSet],
  };
}

/* ------------------------------------------------------------------ */
/* Token matching and scoring                                          */
/* ------------------------------------------------------------------ */

type Json = Record<string, unknown>;

/**
 * Recursively collect all string values from a JSON-like object.
 * Used to build a searchable text bag from a token's payload.
 */
function collectStrings(value: unknown, bag: string[]): void {
  if (typeof value === "string") {
    bag.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, bag);
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const v of Object.values(value)) collectStrings(v, bag);
  }
}

/**
 * Build a single lowercased search string from the searchable fields of a
 * token. This avoids scanning the full JSONB blob — only fields that carry
 * meaningful business content are included.
 */
function tokenSearchText(token: Json): string {
  const parts: string[] = [];

  // Direct fields
  if (typeof token["subjectId"] === "string") parts.push(token["subjectId"]);
  if (typeof token["objectId"] === "string") parts.push(token["objectId"]);
  if (typeof token["predicate"] === "string") parts.push(token["predicate"]);
  if (typeof token["eventType"] === "string") parts.push(token["eventType"]);
  if (typeof token["tokenKind"] === "string") parts.push(token["tokenKind"]);

  // Scalar value (the richest field)
  if (token["scalarValue"] != null) {
    collectStrings(token["scalarValue"], parts);
  }

  // Source reference excerpts
  if (Array.isArray(token["sourceRefs"])) {
    for (const ref of token["sourceRefs"]) {
      if (typeof ref === "object" && ref !== null) {
        const r = ref as Json;
        if (typeof r["excerpt"] === "string") parts.push(r["excerpt"]);
      }
    }
  }

  return parts.join(" ").toLowerCase();
}

/** Score a token against the extracted keywords. Higher = more relevant. */
function scoreToken(
  searchText: string,
  keywords: ExtractedKeywords,
): number {
  let score = 0;

  // Business identifiers get a heavy weight — they are unambiguous.
  for (const id of keywords.identifiers) {
    if (searchText.includes(id.toLowerCase())) {
      score += 10;
    }
  }

  // General terms get a lighter weight.
  for (const term of keywords.terms) {
    if (searchText.includes(term)) {
      score += 1;
    }
  }

  return score;
}

/* ------------------------------------------------------------------ */
/* Evidence result types                                                */
/* ------------------------------------------------------------------ */

export interface EvidenceMatch {
  /** The token payload. */
  token: Json;
  /** Source document ID. */
  sourceId: string;
  /** Relevance score (higher = better). */
  score: number;
  /** The token's own confidence (0–1). */
  confidence: number;
}

export interface EvidenceResult {
  /** Matched evidence, ordered by relevance (highest first). */
  matches: EvidenceMatch[];
  /** Pre-formatted context lines for the intelligence provider. */
  contextLines: string[];
  /** Source references for attribution (de-duplicated). */
  sourcesUsed: Array<{ sourceId: string; filename: string }>;
  /** Number of tokens considered. */
  totalConsidered: number;
}

/* ------------------------------------------------------------------ */
/* Context line formatting                                             */
/* ------------------------------------------------------------------ */

/**
 * Format a matched token as a human-readable context line with source
 * attribution. The format is designed for consumption by the intelligence
 * provider (both template and Anthropic).
 */
function formatContextLine(match: EvidenceMatch, filename: string, maxChars: number): string {
  const token = match.token;
  const kind = String(token["tokenKind"] ?? "").toLowerCase();
  const subject = String(token["subjectId"] ?? "");
  const confidence = typeof token["confidence"] === "number" ? token["confidence"] : 0;

  let detail = "";
  const scalar = token["scalarValue"];

  if (kind === "entity" && typeof scalar === "object" && scalar !== null) {
    const sv = scalar as Json;
    const entityType = String(sv["entityType"] ?? "");
    const name = String(sv["canonicalName"] ?? subject);
    detail = `${entityType} "${name}"`;
  } else if (kind === "relation") {
    const predicate = String(token["predicate"] ?? "RELATED_TO");
    const object = String(token["objectId"] ?? "");
    detail = `${subject} ${predicate} ${object}`;
  } else if (kind === "policy" && typeof scalar === "object" && scalar !== null) {
    const sv = scalar as Json;
    detail = String(sv["rule"] ?? sv["clause"] ?? subject);
  } else if (kind === "state") {
    const eventType = String(token["eventType"] ?? "");
    if (typeof scalar === "object" && scalar !== null) {
      const sv = scalar as Json;
      if (sv["scenario"]) {
        detail = `${eventType}: ${String(sv["scenario"])}`;
      } else if (sv["value"] !== undefined) {
        const currency = sv["currency"] ? ` ${sv["currency"]}` : "";
        detail = `${eventType} ${subject}: ${sv["value"]}${currency}`;
      } else {
        detail = `${eventType}: ${subject}`;
      }
    } else {
      detail = `${eventType}: ${subject}`;
    }
  } else if (kind === "event") {
    const eventType = String(token["eventType"] ?? "");
    detail = `${eventType}: ${subject}`;
  } else {
    // Fallback: use the first source excerpt if available.
    const refs = token["sourceRefs"];
    if (Array.isArray(refs) && refs.length > 0) {
      const ref = refs[0] as Json;
      detail = String(ref["excerpt"] ?? subject ?? "");
    } else {
      detail = subject || "evidence";
    }
  }

  const confStr = confidence > 0 ? ` (${Math.round(confidence * 100)}%)` : "";
  const line = `[${filename}] ${detail}${confStr}`;
  return line.length > maxChars ? line.slice(0, maxChars - 1) + "…" : line;
}

/* ------------------------------------------------------------------ */
/* Main search function                                                */
/* ------------------------------------------------------------------ */

/**
 * Search a tenant's persisted evidence for tokens matching the given question.
 *
 * Always tenant-scoped: `tenantId` comes from the authenticated session and is
 * passed through to `repository.listTenantTokens()`, which scopes its query
 * with `WHERE tenant_id = ?`.
 *
 * Returns scored, bounded, source-attributed evidence. An empty question, no
 * matches, or any error returns an empty result — never throws.
 */
export async function searchTenantEvidence(
  repository: Repository,
  tenantId: string,
  question: string,
  limits: Partial<EvidenceRetrievalLimits> = {},
): Promise<EvidenceResult> {
  const cfg = { ...DEFAULT_LIMITS, ...limits };
  const empty: EvidenceResult = {
    matches: [],
    contextLines: [],
    sourcesUsed: [],
    totalConsidered: 0,
  };

  const keywords = extractKeywords(question);
  if (keywords.terms.length === 0 && keywords.identifiers.length === 0) {
    return empty;
  }

  // Load all tokens for this tenant. The repository method is already
  // tenant-scoped (WHERE tenant_id = ?).
  let allTokens: Array<{ sourceId: string; token: Json }>;
  try {
    allTokens = await repository.listTenantTokens(tenantId);
  } catch {
    return empty;
  }

  if (allTokens.length === 0) return { ...empty, totalConsidered: 0 };

  // Score each token.
  const scored: Array<EvidenceMatch> = [];
  for (const row of allTokens) {
    const searchText = tokenSearchText(row.token);
    const score = scoreToken(searchText, keywords);
    if (score > 0) {
      scored.push({
        token: row.token,
        sourceId: row.sourceId,
        score,
        confidence: typeof row.token["confidence"] === "number" ? row.token["confidence"] : 0,
      });
    }
  }

  // Rank by score descending, then by confidence descending.
  scored.sort((a, b) => b.score - a.score || b.confidence - a.confidence);

  // Apply result count limit.
  const topMatches = scored.slice(0, cfg.maxResults);

  // We need filenames for source attribution. Load sources and build a map.
  const sourceIds = [...new Set(topMatches.map((m) => m.sourceId))];
  const filenameMap = new Map<string, string>();

  // Use listSources to get filenames (tenant-scoped).
  try {
    const sources = await repository.listSources(tenantId, 1000);
    for (const s of sources) {
      if (sourceIds.includes(s.sourceId)) {
        filenameMap.set(s.sourceId, s.filename);
      }
    }
  } catch {
    // If source lookup fails, we still have evidence — just without filenames.
  }

  // Format context lines with bounded total size.
  const contextLines: string[] = [];
  let totalChars = 0;
  const usedMatches: EvidenceMatch[] = [];

  for (const match of topMatches) {
    const filename = filenameMap.get(match.sourceId) ?? "unknown";
    const line = formatContextLine(match, filename, cfg.maxLineChars);
    if (totalChars + line.length > cfg.maxTotalChars) break;
    contextLines.push(line);
    totalChars += line.length;
    usedMatches.push(match);
  }

  // De-duplicate sources for attribution.
  const seenSources = new Map<string, string>();
  for (const match of usedMatches) {
    if (!seenSources.has(match.sourceId)) {
      seenSources.set(
        match.sourceId,
        filenameMap.get(match.sourceId) ?? "unknown",
      );
    }
  }

  return {
    matches: usedMatches,
    contextLines,
    sourcesUsed: [...seenSources.entries()].map(([sourceId, filename]) => ({
      sourceId,
      filename,
    })),
    totalConsidered: allTokens.length,
  };
}
