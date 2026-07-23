/**
 * Document-pipeline repository.
 *
 * The one place that reads/writes sources, tokens, and facts. Every method takes
 * an explicit tenantId and scopes its query by it — callers cannot accidentally
 * cross tenants. Writes for one document are wrapped in a transaction so a
 * source and its tokens/facts land together or not at all.
 */
import { and, desc, eq } from "drizzle-orm";
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
      action: "CORRECT" | "REJECT";
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
  };
}

export type Repository = ReturnType<typeof createRepository>;
