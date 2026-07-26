/**
 * Organizational-model aggregation.
 *
 * The document routes persist one ontology result per source. The console's
 * model views (overview, entities, relationships, facts, exceptions, activity)
 * are read-only aggregations across all of a tenant's sources, computed here as
 * pure functions over the rows the repository loads.
 *
 * Phase 1 performs NO cross-document entity resolution: each source names its
 * own entities. Grouping entities by normalized name here is a *presentation*
 * convenience for the console — it never merges or rewrites the underlying
 * facts, and every grouped view keeps per-source provenance so a reader can
 * always trace a claim back to the document it came from.
 */

type Json = Record<string, unknown>;

/** The subset of the persisted OntologyResult the console reads. */
interface OntologyResultShape {
  entities?: Array<
    Json & { entity_id?: string; entity_type?: string; name?: string }
  >;
  relationships?: Array<Json & { subject_ref?: string; object_ref?: string }>;
  facts?: Array<
    Json & { subject?: string; object?: string; epistemic_status?: string }
  >;
  conflicts?: unknown[];
  warnings?: string[];
  rejected?: string[];
}

/** Rows as loaded by `repository.loadTenantModel`. */
export interface ModelInput {
  sources: Array<{
    sourceId: string;
    filename: string;
    documentType: string | null;
    state: string;
    confidence: number | null;
    errors: string[];
    uploadedAt: Date;
  }>;
  facts: Array<{ sourceId: string; result: Json }>;
  reviews: Array<{
    sourceId: string;
    fieldPath: string;
    action: "CORRECT" | "REJECT";
    reviewer: string;
    createdAt: Date;
  }>;
}

export interface Provenance {
  sourceId: string;
  filename: string;
  documentType: string | null;
  uploadedAt: Date;
}

export interface DocumentSummary {
  sourceId: string;
  filename: string;
  documentType: string | null;
  state: string;
  confidence: number | null;
  uploadedAt: Date;
}

function normName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function summarize(s: ModelInput["sources"][number]): DocumentSummary {
  return {
    sourceId: s.sourceId,
    filename: s.filename,
    documentType: s.documentType,
    state: s.state,
    confidence: s.confidence,
    uploadedAt: s.uploadedAt,
  };
}

function provenanceOf(s: ModelInput["sources"][number]): Provenance {
  return {
    sourceId: s.sourceId,
    filename: s.filename,
    documentType: s.documentType,
    uploadedAt: s.uploadedAt,
  };
}

/**
 * Pair each persisted result with its source row. Facts whose source row is
 * missing (should not happen — FK-backed) are skipped rather than guessed.
 */
function resultsWithSource(input: ModelInput): Array<{
  source: ModelInput["sources"][number];
  result: OntologyResultShape;
}> {
  const byId = new Map(input.sources.map((s) => [s.sourceId, s]));
  const out: Array<{
    source: ModelInput["sources"][number];
    result: OntologyResultShape;
  }> = [];
  for (const f of input.facts) {
    const source = byId.get(f.sourceId);
    if (source)
      out.push({ source, result: (f.result ?? {}) as OntologyResultShape });
  }
  return out;
}

/** Stable, URL-safe key for grouping same-named entities across sources. */
function entityKey(e: { entity_type?: string; name?: string }): string {
  return `${(e.entity_type ?? "UNKNOWN").toUpperCase()}:${normName(String(e.name ?? ""))}`;
}

export interface ModelOverview {
  sources: { total: number; byState: Record<string, number> };
  entities: number;
  relationships: number;
  facts: { total: number; byStatus: Record<string, number> };
  exceptions: number;
  reviews: number;
  latestSources: DocumentSummary[];
}

export function buildOverview(input: ModelInput): ModelOverview {
  const byState: Record<string, number> = {};
  for (const s of input.sources) byState[s.state] = (byState[s.state] ?? 0) + 1;

  const paired = resultsWithSource(input);
  const entityKeys = new Set<string>();
  let relationships = 0;
  let factsTotal = 0;
  let conflicts = 0;
  const byStatus: Record<string, number> = {};

  for (const { result } of paired) {
    for (const e of result.entities ?? []) entityKeys.add(entityKey(e));
    relationships += (result.relationships ?? []).length;
    conflicts += (result.conflicts ?? []).length;
    for (const f of result.facts ?? []) {
      factsTotal += 1;
      const status = String(f.epistemic_status ?? "UNKNOWN");
      byStatus[status] = (byStatus[status] ?? 0) + 1;
    }
  }

  const failedSources = input.sources.filter(
    (s) => s.state === "FAILED",
  ).length;

  return {
    sources: { total: input.sources.length, byState },
    entities: entityKeys.size,
    relationships,
    facts: { total: factsTotal, byStatus },
    exceptions: conflicts + failedSources,
    reviews: input.reviews.length,
    latestSources: input.sources.slice(0, 8).map(summarize),
  };
}

export interface EntityEntry {
  key: string;
  entity: Json;
  occurrences: number;
  sources: Provenance[];
}

