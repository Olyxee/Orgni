/**
 * Knowledge-aware retrieval for the Orgni engine.
 *
 * Queries the knowledge_facts table for structured facts that match the
 * entity and attribute terms found in a user question.  Returns both a
 * list of human-readable citation lines (for contextLines) and a typed
 * StructuredEvidence object so providers can reason over the data precisely.
 *
 * Design constraints:
 *  - Never invents missing values, sources, or dates.
 *  - Never silently picks a winner when facts conflict.
 *  - Every citation identifies the original source document, worksheet,
 *    row, and cell reference when available.
 *  - Strictly tenant-scoped: every query passes tenantId.
 *  - Falls back gracefully when the database is unavailable.
 */

import type { Repository, LinkedFactGroup, KnowledgeFactQueryResult } from "@workspace/db/repository";
import type { KnowledgeFactRow } from "@workspace/db/schema";

// ── Public types ─────────────────────────────────────────────────────────────

/** One structured fact item returned to the provider. */
export interface KnowledgeEvidenceItem {
  /** Entity name as stored (e.g. "Medium Duty Truck"). */
  entityName: string;
  /** Attribute label (e.g. "Revenue"). */
  attribute: string;
  /** Original string value as extracted from the cell. */
  rawValue: string;
  /** Parsed numeric value, or null. */
  numericValue: number | null;
  /** Source document filename. */
  sourceDocument: string;
  /** Source document ID. */
  sourceId: string;
  /** Worksheet display name, or null. */
  worksheetName: string | null;
  /** 1-based row number, or null. */
  rowNumber: number | null;
  /** Excel cell reference for the value cell (e.g. "D2"), or null. */
  cellRef: string | null;
  /** Excel cell reference for the entity cell (e.g. "A2"), or null. */
  entityCellRef: string | null;
  /** Reporting period as ISO date (e.g. "2026-01-01"), or null. */
  reportingDate: string | null;
  /**
   * How this fact relates to others for the same entity+attribute.
   * Absent when this is the only source (SOLE_SOURCE).
   */
  relationship?: "DUPLICATE_VALUE" | "CONTRADICTORY_VALUE" | "POTENTIALLY_OUTDATED" | "CURRENT_VALUE" | "SOLE_SOURCE";
  /** Human-readable citation string, e.g. "Budget.xlsx → Sales Data → Row 2 → Revenue (D2)". */
  citation: string;
}

/**
 * All structured evidence retrieved for a question.
 * Each entry in `groups` covers one (entityName, attribute) pair.
 */
export interface StructuredEvidence {
  /** Whether any matching facts were found. */
  hasEvidence: boolean;
  /** One group per (entity, attribute) pair that matched the question. */
  groups: LinkedFactGroup[];
  /**
   * Flat list of all evidence items across all groups, with citations.
   * Ordered: sole sources first, then corroborated, then conflicts.
   */
  items: KnowledgeEvidenceItem[];
  /**
   * Whether any conflicting evidence was found (CONTRADICTORY_VALUE or
   * POTENTIALLY_OUTDATED relationships exist in this result set).
   */
  hasConflicts: boolean;
  /**
   * Human-readable lines suitable for passing as contextLines to any
   * IntelligenceProvider.  Each line is self-contained.
   */
  contextLines: string[];
}

// ── Citation formatting ───────────────────────────────────────────────────────

/**
 * Format a human-readable citation for a knowledge fact.
 *
 * Format: "Filename → Worksheet → Row N → Attribute (CellRef)"
 *
 * Missing parts are omitted rather than fabricated.
 *
 * Examples:
 *   "Budget.xlsx → Sales Data → Row 2 → Revenue (D2)"
 *   "Report.xlsx → FY2026 Actual → Row 5 → Revenue"
 *   "Report.xlsx → Revenue"  (when no worksheet or row known)
 */
export function formatCitation(
  fact: Pick<KnowledgeFactRow, "worksheetName" | "rowNumber" | "attribute" | "cellRef">,
  filename: string,
): string {
  const parts: string[] = [filename];
  if (fact.worksheetName) {
    parts.push(fact.worksheetName);
    if (fact.rowNumber !== null && fact.rowNumber !== undefined) {
      parts.push(`Row ${fact.rowNumber}`);
    }
  }
  const attrPart = fact.cellRef
    ? `${fact.attribute} (${fact.cellRef})`
    : fact.attribute;
  parts.push(attrPart);
  return parts.join(" → ");
}

/**
 * Format one line of context from a knowledge evidence item.
 * Includes the value, reporting date if known, and conflict status.
 */
