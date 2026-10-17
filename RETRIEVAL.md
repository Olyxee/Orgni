# Evidence Retrieval — Implementation Guide

This document covers the evidence retrieval layer added in Steps 1–5. It explains
the retrieval flow, tenant isolation, relevance ranking, source attribution,
no-knowledge behaviour, required configuration, and how to run the tests.

---

## Architecture overview

```
User question
     │
     ▼
engine.ts  ─── gatherContext(tenantId, question)
                        │
                        ├── repository.loadTenantModel()   (workspace counts)
                        │
                        └── searchTenantEvidence()         (lib/evidence.ts)
                                    │
                                    ├── extractKeywords()  (terms + business IDs)
                                    ├── repository.listTenantTokens(tenantId)
                                    ├── scoreToken()       (per token)
                                    ├── repository.listSources(tenantId)
                                    └── formatContextLine()  (with [filename])
                                                │
                                                ▼
                             EvidenceResult { matches, contextLines,
                                             sourcesUsed, totalConsidered }
                                                │
                                                ▼
                        IntelligenceContext.evidence
                                    │
                    ┌───────────────┴────────────────┐
                    ▼                                ▼
         TemplateIntelligenceProvider     AnthropicIntelligenceProvider
         (attribution.ts helpers)        (attribution.ts helpers)
                    │                                │
                    └───────────────┬────────────────┘
                                    ▼
                               reply (string)
```

---

## How facts and tokens are used

Every processed source document produces **organizational tokens** stored in the
`tokens` table. Each token is a JSON payload (`OrganizationalToken`) carrying:

- `tokenKind` — EVENT, ENTITY, RELATION, STATE, POLICY, QUERY, or ACTION
- `eventType`, `subjectId`, `objectId`, `predicate` — structural identity fields
- `scalarValue` — the richest business content (invoice numbers, amounts, parties)
- `sourceRefs[].excerpt` — a short text excerpt from the originating document
- `confidence` — extraction confidence (0–1)

The `facts` table stores the full `OntologyResult` payload per source (entities,
relationships, conflicts, warnings). Facts are used by the organisational model
views (`/api/model`). The retrieval layer uses **tokens**, not facts, because
tokens carry normalised scalar values and source excerpts that match keyword queries
directly without requiring ontology traversal.

---

## Tenant-scoped matching

Every retrieval call is scoped with an explicit `tenantId`:

```typescript
// engine.ts — tenantId comes from the authenticated session principal
const evidenceResult = await searchTenantEvidence(
  modelStore.repository,
  tenantId,        // <── from req.tenantId (set by authenticate middleware)
  question,
);
```

`searchTenantEvidence` calls `repository.listTenantTokens(tenantId)`, which
executes `SELECT … WHERE tenant_id = ?`. The repository never accepts a
caller-supplied tenant ID that has not been verified by the authentication
middleware. Cross-tenant leakage is structurally impossible at the query level.

---

## Keyword extraction

`extractKeywords(question)` (in `lib/evidence.ts`) returns two buckets:

| Bucket | How matched | Score weight |
|--------|-------------|-------------|
| **identifiers** | Business ID patterns: `CI-`, `SI-`, `PO-`, `INV-`, `EMP-`, etc. | **10 per hit** |
| **terms** | Lowercased, de-duplicated words not in the English stop-word list | **1 per hit** |

Business identifiers are extracted before normalisation so that `INV-2024-0081`
is never split into `inv`, `2024`, `0081`.

---

## Relevance ranking

Each token is scored by `scoreToken(searchText, keywords)`:

1. All identifier hits (×10) + all term hits (×1) are summed.
2. Tokens with score 0 are excluded.
3. Surviving tokens are sorted by `score DESC, confidence DESC`.
4. The top `maxResults` tokens are taken forward.

---

## Retrieval limits

