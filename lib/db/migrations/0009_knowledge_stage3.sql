-- Stage 3: Cross-document knowledge linking and conflict classification.
--
-- Changes:
--   knowledge_facts     + reporting_date (date, nullable)
--   knowledge_conflicts + reporting_date_a, reporting_date_b (date, nullable)
--                       + POTENTIALLY_OUTDATED as a valid conflict_type value
--                         (enforced by application, not a DB constraint, so
--                          existing rows are unaffected)
--
-- reporting_date is the period the fact describes (e.g. FY2026 Q1 → 2026-01-01).
-- It is extracted from the worksheet name or section heading and stored as an
-- ISO date string in the 'date' column.  NULL when no date can be reliably
-- inferred — the application never invents a date.
--
-- reporting_date_a / reporting_date_b on knowledge_conflicts mirror the
-- reporting dates of the two participating facts at the moment the conflict
-- was detected.  They allow the reviewer to understand temporal ordering
-- without joining back to knowledge_facts every time.

ALTER TABLE "knowledge_facts"
    ADD COLUMN IF NOT EXISTS "reporting_date" date;
--> statement-breakpoint

ALTER TABLE "knowledge_conflicts"
    ADD COLUMN IF NOT EXISTS "reporting_date_a" date;
--> statement-breakpoint

ALTER TABLE "knowledge_conflicts"
    ADD COLUMN IF NOT EXISTS "reporting_date_b" date;
--> statement-breakpoint

-- Index to support "find the most recent fact for entity+attribute" queries.
CREATE INDEX IF NOT EXISTS "kf_tenant_entity_attr_date_idx"
    ON "knowledge_facts" USING btree ("tenant_id", "entity_name", "attribute", "reporting_date");
