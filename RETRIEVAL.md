# Evidence Retrieval — Implementation Guide

This document describes the evidence retrieval layer added to Orgni. It covers
the retrieval flow, tenant isolation, relevance ranking, source attribution,
no-knowledge behaviour, required configuration, and how to run the relevant tests.

---

## Architecture overview

```
User question
     │
     ▼
engine.ts — detectIntent(text)
     │          ├─ answer_questions  ──────────────────────────────────┐
     │          ├─ find_documents    ──────────────────────────────────┤ evidence-dependent
     │          ├─ financial_actions (action verbs only) ─────────────┤
     │          └─ prepare_work / schedule_meetings / ... (non-doc)    │
     │                                                                 │
     └─► gatherContext(tenantId, question)                             │
              │                                                        │
              ├── repository.loadTenantModel()  (workspace counts)    │
              │                                                        │
              └── searchTenantEvidence()   ◄── sole retrieval impl    │
                       (artifacts/api-server/src/lib/evidence.ts)     │
                              │                                        │
                              ├── extractKeywords(question)           │
                              ├── repository.listTenantTokens(tid)    │
                              ├── scoreToken() per token              │
                              ├── repository.listSources(tid)         │
                              └── formatContextLine() → [filename]    │
                                          │                           │
                                          ▼                           │
                             EvidenceResult { matches,  ◄────────────┘
                                contextLines, sourcesUsed,
                                totalConsidered }
                                          │
                              IntelligenceContext.evidence
                                          │
                    ┌─────────────────────┴──────────────────────┐
                    ▼                                             ▼
       TemplateIntelligenceProvider              AnthropicIntelligenceProvider
       (attribution.ts helpers)                 (attribution.ts helpers)
```

---

## Retrieval implementation

**Single authoritative file**: `artifacts/api-server/src/lib/evidence.ts`

`searchTenantEvidence(repository, tenantId, question, limits?)` is the only
retrieval entry point. It is called by `gatherContext` in `engine.ts` and by the
PostgreSQL integration tests in `lib/db/tests/evidence-retrieval.test.ts`.

The `lib/evidence/` package and `findEvidence()` on the repository were removed
— they were never used by the engine.

---

## How tokens are used

Every processed source document produces **organizational tokens** in the
`tokens` table. Each token carries:

- `tokenKind` — EVENT, ENTITY, RELATION, STATE, POLICY, QUERY, ACTION
- `eventType`, `subjectId`, `objectId` — structural identity fields
- `scalarValue` — business content (invoice numbers, amounts, parties)
- `sourceRefs[].excerpt` — short text excerpts from the source document
- `confidence` — extraction confidence (0–1)

`searchTenantEvidence` searches these fields; it does not use the `facts` table.

---

## Tenant-scoped matching

Every retrieval call is scoped with an explicit `tenantId`:

```typescript
const evidenceResult = await searchTenantEvidence(
  modelStore.repository,
  tenantId,   // always from req.principal.tenantId — never user-supplied
  question,
);
```

`listTenantTokens(tenantId)` executes `SELECT … WHERE tenant_id = ?`.
`listSources(tenantId)` does the same. Cross-tenant leakage is structurally
impossible at the SQL level.

---

## Intent routing

Invoice-lookup questions must not be mis-routed to `financial_actions`. The
`financial_actions` intent rule matches only explicit action verbs:

```
/\b(pay|process payment|approve payment|raise invoice|issue invoice|
    refund|wire transfer|reconcile)\b/i
```

Questions like "What is the total on invoice CI-2026-01052?" fall through to
`answer_questions`, which is evidence-dependent and triggers retrieval.

---

## Keyword extraction

`extractKeywords(question)` returns two buckets:

| Bucket | How matched | Score weight |
|--------|-------------|-------------|
| **identifiers** | Structured patterns: `CI-`, `SI-`, `PO-`, `EMP-`, etc. | **10 per hit** |
| **terms** | Lowercased, de-duplicated words not in the stop-word list | **1 per hit** |

Business identifiers are extracted before normalisation so `CI-2026-01052` is
never split into fragments.

---

## Relevance ranking and relevance floor

`scoreToken(searchText, keywords)` sums identifier hits (×10) + term hits (×1).
Tokens with score 0 are excluded. Survivors are sorted by `score DESC,
confidence DESC`.

**Minimum attribution score: 2.** A single generic word match (score 1 — e.g.
"status", "invoice" alone) is below the floor and produces an `insufficient`
assessment, not a citation. This makes the `insufficient` outcome reachable and
prevents single-word queries from generating unsupported citations.

---

## Retrieval limits

| Limit | Default | Override |
|-------|---------|----------|
| Max result records | 10 | `maxResults` in `EvidenceRetrievalLimits` |
| Max total context chars | 3 000 | `maxTotalChars` |
| Max chars per context line | 300 | `maxLineChars` |

Pass `limits` as the fourth argument to `searchTenantEvidence` to override.

---

## Source attribution

After ranking:

1. Unique `sourceId`s are collected from the top matches.
2. `listSources(tenantId)` (tenant-scoped) resolves filenames.
3. Each match is formatted as `[filename] <detail> (confidence%)`.
4. `sourcesUsed` is de-duplicated: `Array<{ sourceId, filename }>`.