| Limit | Default | Config key |
|-------|---------|------------|
| Maximum result records | 10 | `EvidenceRetrievalLimits.maxResults` |
| Maximum total characters across all context lines | 3 000 | `EvidenceRetrievalLimits.maxTotalChars` |
| Maximum characters per single context line | 300 | `EvidenceRetrievalLimits.maxLineChars` |

Override per-call:

```typescript
await searchTenantEvidence(repo, tenantId, question, {
  maxResults: 5,
  maxTotalChars: 1500,
});
```

---

## Source attribution

After ranking, the retrieval layer:

1. Collects the unique `sourceId`s from the top matches.
2. Calls `repository.listSources(tenantId)` (also tenant-scoped) to resolve
   filenames.
3. Formats each match as `[filename] <detail> (confidence%)` via
   `formatContextLine()`.
4. De-duplicates sources into `EvidenceResult.sourcesUsed`:
   `Array<{ sourceId, filename }>`.

The `attribution.ts` module (in `artifacts/api-server/src/product/`) then
classifies the result:

| Assessment | Condition |
|---|---|
| `sufficient` | ≥1 match with score ≥ 1 and no contradictions |
| `contradictory` | Same `(eventType, subjectId)` appears in 2+ sources with different scalar values |
| `insufficient` | Matches exist but all score below the threshold |
| `none` | No matches at all |

`composeAttributedReply` formats the final reply:

- **sufficient** — evidence lines + `Sources:` block with real filenames
- **contradictory** — evidence lines + sources + explicit conflict warning
- **insufficient** — "found related documents but they don't contain a clear answer"
- **none** — capability-appropriate no-knowledge reply (no filenames invented)

`buildSourceBlock` filters out the `"unknown"` placeholder — a source that could
not be resolved is never cited.

---

## No-knowledge behaviour

When retrieval finds nothing, or when the database is unavailable:

- `searchTenantEvidence` **never throws** — DB errors are caught and return an
  empty `EvidenceResult`.
- `assessEvidence(null)` returns `{ kind: "none" }`.
- `noKnowledgeReply(capability)` returns a capability-appropriate message that
  contains no filenames, document IDs, or numeric values.
- The Anthropic provider **skips the model call entirely** for `none` or
  `insufficient` assessments and returns the no-knowledge reply directly.
- The template provider delegates `answer_questions` and `find_documents` entirely
  to `composeAttributedReply`, so it never fabricates an answer.

---

## Provider integration

Both providers receive evidence through `IntelligenceContext.evidence`:

```typescript
export interface IntelligenceContext {
  request: EngineRequest;
  intent: Intent;
  organisationName: string;
  contextLines: string[];
  evidence?: EvidenceResult | null;
}
```

**Template provider** — `assessEvidence` + `composeAttributedReply` for
`answer_questions` and `find_documents`; appends evidence only when `sufficient`
for action-oriented capabilities.

**Anthropic provider** — passes evidence lines and source attribution into the
LLM user message. When assessment is `contradictory`, a `WARNING:` note is
appended. System prompt explicitly instructs the model to report what documents
say, flag contradictions, and never invent values not present in evidence.

---

## Configuration

### Required environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | For evidence retrieval | PostgreSQL connection string. Without it, `gatherContext` returns null evidence and all questions get a no-knowledge reply. |
| `ANTHROPIC_API_KEY` | Only for Anthropic provider | When set, the Anthropic provider is activated at boot (`index.ts`). Without it, the template provider is used. |
| `ORGNI_MODEL` | No | Override the Anthropic model. Defaults to `claude-opus-5`. |

### Database setup

Run migrations before starting the API server:

```sh
pnpm --filter @workspace/db run migrate
```

---

## Running the tests

### Unit tests (no database required)

```sh
# Evidence retrieval service
pnpm exec vitest run lib/evidence/tests/index.test.ts

# Attribution helpers
pnpm exec vitest run artifacts/api-server/tests/attribution.test.ts

# Engine + approval gate regression
pnpm exec vitest run artifacts/api-server/tests/product-engine.test.ts

# Step 5 acceptance criteria (invoice retrieval, no-knowledge, tenant isolation)
pnpm exec vitest run artifacts/api-server/tests/step5-verification.test.ts
```

