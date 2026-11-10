# Orgni Memory Audit

**Audit date:** 12 October 2026  
**Scope:** Current repository implementation of document-backed organizational knowledge and request context. This is a code and schema audit; it did not inspect a live deployment or production database.

## Executive summary

Orgni has tenant-scoped persistence for uploaded documents, extracted organizational tokens, ontology fact sets, and reviewer actions. It can build read-only organizational-model views from these records. The conversational request path does not retrieve those facts or document contents: it supplies the language model only with a document count, the latest filename, and a count of extracted fact sets. The planned working, episodic, semantic, and compressed memory architecture in `ORGNI_TECHNOLOGY_STACK.md` is not implemented in this repository as described.

**Assessment:** Document knowledge storage exists; useful content-level memory and retrieval are not implemented in the assistant request path. Do not describe the current assistant as remembering or searching organizational knowledge without this qualification.

## What is implemented

- PostgreSQL schema stores sources, tokens, ontology fact payloads, and review records. Each includes a tenant identifier; repository list/model queries apply tenant filters.
- Document upload can persist processed outcomes when `DATABASE_URL` is configured. The upload response can still return inline results when persistence is not configured; those results are not durable.
- The model API exposes tenant-scoped overview, entity, fact, relationship, exception, and activity views over the stored records.
- The request engine loads tenant model rows, then builds context lines from document count, most recent filename, and extracted fact-set count. Those lines are recorded in completed actions as `sourcesUsed` and passed to the configured reply provider.
- The UI knowledge graph is built from model API entities and relationships; it is a view of extracted model data, not a retrieval index.

## Findings

### High — Assistant context does not contain retrieved knowledge

`gatherContext()` in `artifacts/api-server/src/product/engine.ts` reads model records but only forwards aggregate counts and the newest filename. It does not pass fact values, token content, source excerpts, or matching documents into the model. The Anthropic provider receives only those summary strings. As a result, a user asking a specific question about an uploaded document cannot get an evidence-based answer through this request path.

### High — The documented memory design exceeds the implementation

The Phase 4 design describes Redis working memory, PostgreSQL checkpoints/event storage, pgvector semantic retrieval, Neo4j relationships, episode records, and linked compression summaries. The inspected schema/migrations contain document and product-state tables; no vector columns, pgvector extension, Redis memory client, episode store, or compression jobs were found. The current model is document processing plus persisted structured results, not the complete planned memory subsystem.

### Medium — Context gathering errors look like “no memory”

If model loading fails, `gatherContext()` logs a warning and returns an empty context array. The assistant then falls back to a generic insufficient-context response. This makes a storage/query failure indistinguishable to the caller from an organization with no uploaded knowledge.

### Medium — Tenant scoping is present, but row-level ACL retrieval is not demonstrated

Repository model reads are scoped by tenant. Upload currently assigns a tenant-wide READ ACL, and there is no content retrieval path that filters candidate facts/documents against a user's specific permissions. This is not evidence of a cross-tenant leak; it is a gap against the design's finer-grained permission-scoped memory requirements.

## Verification

- Inspected document schema, migrations, repository queries, document routes, model routes, request engine, reply provider, knowledge view code, and the Phase 4 architecture description.
- Attempted the focused API engine tests and DB repository tests. Vitest failed during startup because esbuild reported `Cannot read directory "../../../../../..": Access is denied` while loading each package's config. No test cases ran.
- The DB repository suite is integration-only and requires `DATABASE_URL` pointing to a migrated throwaway PostgreSQL database. The runtime readiness check verified connectivity only; no live database-backed document or tenant-model behavior was verified.

## Runtime smoke audit

**Run date:** 12 October 2026. Started the local API from `artifacts/api-server/dist/index.mjs` using the existing local environment configuration. No environment values or record contents were printed.

- `GET /api/healthz`: **200 OK**.
- `GET /api/version`: **200 OK**, development mode.
- `GET /api/health/ready`: **503 degraded**. PostgreSQL check passed; Document Intelligence check failed; ontology is not configured and is treated as optional.
- `GET /api/model/overview` and `GET /api/documents` without a session: **401 unauthenticated**, confirming these data endpoints require authentication.
- The configured Anthropic key is absent, so the running configuration uses the deterministic template provider rather than the Anthropic provider.
- No authenticated tenant session was available. Therefore no tenant records were read and content-level memory behavior could not be exercised through authenticated routes. The earlier static finding about the request context is not upgraded to an authenticated end-to-end test result.
- The temporary API process was stopped after the smoke checks.

**Runtime conclusion:** API process and database connectivity are live; document ingestion dependency is unavailable, and authenticated memory retrieval remains unverified. The static inspection still shows the request engine forwards metadata summaries rather than document/fact content.

### Follow-up authenticated browser check

After aligning the local frontend API URL with the browser host (`localhost`), the user signed in through Edge. The log records a successful login followed by authenticated `GET /api/documents`, `GET /api/model/entities`, `GET /api/model/relationships`, and `GET /api/product/state` responses with **200**; subsequent cache revalidation responses were **304**. Earlier `401` responses occurred before the host alignment, when the browser did not send the API's host-only session cookie. This verifies browser session continuity and access to these tenant-scoped API routes. It does not verify that the assistant uses extracted document content in an answer, and the log excerpt does not include response bodies or prove documents exist.

## Recommended follow-up

1. Add content-level retrieval over persisted facts/tokens with source provenance, tenant and user-permission filtering, and relevance limits; feed only those retrieved results into the provider.
2. Make retrieval failure observable separately from an empty result, and include source identifiers in citations shown to users.
3. Update the architecture document to label unimplemented memory components as planned, or implement them behind explicit milestones.
4. Add runnable tests for request-context retrieval and tenant/permission isolation; run repository integration tests against a disposable migrated database.

## Relevant code

- `artifacts/api-server/src/product/engine.ts` — context gathering and request processing.
- `artifacts/api-server/src/product/intelligence-anthropic.ts` — model receives only gathered context lines.
- `artifacts/api-server/src/routes/documents.ts` — document processing and persistence.
- `lib/db/src/schema/documents.ts` — sources, tokens, facts, reviews.
- `lib/db/src/repository.ts` — tenant-scoped persistence and model reads.
- `artifacts/api-server/src/lib/model.ts` — aggregated organizational-model views.
- `ORGNI_TECHNOLOGY_STACK.md`, Phase 4 — planned memory architecture.
