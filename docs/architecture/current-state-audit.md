# Current-State Audit

Date: 2026-07-10

## Scope

This audit covers the current Orgni repository at `C:\dev\Orgni`, especially:

- `artifacts/orgni`
- `artifacts/orgni-app`
- `artifacts/api-server`
- `artifacts/orgni-docs`
- shared `lib/*`
- repository-level docs/config

The audit is intentionally descriptive. It does not approve the current implementation as the target architecture.

## Current Application Boundaries

### `artifacts/orgni`

Public marketing and documentation website.

Important files:

- `artifacts/orgni/src/App.tsx`
- `artifacts/orgni/src/pages/home.tsx`
- `artifacts/orgni/src/pages/docs.tsx`
- `artifacts/orgni/src/pages/api.tsx`
- `artifacts/orgni/src/components/site-header.tsx`
- `artifacts/orgni/src/components/waitlist-dialog.tsx`

Current role: public website only. It does not own product state, ingestion, document processing, canonical events, or memory.

### `artifacts/orgni-app`

Product UI for Sources, Lucy, Operating Model, workflows, exceptions, and business profile.

Important files/functions:

- `artifacts/orgni-app/src/App.jsx`
  - `api(path, options)`
  - `initialize()`
  - `refreshOrgData(nextOrgId)`
  - `createOrg({ files, name })`
  - `uploadFiles(files)`
  - `runIntake()`
  - `sendChat(text, mode)`
  - `runAssistantAction(action, msg)`
  - `reviewFinding(id, mode, patch)`
  - `saveWorkflow(payload, id)`
  - `scanExceptions()`
- `artifacts/orgni-app/src/localApi.js`
  - browser-local fallback for orgs, documents, engine context, workflows, and exceptions

Current role: product UI and a large amount of product orchestration. It calls backend routes directly and mirrors some backend behavior locally.

### `artifacts/api-server`

Node/Express backend for the product app.

Important files:

- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/routes/index.ts`
- `artifacts/api-server/engine/routes/index.js`
- `artifacts/api-server/engine/controllers/*.js`
- `artifacts/api-server/engine/models/*.js`
- `artifacts/api-server/engine/services/*.js`
- `artifacts/api-server/engine/engine/orgni.engine.js`
- `artifacts/api-server/engine/sdk/engine.sdk.js`

Current role: API gateway, application service, ingestion controller, parser, retrieval layer, knowledge map builder, validation manager, exception manager, action formatter, and chat context provider. This is too many responsibilities for the target architecture.

### `artifacts/orgni-docs`

Python/FastAPI document integrity service promoted from the separately developed upload pipeline.

Important files:

- `artifacts/orgni-docs/main.py`
- `artifacts/orgni-docs/pipeline/runner.py`
- `artifacts/orgni-docs/ocr/extractor.py`
- `artifacts/orgni-docs/extraction/extractor.py`
- `artifacts/orgni-docs/validation/engine.py`
- `artifacts/orgni-docs/integrity/trust_scorer.py`
- `artifacts/orgni-docs/schemas/document.py`
- `artifacts/orgni-docs/tests/test_api.py`
- `artifacts/orgni-docs/tests/test_pipeline.py`

Current role: standalone document integrity pipeline. It is present in the repo but is not yet called by the main Node upload flow.

## Current Upload Flow

Product upload starts in `artifacts/orgni-app/src/App.jsx`.

Relevant functions:

- `createOrg({ files, name })` creates an organization and optionally uploads files.
- `uploadFiles(files)` uploads files for an existing organization.

Both functions send multipart form data to:

```http
POST /api/orgs/:orgId/documents
```

Multipart field:

```text
files
```

The route is registered in:

- `artifacts/api-server/engine/routes/index.js`

Relevant route:

```js
router.post('/orgs/:orgId/documents', orgResolver, upload.array('files', 10), docCtrl.upload);
```

Multer is configured with:

- memory storage
- `fileSize: 10 * 1024 * 1024`
- `files: 10`

The controller is:

- `artifacts/api-server/engine/controllers/document.controller.js`

Current upload path:

1. `orgResolver` loads `req.org`.
2. `multer.memoryStorage()` holds uploaded files in memory.
3. `docCtrl.upload` validates file extension against `SUPPORTED_EXTENSIONS`.
4. `docModel.create` creates a document record with `status: "pending"`.
5. `parseAndUpdate(doc, orgId, file.buffer)` parses the in-memory buffer.
6. `docModel.update` stores extracted text as `content`.
7. `chunkText(content)` creates retrieval chunks.
8. `chunkModel.replaceForDocument` stores chunks.
9. If a knowledge map already exists, `OrgniEngine.update` runs asynchronously.
10. `orgModel.update` marks `knowledgeStatus: "partial"`.

## Controller Responsibilities

### `document.controller.js`

Owns too much of the current ingestion pipeline:

- validates presence of uploaded files
- validates supported extensions
- creates document records
- parses files
- updates document content/status
- chunks parsed text
- writes chunks
- logs activity
- triggers incremental knowledge map update
- shapes HTTP responses

This conflicts with the target rule: controllers should authenticate, authorize, validate input, create an ingestion job, and return processing status.

### `engine.controller.js`

Owns HTTP endpoints for:

- full intake
- context retrieval
- domain context
- history
- ask
- chat
- validation review
- insights
- actions

It delegates to `OrgniEngine` but also shapes product-level behavior such as creating exceptions when Lucy cannot ground an answer.

### `organization.controller.js`

Owns org CRUD and dashboard aggregation.

Dashboard aggregation directly reads:

- documents
- active knowledge map
- activity
- validation stats
- saved workflows
- exception stats

This is currently a projection assembled on demand, not an event-derived state projection.

### `workflow.controller.js`

Manages human-editable workflow records and exposes detected workflows from the active knowledge map. It creates a parallel operating record rather than deriving workflow state from canonical events.

### `exception.controller.js`

Builds exceptions by scanning documents, validations, and active knowledge map. It has idempotent dedupe keys but does not consume canonical events.

## Parser Responsibilities

File:

- `artifacts/api-server/engine/services/parser.service.js`

Exports:

- `parseBuffer(buffer, originalName)`
- `parseFile(filePath, originalName)`
- `ParserError`
- `SUPPORTED_EXTENSIONS`

Supported extensions:

- `.txt`
- `.md`
- `.csv`
- `.json`
- `.pdf`
- `.docx`

Responsibilities:

- extension validation
- text extraction
- CSV parsing
- JSON formatting
- PDF text extraction using `pdf-parse`
- DOCX extraction using `mammoth`
- HTML-to-structured-text conversion
- parser-specific error shaping

Limitations:

- no immutable raw evidence preservation
- no checksum generation
- no `SignalEnvelope`
- no OCR image support
- no canonical processing events
- no idempotency key
- no processing job/progress model
- no separation between document parsing and ingestion lifecycle

## Chunk Storage

Files:

- `artifacts/api-server/engine/services/chunker.service.js`
- `artifacts/api-server/engine/models/chunk.model.js`

Chunk records include:

- `id`
- `orgId`
- `documentId`
- `documentName`
- `index`
- `text`
- `page`
- `section`
- `charCount`
- `createdAt`

Chunking preserves page and heading provenance when parser output includes `[PAGE n]` or markdown headings.

Current issue: chunks are central to retrieval and context construction. In the target architecture, chunks may remain a retrieval strategy, but they must not be authoritative organizational state.

## Retrieval Flow

File:

- `artifacts/api-server/engine/services/retrieval.service.js`

Important functions:

- `getOrgChunks(orgId, documents)`
- `retrieve(query, chunks, opts)`
- `buildPromptCorpus(chunks)`
- `tokenize(text)`
- `scoreText(text, terms)`

Retrieval is deterministic keyword overlap. It uses stored chunks when present and falls back to chunking document content in memory for legacy documents.

It creates prompt corpus blocks like:

```text
<<DOC D1 | p.3 | filename>>
...
<<END D1>>
```

This is useful as a compatibility layer, but it is not the target context-service model.

## Lucy Context Flow

Frontend:

- `artifacts/orgni-app/src/App.jsx`
  - `sendChat(text, mode)`

Backend:

- `artifacts/api-server/engine/controllers/engine.controller.js`
  - `chat`
- `artifacts/api-server/engine/sdk/engine.sdk.js`
  - `chat`
- `artifacts/api-server/engine/engine/orgni.engine.js`
  - `chat`

Flow:

1. UI sends chat history to `POST /api/orgs/:orgId/engine/chat`.
2. Controller loads parsed documents.
3. `OrgniEngine.chat` loads active knowledge map via `getContext`.
4. It builds a business brief from the active map.
5. It loads chunks with `retrieval.getOrgChunks`.
6. It ranks chunks with keyword overlap.
7. It builds an LLM prompt containing business brief and source chunks.
8. It calls `ai.complete`.
9. It parses JSON output with `shapeChatResult`.
10. It returns answer, grounding, confidence, sources, workflow, rules, risks, missing info, suggested actions, and audit trail.

Fallback:

- If no AI key is configured, `deterministicChatAnswer` uses `deterministicExtractor.answerFromContext`.

Conflict with target architecture:

- Lucy is still contexted primarily through active knowledge map plus raw document chunks.
- There is no context service returning state version, evidence, conflicts, authorized actions, limitations, and state slice as a formal contract.
- Authorization is not applied before retrieval beyond org ID filtering.

## Knowledge Map Updates

Files:

- `artifacts/api-server/engine/engine/orgni.engine.js`
- `artifacts/api-server/engine/models/knowledgeMap.model.js`
- `artifacts/api-server/engine/controllers/document.controller.js`

Full intake:

- `engine.controller.intake`
- `OrgniEngine.intake`
- `orgni.engine.runFullIntake`

Incremental update:

- `document.controller.parseAndUpdate`
- `OrgniEngine.isReady`
- `OrgniEngine.update`
- `orgni.engine.runIncrementalUpdate`

Current behavior:

- `runFullIntake` builds a corpus from org profile and document chunks.
- It uses either deterministic extraction or optional LLM extraction.
- It writes a new active `knowledgeMaps` version and archives the previous active map.
- It writes insights and validation records.
- `runIncrementalUpdate` merges detected workflows, rules, risks, bottlenecks, and source documents into the active map without creating a new version.

Conflict:

- Knowledge map is a directly mutated source of truth.
- Incremental updates mutate active map directly.
- Operating model is not a projection rebuilt from canonical events.
- There is no event store or reducer.

## Database Models

Database access is through:

- `artifacts/api-server/engine/db/index.js`
- `artifacts/api-server/engine/db/repository.interface.js`
- `artifacts/api-server/engine/db/adapters/lowdb.adapter.js`
- `artifacts/api-server/engine/db/adapters/postgres.adapter.js`

Adapters:

- lowdb JSON file for local development
- PostgreSQL JSONB records for deployed persistence

Collections initialized in lowdb:

- `organizations`
- `documents`
- `chunks`
- `businessMaps`
- `knowledgeMaps`
- `validations`
- `insights`
- `workflows`
- `exceptions`
- `conversations`
- `actions`
- `activity`

Models:

- `activity.model.js`
- `chunk.model.js`
- `document.model.js`
- `exception.model.js`
- `insight.model.js`
- `knowledgeMap.model.js`
- `organization.model.js`
- `validation.model.js`
- `workflow.model.js`

Missing target models:

- `SignalEnvelope`
- immutable raw evidence records
- processing jobs
- canonical events
- organizational tokens
- entities
- relations
- state transitions
- state snapshots
- conflicts
- episodes
- action requests
- principal rules

## Authentication and Authorization

Current authentication:

- No user authentication was found in `artifacts/api-server`.
- No session, JWT, OAuth, API key, or identity middleware was found.

Current authorization:

- `artifacts/api-server/engine/middleware/orgResolver.js` loads an org by `req.params.orgId`.
- Several model methods check `orgId` before mutation, such as `workflow.model.findById`, `validation.model.findByIdForOrg`, and document `get/remove` controller checks.

Gaps:

- anyone who can reach the API can list all orgs via `GET /api/orgs`
- no tenant principal is authenticated
- no source ACL or principal-rule model
- no authorization before retrieval beyond `orgId`
- no action authorization/policy service

## Organization Isolation

Current isolation is record-level `orgId` filtering.

Examples:

- `docModel.findByOrg(orgId)`
- `chunkModel.findByOrg(orgId)`
- `knowledgeMap.getActive(orgId)`
- `validationModel.findByOrg(orgId)`
- `workflowModel.findById(orgId, id)`
- `exceptionModel.findById(orgId, id)`

Risks:

- `organization.controller.list` returns all organizations.
- `orgResolver` accepts any `orgId` route param without proving caller membership.
- PostgreSQL adapter filters JSON records in JavaScript for `findMany`, which is not scalable and increases accidental leakage risk if future code bypasses filtering.
- Source ACLs are not modeled.

## Orgni Docs Implementation

Location:

- `artifacts/orgni-docs`

Endpoint:

```http
POST /run
```

Multipart field:

```text
file
```

Core flow:

- `main.py` validates content type, extension, file size, and empty file.
- Saves upload to `UPLOAD_DIR`.
- Calls `pipeline.runner.run`.
- `ocr.extractor.extract` uses `pdfplumber` and Tesseract fallback for PDFs, Tesseract for images.
- `extraction.extractor.extract` uses regex extraction and Anthropic fallback.
- `validation.engine.validate` runs required/recommended/math/format/date/sanity checks.
- `integrity.trust_scorer.score` creates trust score, risk level, verdict, recommendation, and risk factors.

Strengths:

- clear service boundary
- pipeline stages are separated
- API and pipeline tests exist
- supports image/scanned document path
- produces integrity verdicts

Gaps:

- not integrated with Node upload flow
- writes raw uploads to local disk
- schemas are Python-only dataclasses/constants
- raw response is not normalized into canonical events
- no shared `SignalEnvelope`
- no tenant/source ACL model
- no append-only evidence store
- no idempotency model

## Duplicated Logic

- Upload/document handling exists in Node and browser-local fallback.
- Document parsing exists in Node parser and Orgni Docs OCR pipeline.
- Extraction/validation exists in Node deterministic/LLM extractors and Orgni Docs invoice extraction.
- Source provenance appears in chunks, insights, validations, Orgni Docs OCR pages, and Lucy prompt citations, but without a shared evidence schema.
- Organization/business context is shaped in backend `orgni.engine.js` and frontend `localApi.js`.

## Hidden Coupling

- UI assumes backend route shapes directly in `App.jsx`.
- `document.controller.js` knows parser, chunker, document model, org model, activity model, and Orgni Engine.
- `orgni.engine.js` imports retrieval, extractor modules, models, activity, org model, and AI service directly.
- `exception.controller.js` derives exceptions by reading several current-state collections rather than subscribing to events.
- `workflow.controller.js` mixes saved workflows with detected knowledge-map workflows.
- `localApi.js` mirrors backend behavior enough that product logic may diverge.

## Technical Debt

- No shared canonical schemas.
- No event store.
- No raw evidence store.
- No durable ingestion jobs.
- No retry/progress lifecycle.
- No real auth.
- No tenant principal or ACL propagation.
- Knowledge map is directly mutated.
- Chunks are central to context rather than subordinate retrieval artifacts.
- Lowdb/Postgres repository stores flexible JSON records without migrations.
- Postgres `findMany` filtering is in JavaScript.
- The API server is both gateway and domain engine.
- Orgni Docs dependencies and service lifecycle are not wired into deployment.

## Missing Tests

Found tests:

- `artifacts/orgni-docs/tests/test_api.py`
- `artifacts/orgni-docs/tests/test_pipeline.py`

Missing or not found:

- Node upload controller tests
- parser service tests
- chunker/retrieval tests
- engine intake tests
- Lucy chat contract tests
- tenant isolation tests
- authorization tests
- replay tests
- event append/dedupe tests
- tokenizer tests
- state reducer tests
- document processor adapter tests
- integration tests between Node upload and Orgni Docs

## Unsafe Assumptions

- `orgId` in URL is enough for access control.
- Parsed document text can be persisted as document content without a raw evidence pointer.
- File extension is enough to accept/reject in Node upload.
- In-memory parsing during request is acceptable for all deployments.
- Background incremental update after response is reliable enough.
- Active knowledge map can be safely mutated by incremental update.
- Keyword retrieval over chunks is enough for Lucy context.
- Missing AI key can safely degrade to deterministic behavior without clearly separating model confidence from system confidence.
- Orgni Docs local disk upload path is acceptable for all environments.

## Components That Can Be Reused

- `parser.service.js` as a legacy `DocumentProcessor` implementation.
- `chunker.service.js` as a retrieval artifact generator.
- `retrieval.service.js` as a subordinate retrieval strategy inside future context service.
- `Orgni Docs` OCR/integrity pipeline behind an adapter.
- `db/repository.interface.js` as an interim persistence abstraction.
- `validation.model.js` and `exception.model.js` concepts as review/projection inputs.
- `deterministic.extractor.js` patterns for deterministic baseline extraction.
- UI Sources/Lucy flows as backward-compatible consumers during migration.

## Components That Must Be Replaced or Reframed

- `document.controller.upload` as pipeline owner.
- `knowledgeMap.model.mergeUpdate` as direct state mutation path.
- `orgni.engine.runFullIntake` as the primary state-builder.
- chunk-first Lucy context.
- org-id-only authorization.
- ad hoc source/provenance fields.
- Python-only and JS-only schema definitions.
- local fallback `localApi.js` as a parallel product logic implementation.