Run all at once:

```sh
pnpm exec vitest run \
  lib/evidence/tests/index.test.ts \
  artifacts/api-server/tests/attribution.test.ts \
  artifacts/api-server/tests/product-engine.test.ts \
  artifacts/api-server/tests/step5-verification.test.ts
```

Expected: **78 passed, 0 failed**.

### PostgreSQL integration tests

These require a running Postgres instance with the schema migrated:

```sh
DATABASE_URL=postgres://... pnpm exec vitest run lib/db/tests/repository.test.ts
```

Expected: **15 passed** (they use `skipIf(!DATABASE_URL)` and skip cleanly
without a database).

### Full api-server regression suite

```sh
pnpm exec vitest run artifacts/api-server/tests/
```

---

## Document-processing service dependencies

Evidence retrieval depends on documents having been **processed by the worker
pipeline** before questions are asked. The pipeline:

1. Receives an uploaded document via the `/api/documents` route (api-server).
2. Publishes a job for the worker (`lib/worker`).
3. The worker calls the **Document Intelligence service** (`intelligence/document-intelligence/main.py`), a Python service that extracts tokens and facts from the document.
4. The worker persists the resulting tokens and facts to Postgres via `repository.persistDocument()`.

Until a document has been fully processed (state = `COMPLETED`), its tokens are
not present in the `tokens` table and will not appear in evidence retrieval.

### Operational prerequisites

| Prerequisite | Notes |
|---|---|
| PostgreSQL | Schema migrated (`pnpm --filter @workspace/db run migrate`). Tables: `sources`, `tokens`, `facts`, `reviews`. |
| Worker process | Must be running to process uploaded documents. Without it, uploads land in `RECEIVED` state and are never tokenised. |
| Document Intelligence service | Python FastAPI service (`intelligence/document-intelligence/main.py`). Called by the worker. Required for token extraction. |
| File storage | Uploaded documents must be reachable by the worker for extraction. |

The retrieval layer itself requires only **Postgres** at query time. The worker
and Document Intelligence service are only required when new documents are being
ingested. Existing tokens in the database can be queried without those services
running.

---

## Files added in Steps 1–5

| File | Purpose |
|---|---|
| `lib/db/src/repository.ts` | Added `findEvidence()`, `EvidenceMatch`, `EvidenceRetrievalOptions`, `EvidenceRetrievalResult` |
| `lib/evidence/src/index.ts` | `retrieveEvidence()`, `retrieveEvidenceByType()`, `extractKeywords()`, `normalizeText()` |
| `lib/evidence/package.json` | New `@workspace/evidence` package |
| `lib/evidence/tests/index.test.ts` | 18 unit tests |
| `artifacts/api-server/src/lib/evidence.ts` | `searchTenantEvidence()`, `extractKeywords()`, `scoreToken()`, `formatContextLine()` |
| `artifacts/api-server/src/product/attribution.ts` | `assessEvidence()`, `composeAttributedReply()`, `buildSourceBlock()`, `noKnowledgeReply()` |
| `artifacts/api-server/src/product/engine.ts` | Updated `gatherContext()`, `IntelligenceContext.evidence`, `TemplateIntelligenceProvider` |
| `artifacts/api-server/src/product/intelligence-anthropic.ts` | Updated to use attribution helpers; skips model for no-evidence cases |
| `artifacts/api-server/tests/attribution.test.ts` | 26 unit tests |
| `artifacts/api-server/tests/product-engine.test.ts` | +6 evidence integration tests |
| `artifacts/api-server/tests/step5-verification.test.ts` | 24 acceptance tests (§2–§5) |
| `lib/db/tests/repository.test.ts` | +6 PostgreSQL integration tests for `findEvidence` and tenant isolation |
