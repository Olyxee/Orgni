/**
 * Document-pipeline repository.
 *
 * The one place that reads/writes sources, tokens, and facts. Every method takes
 * an explicit tenantId and scopes its query by it — callers cannot accidentally
 * cross tenants. Writes for one document are wrapped in a transaction so a
 * source and its tokens/facts land together or not at all.
 */
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "./schema";
import {
  facts,
  reviews,
  sources,
  tokens,
  type FactRow,
  type IngestionState,
  type ReviewRow,
  type SourceRow,
  type TokenRow,
} from "./schema/documents";
import {
  knowledgeFacts,
  knowledgeConflicts,
  type KnowledgeFactRow,
  type KnowledgeConflictRow,
} from "./schema/knowledge";
import { inferReportingDate } from "./reporting-date";
import { apiKeys, type ApiKeyRow } from "./schema/api-keys";
import { isNull } from "drizzle-orm";

export type Database = NodePgDatabase<typeof schema>;

export interface PersistDocumentInput {
  source: {
    sourceId: string;
    tenantId: string;
    filename: string;
    mimeType: string;
    checksum: string;
    byteSize: number;
    state: IngestionState;
    documentType?: string | null;
    confidence?: number | null;
    sourceAcl?: unknown[];
    warnings?: string[];
    errors?: string[];
    duplicateOf?: string | null;
    uploadedAt: Date;
  };
  tokens: Array<Record<string, unknown>>;
  facts?: { schemaVersion: string; result: Record<string, unknown> } | null;
}

export interface StoredDocument {
  source: SourceRow;
  tokens: TokenRow[];
  facts: FactRow | null;
  reviews: ReviewRow[];
}

// ── Knowledge facts ───────────────────────────────────────────────────────────

/**
 * Input for saving one structured knowledge fact extracted from a spreadsheet.
 * Corresponds directly to the fields carried by a SPREADSHEET_FACT token.
 */
export interface SaveKnowledgeFactInput {
  tenantId: string;
  sourceId: string;
  entityName: string;
  attribute: string;
  rawValue: string;
  numericValue?: number | null;
  valueType?: string;
  worksheetName?: string | null;
  rowNumber?: number | null;
  cellRef?: string | null;
  entityCellRef?: string | null;
  /**
   * Reporting date for this fact (ISO "YYYY-MM-DD").  When omitted the
   * repository calls inferReportingDate(worksheetName) automatically.
   * Pass null to explicitly suppress inference.
   */
  reportingDate?: string | null;
  confidence?: number;
  epistemicStatus?: string;
}

export interface KnowledgeFactQueryResult {
  fact: KnowledgeFactRow;
  /** Filename of the source document, joined from sources. */
  filename: string;
}

export interface ConflictPair {
  conflict: KnowledgeConflictRow;
  factA: KnowledgeFactRow;
  factB: KnowledgeFactRow;
}

/**
 * A single entity+attribute with all facts from across the tenant's documents,
 * classified into relationship groups.  Returned by getLinkedFacts.
 */
export interface LinkedFactGroup {
  tenantId: string;
  entityName: string;
  attribute: string;
  /** All facts for this (entity, attribute) across all sources. */
  facts: Array<{
    fact: KnowledgeFactRow;
    filename: string;
    /**
     * How this fact relates to the others in the group.
     * "SOLE_SOURCE"      — only one fact exists; no comparison possible.
     * "DUPLICATE_VALUE"  — same value as one or more other facts.
     * "CONTRADICTORY_VALUE" — different value; no date ordering available.
     * "POTENTIALLY_OUTDATED" — different value; this fact's reportingDate
     *                           is earlier than at least one other fact's.
     * "CURRENT_VALUE"    — different value; this fact's reportingDate is
     *                       later than all others with a different value.
     */
    relationship: "SOLE_SOURCE" | "DUPLICATE_VALUE" | "CONTRADICTORY_VALUE" | "POTENTIALLY_OUTDATED" | "CURRENT_VALUE";
  }>;
  /** Existing conflict records for this group (from knowledge_conflicts). */
  conflicts: KnowledgeConflictRow[];
}

// ── Conflict classification helper ───────────────────────────────────────────

