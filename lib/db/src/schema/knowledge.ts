/**
 * Persistent organisational knowledge storage — Stage 2 + Stage 3.
 *
 * Two tables:
 *
 *   knowledge_facts    One row per (tenant, source, entity, attribute) claim.
 *                      Multiple rows with the same entity+attribute but
 *                      different source_ids represent multiple sources
 *                      supporting or contradicting the same fact.
 *                      Rows are never merged or deleted on reprocess —
 *                      stale rows from the same source are replaced, but
 *                      rows from other sources remain untouched.
 *
 *   knowledge_conflicts  Pairs of knowledge_facts rows with the same
 *                        (tenant, entity, attribute) from different sources.
 *                        Conflict types (Stage 3):
 *                          DUPLICATE_VALUE      — same value, multiple sources
 *                          CONTRADICTORY_VALUE  — different values, no reliable date ordering
 *                          POTENTIALLY_OUTDATED — different values, fact_a has an earlier
 *                                                 reporting_date than fact_b
 *
 * Tenant isolation: tenant_id is present on every row and enforced on
 * every query. No cross-tenant join is possible through these tables.
 *
 * FK design: knowledge_facts.source_id references sources.source_id with
 * ON DELETE CASCADE so that deleting a source removes its facts and any
 * conflicts those facts participate in.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  date,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { sources } from "./documents";

// ── knowledge_facts ──────────────────────────────────────────────────────────

export const knowledgeFacts = pgTable(
  "knowledge_facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Tenant that owns this fact. Never null. */
    tenantId: text("tenant_id").notNull(),

    /**
     * The source document this fact was extracted from.
     * ON DELETE CASCADE — removing a source removes its facts and any
     * conflicts that reference those facts.
     */
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.sourceId, { onDelete: "cascade" }),

    /**
     * Entity name as extracted (e.g. "Medium Duty Truck").
     * Not normalised here — normalisation is a future entity-resolution step.
     */
    entityName: text("entity_name").notNull(),

    /** Attribute label (e.g. "Revenue", "Quantity", "Cost"). */
    attribute: text("attribute").notNull(),

    /** Raw string value exactly as extracted from the cell (e.g. "4850000"). */
    rawValue: text("raw_value").notNull(),

    /**
     * Parsed numeric value. NULL when rawValue is not a number.
     * Stored as double precision to cover integers and decimals without
     * losing information present in rawValue.
     */
    numericValue: doublePrecision("numeric_value"),

    /**
     * Value type discriminator so retrieval can filter or coerce correctly.
     * "numeric" | "text" | "date" | "boolean" — open-ended for future types.
     */
    valueType: text("value_type").notNull().default("text"),

    /** Display name of the XLSX worksheet tab (e.g. "Revenue Summary"). */
    worksheetName: text("worksheet_name"),

    /** 1-based row number in the worksheet. NULL for non-tabular sources. */
    rowNumber: integer("row_number"),

    /**
     * Excel cell reference for the value cell (e.g. "D2").
     * Authoritative when extracted via spreadsheet_rows; position-approximated
     * via the text-fallback path. NULL for non-tabular sources.
     */
    cellRef: text("cell_ref"),

    /**
     * Excel cell reference for the entity/subject cell (e.g. "A2").
     * Same provenance as cellRef.
     */
    entityCellRef: text("entity_cell_ref"),

    /**
     * The reporting period this fact describes, as an ISO date (YYYY-MM-DD).
     *
     * This is the period the fact is ABOUT, not when it was uploaded.
     * A later upload can describe an earlier reporting period, so upload
     * order alone does not determine temporal order.
     *
     * Extracted from the worksheet name or section heading via a heuristic
     * parser (see inferReportingDate in reporting-date.ts).  NULL when no
     * date can be reliably inferred — never invented.
     *
     * Examples:
     *   Worksheet "FY2026 Q1 Revenue" → "2026-01-01"
     *   Worksheet "2026-07-01 Actuals" → "2026-07-01"
     *   Worksheet "FY2025 Actual"      → "2025-01-01"
     *   Worksheet "Sales Data"         → NULL
     */
    reportingDate: date("reporting_date"),

    /** Confidence score carried from the SPREADSHEET_FACT token (0–1). */
    confidence: doublePrecision("confidence").notNull().default(0.82),

    /**
     * Epistemic status carried from the token.
     * "OBSERVED" | "ASSERTED" | "INFERRED" | "PREDICTED" | "DISPUTED"
     */
    epistemicStatus: text("epistemic_status").notNull().default("OBSERVED"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Primary retrieval path: tenant + entity + attribute.
    index("kf_tenant_entity_attr_idx").on(
      table.tenantId,
      table.entityName,
      table.attribute,
    ),
    // Cross-document linking with temporal ordering.
    index("kf_tenant_entity_attr_date_idx").on(
      table.tenantId,
      table.entityName,
      table.attribute,
      table.reportingDate,
    ),
    // Retrieval by source (for reprocess replacement and source-level queries).
    index("kf_source_idx").on(table.sourceId),
    // Retrieval by tenant (for model aggregation).
    index("kf_tenant_idx").on(table.tenantId),
    // Unique per (source, entity, attribute) so reprocessing the same
    // source is an upsert rather than an insert producing duplicates.
    uniqueIndex("kf_source_entity_attr_uq").on(
      table.sourceId,
      table.entityName,
      table.attribute,
    ),
  ],
);