function formatContextLine(item: KnowledgeEvidenceItem): string {
  const valuePart =
    item.numericValue !== null
      ? `${item.attribute}: ${item.rawValue} (numeric: ${item.numericValue})`
      : `${item.attribute}: ${item.rawValue}`;

  const datePart = item.reportingDate ? ` [reporting period: ${item.reportingDate}]` : "";
  const citation = item.citation;

  let conflictNote = "";
  if (item.relationship === "CONTRADICTORY_VALUE") {
    conflictNote = " [CONFLICTING — another document shows a different value]";
  } else if (item.relationship === "POTENTIALLY_OUTDATED") {
    conflictNote = " [POTENTIALLY OUTDATED — a more recent reporting period exists]";
  } else if (item.relationship === "DUPLICATE_VALUE") {
    conflictNote = " [corroborated by another document]";
  } else if (item.relationship === "CURRENT_VALUE") {
    conflictNote = " [most recent reporting period available]";
  }

  return `${item.entityName} — ${valuePart}${datePart}${conflictNote} [Source: ${citation}]`;
}

// ── Term extraction ───────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "what", "when", "where", "which", "who", "why", "how", "does", "did",
  "has", "have", "had", "is", "are", "do", "from", "your", "our", "the",
  "and", "for", "with", "this", "that", "about", "tell", "show", "me",
  "can", "you", "all", "files", "file", "documents", "document", "uploaded",
  "orgni", "learned", "know", "fact", "facts", "information", "data",
  "of", "on", "in", "at", "by", "a", "an", "its", "their",
]);

/**
 * Extract candidate search terms from a question.
 * Returns lower-cased, de-duplicated tokens longer than 2 characters.
 * Does not stem or lemmatize — exact substring matching is used at retrieval.
 */