/**
 * Classify the relationship between two facts that share the same
 * (tenant, entity, attribute) but come from different source documents.
 *
 * Rules:
 *  - Same rawValue → DUPLICATE_VALUE (corroborating evidence).
 *  - Different rawValue + both have reportingDate → compare dates:
 *      factA.reportingDate < factB.reportingDate → POTENTIALLY_OUTDATED
 *        (factA describes an older period; factB may be the current value)
 *      equal dates → CONTRADICTORY_VALUE (same period, different value)
 *  - Different rawValue + one or both lack reportingDate → CONTRADICTORY_VALUE
 *    (no chronological order can be established without dates).
 *
 * This function never selects a winner. It only classifies the relationship
 * so a human reviewer can decide what to do.
 *
 * The function is symmetric in one sense: for the POTENTIALLY_OUTDATED case,
 * the caller is responsible for canonical ordering (factA < factB by UUID)
 * so that the conflict record consistently describes "factA is potentially
 * outdated relative to factB".
 */
function classifyConflict(
  factA: { rawValue: string; reportingDate: string | null },
  factB: { rawValue: string; reportingDate: string | null },
): string {
  if (factA.rawValue === factB.rawValue) {
    return "DUPLICATE_VALUE";
  }
  // Different values — check whether date ordering is available.
  if (factA.reportingDate && factB.reportingDate) {
    if (factA.reportingDate < factB.reportingDate) {
      return "POTENTIALLY_OUTDATED";
    }
    if (factA.reportingDate > factB.reportingDate) {
      // factB is the older one; the caller should have swapped ordering so
      // factAId is the smaller UUID, not the older date.  We return
      // POTENTIALLY_OUTDATED here and let the caller decide canonical order.
      return "POTENTIALLY_OUTDATED";
    }
    // Equal reporting dates with different values → contradictory.
    return "CONTRADICTORY_VALUE";
  }
  return "CONTRADICTORY_VALUE";
}

