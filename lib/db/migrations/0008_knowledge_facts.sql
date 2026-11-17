-- Stage 2: Persistent organisational knowledge storage.
--
-- knowledge_facts  — one row per (source, entity, attribute) claim.
-- knowledge_conflicts — pairs of facts with conflicting values.
--
-- Both tables are tenant-scoped. knowledge_facts has a unique index on
-- (source_id, entity_name, attribute) so that reprocessing the same source
-- upserts rather than duplicates facts.  knowledge_conflicts has a unique
-- index on (fact_a_id, fact_b_id) so that the same pair is never recorded
-- twice.

CREATE TABLE IF NOT EXISTS "knowledge_facts" (
    "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id"        text NOT NULL,
    "source_id"        text NOT NULL,
    "entity_name"      text NOT NULL,
    "attribute"        text NOT NULL,
    "raw_value"        text NOT NULL,
    "numeric_value"    double precision,
    "value_type"       text NOT NULL DEFAULT 'text',
    "worksheet_name"   text,
    "row_number"       integer,
    "cell_ref"         text,
    "entity_cell_ref"  text,
    "confidence"       double precision NOT NULL DEFAULT 0.82,
    "epistemic_status" text NOT NULL DEFAULT 'OBSERVED',
    "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at"       timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_conflicts" (
    "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id"     text NOT NULL,
    "entity_name"   text NOT NULL,
    "attribute"     text NOT NULL,
    "fact_a_id"     uuid NOT NULL,
    "fact_b_id"     uuid NOT NULL,
    "conflict_type" text NOT NULL,
    "status"        text NOT NULL DEFAULT 'OPEN',
    "created_at"    timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "knowledge_facts"
        ADD CONSTRAINT "knowledge_facts_source_id_sources_source_id_fk"
        FOREIGN KEY ("source_id") REFERENCES "public"."sources"("source_id")
        ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "knowledge_conflicts"
        ADD CONSTRAINT "knowledge_conflicts_fact_a_id_knowledge_facts_id_fk"
        FOREIGN KEY ("fact_a_id") REFERENCES "public"."knowledge_facts"("id")
        ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "knowledge_conflicts"
        ADD CONSTRAINT "knowledge_conflicts_fact_b_id_knowledge_facts_id_fk"
        FOREIGN KEY ("fact_b_id") REFERENCES "public"."knowledge_facts"("id")
        ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kf_tenant_entity_attr_idx"
    ON "knowledge_facts" USING btree ("tenant_id", "entity_name", "attribute");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kf_source_idx"
    ON "knowledge_facts" USING btree ("source_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kf_tenant_idx"
    ON "knowledge_facts" USING btree ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "kf_source_entity_attr_uq"
    ON "knowledge_facts" USING btree ("source_id", "entity_name", "attribute");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kc_tenant_idx"
    ON "knowledge_conflicts" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kc_tenant_entity_attr_idx"
    ON "knowledge_conflicts" USING btree ("tenant_id", "entity_name", "attribute");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "kc_pair_uq"
    ON "knowledge_conflicts" USING btree ("fact_a_id", "fact_b_id");
