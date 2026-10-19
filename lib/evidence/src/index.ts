/**
 * Evidence Retrieval Service
 *
 * Provides keyword and entity matching against persisted organizational tokens.
 * Enforces tenant isolation, retrieval bounds, and relevance ranking.
 */
import type {
  Repository,
  EvidenceMatch,
  EvidenceRetrievalOptions,
  EvidenceRetrievalResult,
} from "@workspace/db/repository";

/**
 * Text normalization for keyword matching.
 * Lowercases and trims whitespace.
 */
export function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Extract meaningful terms from a user query.
 * Splits on whitespace and removes empty/short terms.
 */
export function extractKeywords(query: string): string[] {
  return query
    .split(/\s+/)
    .map(normalizeText)
    .filter((term) => term.length >= 2);
}

/**
 * Evidence retrieval configuration defaults.
 */
const DEFAULT_MAX_RECORDS = 20;
const DEFAULT_MAX_TEXT_LENGTH = 100000; // ~100KB
const DEFAULT_MIN_SCORE = 1;

/**
 * Retrieve evidence matching query keywords and entities.
 *
 * @param repo - Repository instance for database access
 * @param tenantId - Tenant scope (derived from authenticated context)
 * @param query - User's natural language query
 * @param options - Retrieval bounds and filters
 * @returns Matched evidence with metadata
 */
export async function retrieveEvidence(
  repo: Repository,
  tenantId: string,
  query: string,
  options: EvidenceRetrievalOptions = {},
): Promise<EvidenceRetrievalResult> {
  const {
    maxRecords = DEFAULT_MAX_RECORDS,
    maxTextLength = DEFAULT_MAX_TEXT_LENGTH,
    minScore = DEFAULT_MIN_SCORE,
    tokenKinds,
  } = options;

  // Extract keywords from natural language query
  const keywords = extractKeywords(query);

  // Defensive: empty query returns empty result
  if (keywords.length === 0 && !tokenKinds?.length) {
    return {
      evidence: [],
      totalScanned: 0,
      totalMatched: 0,
      truncated: false,
      metadata: {
        queryKeywords: [],
        queryEntityTypes: [],
        queryEntityIds: [],
        tenantId,
      },
    };
  }

  // Query repository for matching evidence
  const matches = await repo.findEvidence({
    tenantId,
    keywords,
    entityTypes: tokenKinds,
  });

  // Apply minimum score filter
  const scoredMatches = matches.filter((m) => m.matchScore >= minScore);

  // Apply token kind filter if specified
  const filteredMatches = tokenKinds
    ? scoredMatches.filter((m) => tokenKinds.includes(m.tokenKind))
    : scoredMatches;

  // Limit results
  const limitedMatches = filteredMatches.slice(0, maxRecords);

  // Calculate total text length and check bounds
  let totalLength = 0;
  let truncated = false;
  const boundedEvidence: EvidenceMatch[] = [];

  for (const match of limitedMatches) {
    const textLength = JSON.stringify(match.token).length;
    if (totalLength + textLength > maxTextLength) {
      truncated = true;
      break;
    }
    totalLength += textLength;
    boundedEvidence.push(match);
  }

  return {
    evidence: boundedEvidence,
    totalScanned: matches.length,
    totalMatched: filteredMatches.length,
    truncated,
    metadata: {
      queryKeywords: keywords,
      queryEntityTypes: tokenKinds ?? [],
      queryEntityIds: [],
      tenantId,
    },
  };
}

/**
 * Retrieve evidence by specific entity types.
 * Useful for filtering to event, entity, relation, etc.
 */
export async function retrieveEvidenceByType(
  repo: Repository,
  tenantId: string,
  entityTypes: string[],
  options: Omit<EvidenceRetrievalOptions, "tokenKinds"> = {},
): Promise<EvidenceRetrievalResult> {
  return retrieveEvidence(repo, tenantId, "", {
    ...options,
    tokenKinds: entityTypes,
  });
}

// Re-export types for consumers
export type {
  EvidenceMatch,
  EvidenceRetrievalOptions,
  EvidenceRetrievalResult,
} from "@workspace/db/repository";