// ── knowledge_conflicts ──────────────────────────────────────────────────────

export const knowledgeConflicts = pgTable(
  "knowledge_conflicts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Tenant that owns both facts. Never null. */
    tenantId: text("tenant_id").notNull(),

    /** Entity name shared by both facts. */
    entityName: text("entity_name").notNull(),

    /** Attribute shared by both facts. */
    attribute: text("attribute").notNull(),

    /**
     * The first fact in the pair (always the one with the smaller UUID).
     * ON DELETE CASCADE — removing either fact removes the conflict record.
     */
    factAId: uuid("fact_a_id")
      .notNull()
      .references(() => knowledgeFacts.id, { onDelete: "cascade" }),

    /** The second fact in the pair. */
    factBId: uuid("fact_b_id")
      .notNull()
      .references(() => knowledgeFacts.id, { onDelete: "cascade" }),

    /**
     * Nature of the relationship between the two facts.
     *
     * "DUPLICATE_VALUE"      — same value, different sources.  Both are
     *                          consistent evidence for the same claim.
     *
     * "CONTRADICTORY_VALUE"  — different values; no reliable date ordering
     *                          available (either one or both lack reportingDate).
     *
     * "POTENTIALLY_OUTDATED" — different values; fact_a.reportingDate is
     *                          strictly earlier than fact_b.reportingDate.
     *                          fact_a may describe an older period.  No
     *                          automatic winner — reviewer decides.
     */
    conflictType: text("conflict_type").notNull(),

    /**
     * Reporting date of fact_a at detection time.  NULL when fact_a has no
     * reportingDate.  Stored here to avoid a join during review.
     */
    reportingDateA: date("reporting_date_a"),

    /**
     * Reporting date of fact_b at detection time.  NULL when fact_b has no
     * reportingDate.
     */
    reportingDateB: date("reporting_date_b"),

    /**
     * Review status.
     * "OPEN"      — not yet reviewed.
     * "RESOLVED"  — a human has determined which fact is correct.
     * "DISMISSED" — acknowledged as expected (e.g. different reporting periods).
     */
    status: text("status").notNull().default("OPEN"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("kc_tenant_idx").on(table.tenantId),
    index("kc_tenant_entity_attr_idx").on(
      table.tenantId,
      table.entityName,
      table.attribute,
    ),
    // The application always inserts factAId < factBId (lexicographic on UUID),
    // so this unique index prevents duplicate conflict records.
    uniqueIndex("kc_pair_uq").on(table.factAId, table.factBId),
  ],
);

// ── TypeScript types ─────────────────────────────────────────────────────────

export type KnowledgeFactRow = typeof knowledgeFacts.$inferSelect;
export type InsertKnowledgeFact = typeof knowledgeFacts.$inferInsert;
export type KnowledgeConflictRow = typeof knowledgeConflicts.$inferSelect;
export type InsertKnowledgeConflict = typeof knowledgeConflicts.$inferInsert;

/** All valid conflict classification strings. */
export type ConflictType =
  | "DUPLICATE_VALUE"
  | "CONTRADICTORY_VALUE"
  | "POTENTIALLY_OUTDATED";