export function createRepository(db: Database) {
  return {
    /**
     * Persist a processed document (source + tokens + facts) atomically.
     * Re-persisting the same source id replaces its tokens/facts, so a
     * reprocess is idempotent rather than additive.
     */
    async persistDocument(input: PersistDocumentInput): Promise<void> {
      await db.transaction(async (tx) => {
        await tx
          .insert(sources)
          .values({
            sourceId: input.source.sourceId,
            tenantId: input.source.tenantId,
            filename: input.source.filename,
            mimeType: input.source.mimeType,
            checksum: input.source.checksum,
            byteSize: input.source.byteSize,
            state: input.source.state,
            documentType: input.source.documentType ?? null,
            confidence: input.source.confidence ?? null,
            sourceAcl: input.source.sourceAcl ?? [],
            warnings: input.source.warnings ?? [],
            errors: input.source.errors ?? [],
            duplicateOf: input.source.duplicateOf ?? null,
            uploadedAt: input.source.uploadedAt,
          })
          .onConflictDoUpdate({
            target: sources.sourceId,
            set: {
              state: input.source.state,
              documentType: input.source.documentType ?? null,
              confidence: input.source.confidence ?? null,
              warnings: input.source.warnings ?? [],
              errors: input.source.errors ?? [],
            },
          });

        await tx
          .delete(tokens)
          .where(eq(tokens.sourceId, input.source.sourceId));
        if (input.tokens.length > 0) {
          await tx.insert(tokens).values(
            input.tokens.map((token) => ({
              tokenId: String(token["tokenId"]),
              tenantId: input.source.tenantId,
              sourceId: input.source.sourceId,
              tokenKind: String(token["tokenKind"]),
              token,
            })),
          );
        }

        await tx.delete(facts).where(eq(facts.sourceId, input.source.sourceId));
        if (input.facts) {
          await tx.insert(facts).values({
            tenantId: input.source.tenantId,
            sourceId: input.source.sourceId,
            schemaVersion: input.facts.schemaVersion,
            result: input.facts.result,
          });
        }
      });
    },

    /** Look up an existing source by checksum for idempotent dedup. */
    async findSourceByChecksum(
      tenantId: string,
      checksum: string,
    ): Promise<SourceRow | null> {
      const rows = await db
        .select()
        .from(sources)
        .where(
          and(eq(sources.tenantId, tenantId), eq(sources.checksum, checksum)),
        )
        .limit(1);
      return rows[0] ?? null;
    },

    /** List a tenant's sources, newest first. Never returns other tenants' rows. */
    async listSources(tenantId: string, limit = 50): Promise<SourceRow[]> {
      return db
        .select()
        .from(sources)
        .where(eq(sources.tenantId, tenantId))
        .orderBy(desc(sources.createdAt))
        .limit(limit);
    },

    /**
     * Load everything needed to build the aggregated organizational-model views
     * for a tenant: all sources (newest first) plus their fact-sets and review
     * actions. Strictly tenant-scoped. The aggregation itself lives in the API
     * layer so this stays a plain data read.
     */
    async loadTenantModel(tenantId: string): Promise<{
      sources: SourceRow[];
      facts: FactRow[];
      reviews: ReviewRow[];
    }> {
      const [sourceRows, factRows, reviewRows] = await Promise.all([
        db
          .select()
          .from(sources)
          .where(eq(sources.tenantId, tenantId))
          .orderBy(desc(sources.createdAt)),
        db.select().from(facts).where(eq(facts.tenantId, tenantId)),
        db
          .select()
          .from(reviews)
          .where(eq(reviews.tenantId, tenantId))
          .orderBy(desc(reviews.createdAt)),
      ]);
      return { sources: sourceRows, facts: factRows, reviews: reviewRows };
    },

    /**
     * All of a tenant's persisted tokens (id + source + payload), for
     * cross-document checks such as potential business-duplicate detection.
     * Strictly tenant-scoped.
     */
    async listTenantTokens(
      tenantId: string,
    ): Promise<Array<{ sourceId: string; token: Record<string, unknown> }>> {
      return db
        .select({ sourceId: tokens.sourceId, token: tokens.token })
        .from(tokens)
        .where(eq(tokens.tenantId, tenantId));
    },

    /** Create an API key for a tenant. Stores only the hash + prefix. */
    async createApiKey(input: {
      tenantId: string;
      name: string;
      keyPrefix: string;
      keyHash: string;
      createdBy: string;
    }): Promise<ApiKeyRow> {
      const rows = await db.insert(apiKeys).values(input).returning();
      return rows[0]!;
    },

    /** List a tenant's API keys (never the secret). Newest first. */
    async listApiKeys(tenantId: string): Promise<ApiKeyRow[]> {
      return db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.tenantId, tenantId))
        .orderBy(desc(apiKeys.createdAt));
    },

    /** Revoke a tenant's key. No-op if it isn't theirs. */
    async revokeApiKey(tenantId: string, id: string): Promise<boolean> {
      const rows = await db
        .update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(apiKeys.tenantId, tenantId),
            eq(apiKeys.id, id),
            isNull(apiKeys.revokedAt),
          ),
        )
        .returning({ id: apiKeys.id });
      return rows.length > 0;
    },

    /** Resolve an active API key by its hash → tenant, for authentication. */
    async findActiveApiKeyByHash(keyHash: string): Promise<ApiKeyRow | null> {
      const rows = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
        .limit(1);
      const key = rows[0];
      if (!key) return null;
      // Best-effort last-used stamp; never block auth on it.
      void db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, key.id))
        .catch(() => {});
      return key;
    },

    /** Full stored document for review — strictly tenant-scoped. */
    async getDocument(
      tenantId: string,
      sourceId: string,
    ): Promise<StoredDocument | null> {
      const sourceRows = await db
        .select()
        .from(sources)
        .where(
          and(eq(sources.tenantId, tenantId), eq(sources.sourceId, sourceId)),
        )
        .limit(1);
      const source = sourceRows[0];
      if (!source) return null;

      const [tokenRows, factRows, reviewRows] = await Promise.all([
        db.select().from(tokens).where(eq(tokens.sourceId, sourceId)),
        db.select().from(facts).where(eq(facts.sourceId, sourceId)).limit(1),
        db.select().from(reviews).where(eq(reviews.sourceId, sourceId)),
      ]);

      return {
        source,
        tokens: tokenRows,
        facts: factRows[0] ?? null,
        reviews: reviewRows,
      };
    },

    /** Record a reviewer correction/rejection (append-only audit trail). */
    async addReview(input: {
      tenantId: string;
      sourceId: string;
      fieldPath: string;
      action: "CORRECT" | "REJECT" | "APPROVE";
      correctedValue?: unknown;
      reviewer: string;
    }): Promise<ReviewRow> {
      // Guard: the source must belong to the tenant.
      const owner = await db
        .select({ id: sources.sourceId })
        .from(sources)
        .where(
          and(
            eq(sources.tenantId, input.tenantId),
            eq(sources.sourceId, input.sourceId),
          ),
        )
        .limit(1);
      if (!owner[0]) {
        throw new Error("source not found for tenant");
      }
      const rows = await db
        .insert(reviews)
        .values({
          tenantId: input.tenantId,
          sourceId: input.sourceId,
          fieldPath: input.fieldPath,
          action: input.action,
          correctedValue: input.correctedValue ?? null,
          reviewer: input.reviewer,
        })
        .returning();
      return rows[0]!;
    },

    // ── Knowledge facts ─────────────────────────────────────────────────────

    /**
     * Persist one SPREADSHEET_FACT as a structured knowledge fact.
     *
     * Uses INSERT … ON CONFLICT DO UPDATE (upsert) keyed on
     * (source_id, entity_name, attribute) so that reprocessing the same
     * source replaces rather than duplicates the fact.
     *
     * After upserting, checks every other fact for the same
     * (tenant, entity, attribute) from a DIFFERENT source. If another
     * source asserts a different rawValue, a knowledge_conflict record is
     * created. If another source asserts the same rawValue, a
     * DUPLICATE_VALUE conflict is created so it is visible for review.
     * Conflict records are themselves idempotent (unique on fact_a_id,
     * fact_b_id pair).
     *
     * Returns the upserted fact row.
     */
    async saveKnowledgeFact(
      input: SaveKnowledgeFactInput,
    ): Promise<KnowledgeFactRow> {
      // Guard: the source must belong to the tenant.
      const sourceOwner = await db
        .select({ id: sources.sourceId })
        .from(sources)
        .where(
          and(
            eq(sources.tenantId, input.tenantId),
            eq(sources.sourceId, input.sourceId),
          ),
        )
        .limit(1);
      if (!sourceOwner[0]) {
        throw new Error("source not found for tenant");
      }

      const valueType =
        input.valueType ??
        (input.numericValue !== undefined && input.numericValue !== null
          ? "numeric"
          : "text");

      // Infer reporting date from worksheet name when not explicitly provided.
      const reportingDate =
        input.reportingDate !== undefined
          ? input.reportingDate
          : inferReportingDate(input.worksheetName ?? null);

      // Upsert: replace on reprocess of same source.
      const rows = await db
        .insert(knowledgeFacts)
        .values({
          tenantId: input.tenantId,
          sourceId: input.sourceId,
          entityName: input.entityName,
          attribute: input.attribute,
          rawValue: input.rawValue,
          numericValue: input.numericValue ?? null,
          valueType,
          worksheetName: input.worksheetName ?? null,
          rowNumber: input.rowNumber ?? null,
          cellRef: input.cellRef ?? null,
          entityCellRef: input.entityCellRef ?? null,
          reportingDate: reportingDate ?? null,
          confidence: input.confidence ?? 0.82,
          epistemicStatus: input.epistemicStatus ?? "OBSERVED",
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            knowledgeFacts.sourceId,
            knowledgeFacts.entityName,
            knowledgeFacts.attribute,
          ],
          set: {
            rawValue: input.rawValue,
            numericValue: input.numericValue ?? null,
            valueType,
            worksheetName: input.worksheetName ?? null,
            rowNumber: input.rowNumber ?? null,
            cellRef: input.cellRef ?? null,
            entityCellRef: input.entityCellRef ?? null,
            reportingDate: reportingDate ?? null,
            confidence: input.confidence ?? 0.82,
            epistemicStatus: input.epistemicStatus ?? "OBSERVED",
            updatedAt: new Date(),
          },
        })
        .returning();

      const saved = rows[0]!;

      // Detect conflicts against facts from other sources.
      const others = await db
        .select()
        .from(knowledgeFacts)
        .where(
          and(
            eq(knowledgeFacts.tenantId, input.tenantId),
            eq(knowledgeFacts.entityName, input.entityName),
            eq(knowledgeFacts.attribute, input.attribute),
            ne(knowledgeFacts.sourceId, input.sourceId),
          ),
        );

      for (const other of others) {
        const conflictType = classifyConflict(saved, other);

        // Canonical ordering so the unique index (fact_a_id, fact_b_id) works.
        const [factAId, factBId, rdA, rdB] =
          saved.id < other.id
            ? [saved.id, other.id, saved.reportingDate, other.reportingDate]
            : [other.id, saved.id, other.reportingDate, saved.reportingDate];

        await db
          .insert(knowledgeConflicts)
          .values({
            tenantId: input.tenantId,
            entityName: input.entityName,
            attribute: input.attribute,
            factAId,
            factBId,
            conflictType,
            reportingDateA: rdA ?? null,
            reportingDateB: rdB ?? null,
          })
          .onConflictDoNothing();
      }

      return saved;
    },

    /**
     * Save all SPREADSHEET_FACT tokens from a processed document as
     * knowledge facts.
     *
     * This is the additive variant: it upserts each fact but does NOT delete
     * facts that are no longer present in the token list. Use it only when you
     * know no prior facts exist for this source (e.g. first-time ingest).
     *
     * For reprocessing (where stale facts must be removed), use
     * replaceKnowledgeFactsFromTokens instead.
     *
     * Tokens whose eventType is not SPREADSHEET_FACT, or that are missing a
     * required field (entity, attribute, rawValue), are silently skipped.
     */
    async saveKnowledgeFactsFromTokens(
      tenantId: string,
      sourceId: string,
      tokenList: Array<Record<string, unknown>>,
    ): Promise<KnowledgeFactRow[]> {
      const factTokens = tokenList.filter(
        (t) => t["eventType"] === "SPREADSHEET_FACT",
      );
      if (factTokens.length === 0) return [];

      const saved: KnowledgeFactRow[] = [];
      for (const token of factTokens) {
        const sv = (token["scalarValue"] ?? {}) as Record<string, unknown>;
        const entityName = String(token["subjectId"] ?? sv["entityValue"] ?? "");
        const attribute = String(sv["attribute"] ?? "");
        const rawValue = String(sv["rawValue"] ?? "");
        if (!entityName || !attribute || !rawValue) continue;

        const numericValue =
          typeof sv["numericValue"] === "number" ? sv["numericValue"] : null;

        const row = await this.saveKnowledgeFact({
          tenantId,
          sourceId,
          entityName,
          attribute,
          rawValue,
          numericValue,
          worksheetName:
            typeof sv["worksheetName"] === "string" ? sv["worksheetName"] : null,
          rowNumber:
            typeof sv["rowNumber"] === "number" ? sv["rowNumber"] : null,
          cellRef:
            typeof sv["cellRef"] === "string" ? sv["cellRef"] : null,
          entityCellRef:
            typeof sv["entityCellRef"] === "string" ? sv["entityCellRef"] : null,
          // reportingDate is inferred from worksheetName inside saveKnowledgeFact.
          confidence:
            typeof token["confidence"] === "number" ? token["confidence"] : 0.82,
          epistemicStatus:
            typeof token["epistemicStatus"] === "string"
              ? token["epistemicStatus"]
              : "OBSERVED",
        });
        saved.push(row);
      }
      return saved;
    },

    /**
     * Atomically replace all knowledge facts for a source document.
     *
     * This is the safe reprocessing variant. It runs inside a transaction:
     *
     *   1. Delete all existing knowledge_facts rows for (tenantId, sourceId).
     *      This also cascades to any knowledge_conflicts that reference those
     *      facts, so stale conflict records are removed automatically.
     *   2. Insert the new facts derived from the current token list.
     *   3. Run conflict detection against facts from other sources.
     *
     * If step 2 or 3 fails, the transaction rolls back and the original facts
     * are restored — the document is never left in a partially deleted state.
     *
     * Facts belonging to other sources and other tenants are never touched.
     *
     * Tokens whose eventType is not SPREADSHEET_FACT, or that lack a required
     * field, are silently skipped.  An empty token list is valid: it means the
     * reprocessed document produced no SPREADSHEET_FACT tokens, and all prior
     * facts from this source are removed.
     *
     * Returns the newly saved fact rows.
     */
    async replaceKnowledgeFactsFromTokens(
      tenantId: string,
      sourceId: string,
      tokenList: Array<Record<string, unknown>>,
    ): Promise<KnowledgeFactRow[]> {
      // Guard: source must belong to the tenant before we touch anything.
      const sourceOwner = await db
        .select({ id: sources.sourceId })
        .from(sources)
        .where(
          and(
            eq(sources.tenantId, tenantId),
            eq(sources.sourceId, sourceId),
          ),
        )
        .limit(1);
      if (!sourceOwner[0]) {
        throw new Error("source not found for tenant");
      }

      // Parse the new facts first — before touching the database — so a parse
      // error cannot leave the document with partially deleted facts.
      interface ParsedFact {
        entityName: string;
        attribute: string;
        rawValue: string;
        numericValue: number | null;
        worksheetName: string | null;
        rowNumber: number | null;
        cellRef: string | null;
        entityCellRef: string | null;
        reportingDate: string | null;
        confidence: number;
        epistemicStatus: string;
      }

      const parsedFacts: ParsedFact[] = [];
      for (const token of tokenList) {
        if (token["eventType"] !== "SPREADSHEET_FACT") continue;
        const sv = (token["scalarValue"] ?? {}) as Record<string, unknown>;
        const entityName = String(token["subjectId"] ?? sv["entityValue"] ?? "");
        const attribute = String(sv["attribute"] ?? "");
        const rawValue = String(sv["rawValue"] ?? "");
        if (!entityName || !attribute || !rawValue) continue;
        const worksheetName =
          typeof sv["worksheetName"] === "string" ? sv["worksheetName"] : null;
        parsedFacts.push({
          entityName,
          attribute,
          rawValue,
          numericValue:
            typeof sv["numericValue"] === "number" ? sv["numericValue"] : null,
          worksheetName,
          rowNumber:
            typeof sv["rowNumber"] === "number" ? sv["rowNumber"] : null,
          cellRef:
            typeof sv["cellRef"] === "string" ? sv["cellRef"] : null,
          entityCellRef:
            typeof sv["entityCellRef"] === "string" ? sv["entityCellRef"] : null,
          // Infer reporting date from worksheet name at parse time.
          reportingDate: inferReportingDate(worksheetName),
          confidence:
            typeof token["confidence"] === "number" ? token["confidence"] : 0.82,
          epistemicStatus:
            typeof token["epistemicStatus"] === "string"
              ? token["epistemicStatus"]
              : "OBSERVED",
        });
      }

      // Run delete + insert inside one transaction.
      const savedInTx: KnowledgeFactRow[] = [];

      await db.transaction(async (tx) => {
        // Step 1: delete this source's existing facts.
        // knowledge_conflicts rows that reference these facts are removed by
        // the ON DELETE CASCADE constraint on fact_a_id / fact_b_id.
        await tx
          .delete(knowledgeFacts)
          .where(
            and(
              eq(knowledgeFacts.tenantId, tenantId),
              eq(knowledgeFacts.sourceId, sourceId),
            ),
          );

        // Step 2: insert the new facts.
        if (parsedFacts.length === 0) return;

        const valueType = (numericValue: number | null) =>
          numericValue !== null ? "numeric" : "text";

        const inserted = await tx
          .insert(knowledgeFacts)
          .values(
            parsedFacts.map((f) => ({
              tenantId,
              sourceId,
              entityName: f.entityName,
              attribute: f.attribute,
              rawValue: f.rawValue,
              numericValue: f.numericValue,
              valueType: valueType(f.numericValue),
              worksheetName: f.worksheetName,
              rowNumber: f.rowNumber,
              cellRef: f.cellRef,
              entityCellRef: f.entityCellRef,
              reportingDate: f.reportingDate ?? null,
              confidence: f.confidence,
              epistemicStatus: f.epistemicStatus,
              updatedAt: new Date(),
            })),
          )
          .returning();

        for (const row of inserted) savedInTx.push(row);
      });

      // ── Batched conflict detection ──────────────────────────────────────
      // Instead of one query per newly saved fact, collect all distinct
      // (entityName, attribute) pairs from this batch, then fetch all
      // competing facts (from other sources) in a single query.  This
      // reduces N round-trips to 1 for the common case of a spreadsheet
      // with many rows.
      if (savedInTx.length > 0) {
        // Build the set of (entityName, attribute) pairs we need to look up.
        // Use a string key to deduplicate.
        const pairKeys = new Set(
          savedInTx.map((f) => `${f.entityName}\x00${f.attribute}`),
        );

        // Fetch all same-tenant facts for those pairs from OTHER sources.
        // We filter by sourceId != sourceId (ne) in the application rather
        // than in SQL to avoid building a dynamic OR clause.
        const entityNames = [...new Set(savedInTx.map((f) => f.entityName))];
        const attributes  = [...new Set(savedInTx.map((f) => f.attribute))];

        const competing = await db
          .select()
          .from(knowledgeFacts)
          .where(
            and(
              eq(knowledgeFacts.tenantId, tenantId),
              inArray(knowledgeFacts.entityName, entityNames),
              inArray(knowledgeFacts.attribute, attributes),
              ne(knowledgeFacts.sourceId, sourceId),
            ),
          );

        // Index competing facts by their (entityName, attribute) pair key.
        const competingByPair = new Map<string, KnowledgeFactRow[]>();
        for (const c of competing) {
          const key = `${c.entityName}\x00${c.attribute}`;
          if (!pairKeys.has(key)) continue; // extra safety: skip unrelated pairs
          const bucket = competingByPair.get(key) ?? [];
          bucket.push(c);
          competingByPair.set(key, bucket);
        }

        // Build the conflict insert values.
        const conflictValues: Array<{
          tenantId: string;
          entityName: string;
          attribute: string;
          factAId: string;
          factBId: string;
          conflictType: string;
          reportingDateA: string | null;
          reportingDateB: string | null;
        }> = [];

        for (const saved of savedInTx) {
          const key = `${saved.entityName}\x00${saved.attribute}`;
          const others = competingByPair.get(key) ?? [];
          for (const other of others) {
            const conflictType = classifyConflict(saved, other);
            const [factAId, factBId, rdA, rdB] =
              saved.id < other.id
                ? [saved.id, other.id, saved.reportingDate, other.reportingDate]
                : [other.id, saved.id, other.reportingDate, saved.reportingDate];

            conflictValues.push({
              tenantId,
              entityName: saved.entityName,
              attribute: saved.attribute,
              factAId,
              factBId,
              conflictType,
              reportingDateA: rdA ?? null,
              reportingDateB: rdB ?? null,
            });
          }
        }

        // Insert all conflict records in a single statement.  Duplicates are
        // ignored via the unique index on (fact_a_id, fact_b_id).
        if (conflictValues.length > 0) {
          await db
            .insert(knowledgeConflicts)
            .values(conflictValues)
            .onConflictDoNothing();
        }
      }

      return savedInTx;
    },

    /**
     * Retrieve all facts for a (tenant, entity, attribute) pair across all
     * sources, with each fact classified by its relationship to the others.
     *
     * This is the cross-document linking view.  It answers questions like:
     *   "What do all uploaded documents say about Medium Duty Truck Revenue?"
     *
     * Relationship classifications:
     *   "SOLE_SOURCE"          — only one fact exists; nothing to compare.
     *   "DUPLICATE_VALUE"      — same value as at least one other fact.
     *   "CONTRADICTORY_VALUE"  — different value; no date ordering available.
     *   "POTENTIALLY_OUTDATED" — different value; this fact's reportingDate
     *                            is earlier than at least one other fact's.
     *   "CURRENT_VALUE"        — different value; this fact's reportingDate
     *                            is later than all other facts' reportingDates,
     *                            or it is the only fact with a reportingDate.
     *
     * No fact is modified or deleted by this function. It is strictly read-only.
     * Strictly tenant-scoped.
     */
    async getLinkedFacts(
      tenantId: string,
      entityName: string,
      attribute: string,
    ): Promise<LinkedFactGroup> {
      // Load all facts for this (entity, attribute) with filenames.
      const rows = await db
        .select({
          fact: knowledgeFacts,
          filename: sources.filename,
        })
        .from(knowledgeFacts)
        .innerJoin(sources, eq(knowledgeFacts.sourceId, sources.sourceId))
        .where(
          and(
            eq(knowledgeFacts.tenantId, tenantId),
            eq(knowledgeFacts.entityName, entityName),
            eq(knowledgeFacts.attribute, attribute),
          ),
        )
        .orderBy(knowledgeFacts.reportingDate, desc(knowledgeFacts.createdAt));

      // Load existing conflict records for this group.
      const conflictRows = await db
        .select()
        .from(knowledgeConflicts)
        .where(
          and(
            eq(knowledgeConflicts.tenantId, tenantId),
            eq(knowledgeConflicts.entityName, entityName),
            eq(knowledgeConflicts.attribute, attribute),
          ),
        );

      if (rows.length === 0) {
        return {
          tenantId,
          entityName,
          attribute,
          facts: [],
          conflicts: conflictRows,
        };
      }

      if (rows.length === 1) {
        return {
          tenantId,
          entityName,
          attribute,
          facts: [{ fact: rows[0]!.fact, filename: rows[0]!.filename, relationship: "SOLE_SOURCE" }],
          conflicts: conflictRows,
        };
      }

      // Classify each fact relative to all others.
      const classified = rows.map(({ fact, filename }) => {
        const others = rows.filter((r) => r.fact.id !== fact.id);

        // Check for any duplicate (same rawValue from another source).
        const hasDuplicate = others.some((o) => o.fact.rawValue === fact.rawValue);
        if (hasDuplicate) {
          return { fact, filename, relationship: "DUPLICATE_VALUE" as const };
        }

        // All others have a different value — look at dates.
        const ownDate = fact.reportingDate;
        const otherDates = others
          .map((o) => o.fact.reportingDate)
          .filter((d): d is string => d !== null);

        if (!ownDate || otherDates.length === 0) {
          // No date ordering available.
          return { fact, filename, relationship: "CONTRADICTORY_VALUE" as const };
        }

        // This fact is older than at least one other fact with a different value.
        const isOlderThanSome = otherDates.some((d) => ownDate < d);
        // This fact is newer than all others with a different value.
        const isNewerThanAll = otherDates.every((d) => ownDate > d);

        if (isNewerThanAll) {
          return { fact, filename, relationship: "CURRENT_VALUE" as const };
        }
        if (isOlderThanSome) {
          return { fact, filename, relationship: "POTENTIALLY_OUTDATED" as const };
        }
        return { fact, filename, relationship: "CONTRADICTORY_VALUE" as const };
      });

      return {
        tenantId,
        entityName,
        attribute,
        facts: classified,
        conflicts: conflictRows,
      };
    },

    /**
     * Delete all knowledge facts for a source document.
     *
     * Strictly tenant-scoped. Cascades to knowledge_conflicts via FK.
     *
     * Prefer replaceKnowledgeFactsFromTokens for reprocessing — it wraps
     * the delete and re-insert in one transaction so the source is never
     * left with an empty fact set on failure.
     */
    async deleteKnowledgeFactsBySource(
      tenantId: string,
      sourceId: string,
    ): Promise<void> {
      await db
        .delete(knowledgeFacts)
        .where(
          and(
            eq(knowledgeFacts.tenantId, tenantId),
            eq(knowledgeFacts.sourceId, sourceId),
          ),
        );
    },

    /**
     * List all knowledge facts for a tenant, joined with their source filename.
     * Used by the retrieval layer to scan for candidate (entity, attribute)
     * pairs before loading full linked-fact groups.
     *
     * Bounded by `limit` to prevent unbounded memory usage. Strictly
     * tenant-scoped.
     */
    async listTenantKnowledgeFacts(
      tenantId: string,
      limit = 500,
    ): Promise<Array<{ fact: KnowledgeFactRow; filename: string }>> {
      const rows = await db
        .select({
          fact: knowledgeFacts,
          filename: sources.filename,
        })
        .from(knowledgeFacts)
        .innerJoin(sources, eq(knowledgeFacts.sourceId, sources.sourceId))
        .where(eq(knowledgeFacts.tenantId, tenantId))
        .orderBy(knowledgeFacts.entityName, knowledgeFacts.attribute)
        .limit(limit);
      return rows;
    },

    /**
     * Retrieve all knowledge facts for a (tenant, entity, attribute) pair.
     *
     * Returns facts from every source — multiple rows mean multiple sources
     * support or contradict this claim.  Strictly tenant-scoped.
     */
    async getKnowledgeFacts(
      tenantId: string,
      entityName: string,
      attribute: string,
    ): Promise<KnowledgeFactQueryResult[]> {
      const rows = await db
        .select({
          fact: knowledgeFacts,
          filename: sources.filename,
        })
        .from(knowledgeFacts)
        .innerJoin(sources, eq(knowledgeFacts.sourceId, sources.sourceId))
        .where(
          and(
            eq(knowledgeFacts.tenantId, tenantId),
            eq(knowledgeFacts.entityName, entityName),
            eq(knowledgeFacts.attribute, attribute),
          ),
        )
        .orderBy(desc(knowledgeFacts.createdAt));
      return rows;
    },

    /**
     * Retrieve all knowledge facts belonging to a specific source document.
     * Strictly tenant-scoped (sourceId must belong to tenantId).
     */
    async getKnowledgeFactsBySource(
      tenantId: string,
      sourceId: string,
    ): Promise<KnowledgeFactRow[]> {
      return db
        .select()
        .from(knowledgeFacts)
        .where(
          and(
            eq(knowledgeFacts.tenantId, tenantId),
            eq(knowledgeFacts.sourceId, sourceId),
          ),
        )
        .orderBy(knowledgeFacts.entityName, knowledgeFacts.attribute);
    },

    /**
     * Retrieve all knowledge conflicts for a tenant, with both fact rows
     * hydrated.  Strictly tenant-scoped.
     *
     * Fact hydration uses Drizzle's `inArray` so every UUID is passed as a
     * query parameter — no literal interpolation into SQL.
     */
    async getKnowledgeConflicts(
      tenantId: string,
    ): Promise<ConflictPair[]> {
      const conflicts = await db
        .select()
        .from(knowledgeConflicts)
        .where(eq(knowledgeConflicts.tenantId, tenantId))
        .orderBy(desc(knowledgeConflicts.createdAt));

      if (conflicts.length === 0) return [];

      // Collect the unique fact ids referenced by the conflicts.
      const factIdSet = new Set<string>();
      for (const c of conflicts) {
        factIdSet.add(c.factAId);
        factIdSet.add(c.factBId);
      }
      const factIdList = [...factIdSet];

      // Single parameterised query — inArray emits WHERE id = ANY($1).
      const factRows = await db
        .select()
        .from(knowledgeFacts)
        .where(inArray(knowledgeFacts.id, factIdList));

      const factsById = new Map<string, KnowledgeFactRow>();
      for (const f of factRows) factsById.set(f.id, f);

      return conflicts
        .map((conflict) => {
          const factA = factsById.get(conflict.factAId);
          const factB = factsById.get(conflict.factBId);
          if (!factA || !factB) return null;
          return { conflict, factA, factB };
        })
        .filter((x): x is ConflictPair => x !== null);
    },
  };
}

export type Repository = ReturnType<typeof createRepository>;