export function buildEntities(input: ModelInput): EntityEntry[] {
  const groups = new Map<
    string,
    { entity: Json; occurrences: number; sources: Map<string, Provenance> }
  >();

  for (const { source, result } of resultsWithSource(input)) {
    for (const e of result.entities ?? []) {
      const key = entityKey(e);
      const g = groups.get(key) ?? {
        entity: e as Json,
        occurrences: 0,
        sources: new Map<string, Provenance>(),
      };
      g.occurrences += 1;
      g.sources.set(source.sourceId, provenanceOf(source));
      groups.set(key, g);
    }
  }

  return [...groups.entries()]
    .map(([key, g]) => ({
      key,
      entity: g.entity,
      occurrences: g.occurrences,
      sources: [...g.sources.values()],
    }))
    .sort((a, b) => b.occurrences - a.occurrences);
}

export interface EntityDetail extends EntityEntry {
  facts: Array<{ fact: Json; source: Provenance }>;
  relationships: Array<{ relationship: Json; source: Provenance }>;
}

/**
 * One entity group with the facts and relationships that reference it.
 * Facts reference entities by name (subject/object); relationships reference
 * them by entity_id (subject_ref/object_ref, with a name fallback) — so we
 * match on both the normalized name and the set of entity_ids in the group.
 */
export function buildEntityDetail(
  input: ModelInput,
  key: string,
): EntityDetail | null {
  const entries = buildEntities(input);
  const base = entries.find((e) => e.key === key);
  if (!base) return null;

  const targetName = normName(
    String((base.entity as { name?: string }).name ?? ""),
  );
  const entityIds = new Set<string>();
  for (const { result } of resultsWithSource(input)) {
    for (const e of result.entities ?? []) {
      if (entityKey(e) === key && e.entity_id)
        entityIds.add(String(e.entity_id));
    }
  }

  const facts: Array<{ fact: Json; source: Provenance }> = [];
  const relationships: Array<{ relationship: Json; source: Provenance }> = [];

  for (const { source, result } of resultsWithSource(input)) {
    const prov = provenanceOf(source);
    for (const f of result.facts ?? []) {
      const subj = normName(String(f.subject ?? ""));
      const obj = normName(String(f.object ?? ""));
      if (subj === targetName || obj === targetName)
        facts.push({ fact: f as Json, source: prov });
    }
    for (const r of result.relationships ?? []) {
      const s = String(r.subject_ref ?? "");
      const o = String(r.object_ref ?? "");
      if (
        entityIds.has(s) ||
        entityIds.has(o) ||
        normName(s) === targetName ||
        normName(o) === targetName
      ) {
        relationships.push({ relationship: r as Json, source: prov });
      }
    }
  }

  return { ...base, facts, relationships };
}

export function buildRelationships(
  input: ModelInput,
): Array<{ relationship: Json; source: Provenance }> {
  const out: Array<{ relationship: Json; source: Provenance }> = [];
  for (const { source, result } of resultsWithSource(input)) {
    const prov = provenanceOf(source);
    for (const r of result.relationships ?? [])
      out.push({ relationship: r as Json, source: prov });
  }
  return out;
}

export function buildFacts(
  input: ModelInput,
): Array<{ fact: Json; source: Provenance }> {
  const out: Array<{ fact: Json; source: Provenance }> = [];
  for (const { source, result } of resultsWithSource(input)) {
    const prov = provenanceOf(source);
    for (const f of result.facts ?? [])
      out.push({ fact: f as Json, source: prov });
  }
  return out;
}

export interface ModelExceptions {
  conflicts: Array<{ conflict: unknown; source: Provenance }>;
  rejected: Array<{ reason: string; source: Provenance }>;
  warnings: Array<{ warning: string; source: Provenance }>;
  failedSources: Array<{
    sourceId: string;
    filename: string;
    errors: string[];
    uploadedAt: Date;
  }>;
}

export function buildExceptions(input: ModelInput): ModelExceptions {
  const conflicts: ModelExceptions["conflicts"] = [];
  const rejected: ModelExceptions["rejected"] = [];
  const warnings: ModelExceptions["warnings"] = [];

  for (const { source, result } of resultsWithSource(input)) {
    const prov = provenanceOf(source);
    for (const c of result.conflicts ?? [])
      conflicts.push({ conflict: c, source: prov });
    for (const r of result.rejected ?? [])
      rejected.push({ reason: String(r), source: prov });
    for (const w of result.warnings ?? [])
      warnings.push({ warning: String(w), source: prov });
  }

  const failedSources = input.sources
    .filter((s) => s.state === "FAILED")
    .map((s) => ({
      sourceId: s.sourceId,
      filename: s.filename,
      errors: s.errors,
      uploadedAt: s.uploadedAt,
    }));

  return { conflicts, rejected, warnings, failedSources };
}

export type ActivityEvent =
  | {
      type: "SOURCE_PROCESSED";
      at: Date;
      sourceId: string;
      filename: string;
      state: string;
      documentType: string | null;
    }
  | {
      type: "REVIEW";
      at: Date;
      sourceId: string;
      fieldPath: string;
      action: "CORRECT" | "REJECT";
      reviewer: string;
    };

export function buildActivity(input: ModelInput): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const s of input.sources) {
    events.push({
      type: "SOURCE_PROCESSED",
      at: s.uploadedAt,
      sourceId: s.sourceId,
      filename: s.filename,
      state: s.state,
      documentType: s.documentType,
    });
  }
  for (const r of input.reviews) {
    events.push({
      type: "REVIEW",
      at: r.createdAt,
      sourceId: r.sourceId,
      fieldPath: r.fieldPath,
      action: r.action,
      reviewer: r.reviewer,
    });
  }
  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}