function extractTerms(question: string): string[] {
  const raw = (question.toLowerCase().match(/[a-z0-9][a-z0-9_'-]*/g) ?? [])
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
  return [...new Set(raw)];
}

// ── Score a fact group against query terms ────────────────────────────────────

/**
 * Score a LinkedFactGroup's relevance to the query terms.
 *
 * Scoring rules (in priority order):
 *  1. Exact entity name appears as a substring of the question → highest score.
 *  2. Entity name words coverage ≥ 67% AND at least one attribute word matches.
 *  3. Entity name words coverage ≥ 67% (attribute absent in query).
 *  4. Attribute-only match.
 *  5. Any rawValue term match (user cited a specific number).
 *
 * The 67% threshold prevents "Light Duty Truck" from matching a query about
 * "Medium Duty Truck" — they share "duty" and "truck" (2 of 3 words = 67%)
 * but NOT the distinctive word "medium"/"light", so without exact phrase
 * matching the coverage would incorrectly reach the threshold.  By checking
 * the full entity name as a phrase first, we score exact matches highest and
 * demote partial overlaps.
 */
function scoreGroup(
  group: LinkedFactGroup,
  terms: string[],
  originalQuestion?: string,
): number {
  if (terms.length === 0) return 0;

  const entityLower = group.entityName.toLowerCase();
  const attrLower = group.attribute.toLowerCase();

  // Priority 1: exact entity name phrase match in the original question.
  const questionLower = (originalQuestion ?? terms.join(" ")).toLowerCase();
  if (questionLower.includes(entityLower)) {
    const attrMatches = attrLower.split(/\s+/).filter((w) => w.length > 2 && terms.some((t) => t === w || t.startsWith(w) || w.startsWith(t))).length;
    return 10 + attrMatches;
  }

  // Priority 2+3: entity word coverage ≥ 67% (all significant words must match).
  const entityWords = entityLower.split(/\s+/).filter((w) => w.length > 2);
  const attrWords = attrLower.split(/\s+/).filter((w) => w.length > 2);

  const entityCovered = entityWords.filter((w) =>
    terms.some((t) => w === t || w.startsWith(t) || t.startsWith(w)),
  ).length;

  // For entities with 3+ significant words, require all words to match.
  // For 1-2 word entities, 67% coverage suffices.
  // This ensures "Medium Duty Truck" and "Light Duty Truck" are discriminated
  // when the query contains "medium" but not "light" (or vice versa).
  const threshold = entityWords.length >= 3
    ? entityWords.length          // 100% required for long entity names
    : Math.ceil(entityWords.length * 0.67);
  const entityMatches = entityCovered >= threshold ? entityCovered : 0;
  const attrMatches = attrWords.filter((w) =>
    terms.some((t) => w === t || w.startsWith(t) || t.startsWith(w)),
  ).length;

  if (entityMatches > 0 && attrMatches > 0) return entityMatches + attrMatches + 2;
  if (entityMatches > 0) return entityMatches;
  if (attrMatches > 0) return attrMatches;

  // Priority 5: rawValue match.
  const anyValueMatch = group.facts.some((f) =>
    terms.some((t) => f.fact.rawValue.toLowerCase().includes(t)),
  );
  return anyValueMatch ? 1 : 0;
}

// ── Main retrieval function ───────────────────────────────────────────────────

/**
 * Retrieve structured knowledge facts relevant to a question.
 *
 * Strategy:
 *  1. Extract entity/attribute terms from the question.
 *  2. Load all knowledge facts for the tenant (capped at 500 to bound memory).
 *  3. Score each (entity, attribute) group against the question terms.
 *  4. Return the top-scoring groups (up to MAX_GROUPS) with full provenance.
 *
 * Returns an empty StructuredEvidence with hasEvidence=false when no matching
 * facts are found.  Never throws; errors degrade to empty evidence.
 */
const MAX_GROUPS = 5;
const MAX_TENANT_FACTS = 500;

export async function gatherKnowledgeFacts(
  repository: Repository,
  tenantId: string,
  question: string,
): Promise<StructuredEvidence> {
  const empty: StructuredEvidence = {
    hasEvidence: false,
    groups: [],
    items: [],
    hasConflicts: false,
    contextLines: [],
  };

  try {
    const terms = extractTerms(question);
    if (terms.length === 0) return empty;

    // Load all facts for the tenant, bounded to avoid unbounded memory use.
    // We scan the flat list first to find candidate (entity, attribute) pairs,
    // then load full linked-fact groups only for the top-scoring pairs.

    const flatFacts = await repository.listTenantKnowledgeFacts(tenantId, MAX_TENANT_FACTS);
    if (flatFacts.length === 0) return empty;

    // Collect distinct (entity, attribute) pairs and score them.
    const pairScores = new Map<string, { entity: string; attribute: string; score: number }>();
    for (const { fact } of flatFacts) {
      const key = `${fact.entityName}\x00${fact.attribute}`;
      if (pairScores.has(key)) continue;
      const mockGroup: LinkedFactGroup = {
        tenantId,
        entityName: fact.entityName,
        attribute: fact.attribute,
        facts: [],
        conflicts: [],
      };
      const score = scoreGroup(mockGroup, terms, question);
      if (score > 0) {
        pairScores.set(key, { entity: fact.entityName, attribute: fact.attribute, score });
      }
    }

    if (pairScores.size === 0) return empty;

    // Pick the top-scoring pairs and load their full linked-fact groups.
    // If any pair has an exact entity phrase match (score ≥ 10), restrict
    // the result set to those exact matches only — this prevents attribute-only
    // matches from appearing alongside specific entity results.
    const allPairs = [...pairScores.values()].sort((a, b) => b.score - a.score);
    const hasExactMatch = allPairs.some((p) => p.score >= 10);
    const filteredPairs = hasExactMatch
      ? allPairs.filter((p) => p.score >= 10)
      : allPairs;
    const topPairs = filteredPairs.slice(0, MAX_GROUPS);

    const groups: LinkedFactGroup[] = [];
    for (const { entity, attribute } of topPairs) {
      const group = await repository.getLinkedFacts(tenantId, entity, attribute);
      if (group.facts.length > 0) groups.push(group);
    }

    if (groups.length === 0) return empty;

    // Build evidence items and context lines.
    const items: KnowledgeEvidenceItem[] = [];
    let hasConflicts = false;

    // Build a filename lookup from the flat facts.
    const filenameBySourceId = new Map<string, string>();
    for (const { fact, filename } of flatFacts) {
      filenameBySourceId.set(fact.sourceId, filename);
    }

    for (const group of groups) {
      for (const { fact, filename, relationship } of group.facts) {
        const citation = formatCitation(fact, filename || filenameBySourceId.get(fact.sourceId) || fact.sourceId);
        const item: KnowledgeEvidenceItem = {
          entityName: fact.entityName,
          attribute: fact.attribute,
          rawValue: fact.rawValue,
          numericValue: fact.numericValue,
          sourceDocument: filename || filenameBySourceId.get(fact.sourceId) || fact.sourceId,
          sourceId: fact.sourceId,
          worksheetName: fact.worksheetName,
          rowNumber: fact.rowNumber,
          cellRef: fact.cellRef,
          entityCellRef: fact.entityCellRef,
          reportingDate: fact.reportingDate,
          relationship,
          citation,
        };
        items.push(item);
        if (
          relationship === "CONTRADICTORY_VALUE" ||
          relationship === "POTENTIALLY_OUTDATED"
        ) {
          hasConflicts = true;
        }
      }
    }

    // Sort: sole sources and duplicates first, conflicts last.
    const sortOrder = {
      SOLE_SOURCE: 0,
      DUPLICATE_VALUE: 1,
      CURRENT_VALUE: 2,
      CONTRADICTORY_VALUE: 3,
      POTENTIALLY_OUTDATED: 4,
    } as const;
    items.sort(
      (a, b) =>
        (sortOrder[a.relationship ?? "SOLE_SOURCE"] ?? 3) -
        (sortOrder[b.relationship ?? "SOLE_SOURCE"] ?? 3),
    );

    const contextLines = items.map(formatContextLine);

    return {
      hasEvidence: true,
      groups,
      items,
      hasConflicts,
      contextLines,
    };
  } catch {
    return empty;
  }
}

// ── No-evidence message ───────────────────────────────────────────────────────

/**
 * Return a message explaining that no evidence was found.
 * Used by the template provider to generate an explicit no-knowledge response.
 */
export function noEvidenceMessage(): string {
  return "I couldn't find information in your uploaded documents that matches that question. If you have relevant spreadsheets or reports, upload them and I'll be able to answer from the actual data.";
}