`attribution.ts` classifies the result:

| Assessment | Condition |
|---|---|
| `sufficient` | ≥ 1 match with score ≥ 2; no cross-source contradiction |
| `contradictory` | Two **distinct** sources disagree on the same `(eventType, subjectId)` |
| `insufficient` | Matches exist but all score < 2 |
| `none` | No matches at all |

`composeAttributedReply` formats the final reply. `buildSourceBlock` filters out
the `"unknown"` placeholder — no invented filenames are ever cited.

---

## No-knowledge behaviour

When retrieval finds nothing or evidence is insufficient:

- `searchTenantEvidence` **never throws** — DB errors return an empty
  `EvidenceResult`.
- `assessEvidence(null)` → `{ kind: "none" }`.
- `noKnowledgeReply(capability)` returns a capability-appropriate message with
  no filenames, IDs, or numeric values.
- The **Anthropic provider** skips the model call for `none`/`insufficient`
  evidence **only** for evidence-dependent capabilities (`answer_questions`,
  `find_documents`, `financial_actions`). Action-oriented capabilities
  (`prepare_work`, `schedule_meetings`, `draft_emails`, `send_emails`) proceed
  to the model regardless — they do not require document evidence.

---

## Contradiction detection

`assessEvidence` checks for the same `(eventType, subjectId)` key appearing in
**two or more distinct sources** with different scalar values. A single source
containing multiple tokens with the same key is not flagged — that is an
expected product of multi-page extraction from one document.

---

## Configuration

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | For retrieval | PostgreSQL. Without it, `gatherContext` returns null evidence and all questions get a no-knowledge reply. |
| `ANTHROPIC_API_KEY` | Optional | Activates the Anthropic provider at boot. Without it the template provider is used. |
| `ORGNI_MODEL` | Optional | Override the Anthropic model (default `claude-opus-5`). |

Migrate the schema before starting:

```sh
pnpm --filter @workspace/db run migrate
```

---

## Running the tests

### Unit tests (no database required)

```sh
# Full api-server hermetic test suite (167 passed, 10 skipped)
pnpm --filter @workspace/api-server run test

# Or targeted evidence retrieval and attribution suites:
pnpm exec vitest run artifacts/api-server/tests/attribution.test.ts
pnpm exec vitest run artifacts/api-server/tests/product-engine.test.ts
pnpm exec vitest run artifacts/api-server/tests/step5-verification.test.ts
```

**Expected**: 41 (attribution) + 15 (product-engine) + 24 (step5) = 80 passed. Full api-server suite: 167 passed, 10 skipped.

### PostgreSQL integration tests

```sh
DATABASE_URL=postgres://... pnpm --filter @workspace/db run migrate
DATABASE_URL=postgres://... pnpm --filter @workspace/db run test
```

**Expected without DATABASE_URL**: 15 skipped, 0 failed.
**Expected with DATABASE_URL**: 15 passed (8 evidence-retrieval including e2e Meridian test + 7 repository), 0 skipped.

---

## Document-processing service dependencies

Evidence retrieval depends on documents having been fully processed by the
worker pipeline before questions are asked:

1. Document uploaded via `POST /api/documents` (api-server).
2. Worker calls the Document Intelligence service (Python FastAPI,
   `intelligence/document-intelligence/`), which extracts tokens and facts.
3. Worker persists via `repository.persistDocument()`.

Until a document has state `COMPLETED`, its tokens are absent from the `tokens`
table and will not appear in retrieval results.

| Prerequisite | Notes |
|---|---|
| PostgreSQL | Schema migrated. Tables: `sources`, `tokens`, `facts`, `reviews`. |
| Worker process | Must run to process uploaded documents. |
| Document Intelligence service | Python FastAPI — required for token extraction. |

The retrieval layer itself only requires PostgreSQL at query time.

---

## Files added or modified

| File | Change |
|---|---|
| `artifacts/api-server/src/lib/evidence.ts` | Authoritative retrieval: `searchTenantEvidence`, `extractKeywords`, scoring, context formatting |
| `artifacts/api-server/src/product/attribution.ts` | `assessEvidence` (floor=2, same-field contradiction check, exception token guard), `composeAttributedReply`, `buildSourceBlock`, `noKnowledgeReply` |
| `artifacts/api-server/src/product/engine.ts` | `gatherContext` calls retrieval; `IntelligenceContext.evidence`; `sourcesUsed` records only actually cited sources |
| `artifacts/api-server/src/product/intelligence-anthropic.ts` | No-knowledge short-circuit scoped to evidence-dependent capabilities only |
| `artifacts/api-server/tests/attribution.test.ts` | 41 unit tests (including Task B cited sources and Task C false contradiction regressions) |
| `artifacts/api-server/tests/product-engine.test.ts` | Evidence integration tests |
| `artifacts/api-server/tests/step5-verification.test.ts` | 24 acceptance tests |
| `lib/db/tests/evidence-retrieval.test.ts` | 8 PostgreSQL integration tests (including e2e Meridian request test; skip cleanly without DATABASE_URL) |
| `RETRIEVAL.md` | This file |
| `.gitignore` | Added `.venv/`, `venv/` |
