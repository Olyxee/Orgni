# Migration Plan

This migration must be incremental. The existing product must remain operational while target architecture modules are introduced behind adapters and feature flags.

## Feature Flags

Initial flags:

- `ORGNI_INGESTION_V2_ENABLED`
- `ORGNI_DOCUMENT_PROCESSOR=legacy|orgni-docs|dual`
- `ORGNI_CANONICAL_EVENTS_ENABLED`
- `ORGNI_TOKENIZER_ENABLED`
- `ORGNI_STATE_SERVICE_ENABLED`
- `ORGNI_CONTEXT_SERVICE_ENABLED`

## Phase 0: Audit and Contracts

Objective: document current state and approve migration boundaries.

Files to create:

- `docs/architecture/current-state-audit.md`
- `docs/architecture/target-gap-analysis.md`
- `docs/architecture/migration-plan.md`
- `docs/architecture/proposed-file-changes.md`
- `docs/planning/task-assignment-plan.md`
- `docs/adr/ADR-001-event-sourcing.md` through `ADR-010-evaluation-strategy.md`

Files to modify:

- none required for product behavior

Files to deprecate:

- none

Interfaces:

- proposed only

Dependencies:

- repository audit

Database changes:

- none

Tests:

- none required

Risks:

- planning docs drift from implementation

Rollback plan:

- remove docs if rejected

Acceptance criteria:

- audit, gap analysis, migration plan, proposed file changes, and task assignment plan exist
- no runtime behavior changes

## Phase 1: Shared Schemas

Objective: create canonical shared contracts without changing runtime flow.

Files to create:

- `packages/schemas/package.json`
- `packages/schemas/src/index.ts`
- `packages/schemas/src/types.ts`
- `packages/schemas/schemas/signal-envelope.schema.json`
- `packages/schemas/schemas/organizational-token.schema.json`
- `packages/schemas/schemas/canonical-event.schema.json`
- `packages/schemas/schemas/entity.schema.json`
- `packages/schemas/schemas/relation.schema.json`
- `packages/schemas/schemas/evidence-reference.schema.json`
- `packages/schemas/schemas/state-transition.schema.json`
- `packages/schemas/schemas/state-snapshot.schema.json`
- `packages/schemas/schemas/conflict.schema.json`
- `packages/schemas/schemas/episode.schema.json`
- `packages/schemas/schemas/context-response.schema.json`
- `packages/schemas/schemas/action-request.schema.json`
- `packages/schemas/schemas/principal-rule.schema.json`
- `packages/schemas/python/orgni_schemas/*.py`
- `packages/schemas/README.md`

Files to modify:

- `pnpm-workspace.yaml` if needed to include `packages/*`
- root `package.json` scripts for schema validation

Files to deprecate:

- none yet

Interfaces:

- JSON Schema source of truth
- TypeScript exports
- generated or mirrored Pydantic models

Dependencies:

- schema generation choice

Database changes:

- none

Tests:

- TypeScript schema validation tests
- Python Pydantic validation tests

Migration risks:

- duplicate schema drift if generation is not automated

Rollback plan:

- remove package from workspace; no runtime impact

Acceptance criteria:

- schemas validate representative fixtures in Node and Python
- schema versions are explicit

## Phase 2: Ingestion Separation

Objective: stop the controller from owning processing while preserving upload behavior.

Files to create:

- `services/ingestion-service/README.md`
- `services/ingestion-service/src/ingestion-service.ts`
- `services/ingestion-service/src/evidence-store.ts`
- `services/ingestion-service/src/checksum.ts`
- `services/ingestion-service/src/jobs.ts`
- `services/ingestion-service/src/events.ts`
- or, if internal-first: `artifacts/api-server/engine/ingestion/*`

Files to modify:

- `artifacts/api-server/engine/controllers/document.controller.js`
- `artifacts/api-server/engine/routes/index.js`
- `artifacts/api-server/engine/models/document.model.js`

Files to deprecate:

- `parseAndUpdate` inside `document.controller.js`

Interfaces:

- `submitUpload({ orgId, files, actor, sourceAcl })`
- `IngestionJob`
- `SignalEnvelope`

Dependencies:

- schemas

Database changes:

- add `rawEvidence` collection/table
- add `ingestionJobs` collection/table
- add checksum and content ref fields

Tests:

- upload creates ingestion job
- checksum is stable
- duplicate upload is idempotent
- controller returns status

Migration risks:

- breaking upload UX
- serverless filesystem constraints

Rollback plan:

- feature flag back to current controller path

Acceptance criteria:

- old upload response shape remains compatible
- processing can be invoked outside HTTP controller

## Phase 3: Orgni Docs Adapter

Objective: integrate Orgni Docs without leaking its raw response as the platform contract.

Files to create:

- `artifacts/api-server/engine/document-processing/DocumentProcessor.js`
- `artifacts/api-server/engine/document-processing/LegacyNodeParserProcessor.js`
- `artifacts/api-server/engine/document-processing/OrgniDocsProcessor.js`
- `artifacts/api-server/engine/document-processing/events.js`
- `artifacts/api-server/engine/document-processing/README.md`

Files to modify:

- `document.controller.js` or ingestion module
- `document.model.js`
- environment docs

Files to deprecate:

- direct `parseBuffer` use from controller

Interfaces:

- `DocumentProcessor.process(input): Promise<DocumentProcessingResult>`
- normalized events: `DocumentReceived`, `DocumentParsed`, `DocumentIntegrityEvaluated`, `DocumentApproved`, `DocumentFlaggedForReview`, `DocumentBlocked`, `FieldExtracted`, `ValidationIssueDetected`

Dependencies:

- ingestion boundary
- schemas

Database changes:

- store normalized document processing result
- optional raw processor response as non-contract debug payload

Tests:

- legacy parser adapter tests
- Orgni Docs adapter normalization tests
- unavailable Orgni Docs marks integrity unavailable without failing upload

Migration risks:

- Python service availability
- Tesseract dependency
- file size/content type differences

Rollback plan:

- `ORGNI_DOCUMENT_PROCESSOR=legacy`

Acceptance criteria:

- upload still works with legacy processor
- Orgni Docs can be enabled behind feature flag
- normalized processing events are emitted

## Phase 4: Canonical Events

Objective: emit canonical events from ingestion/document processing.

Files to create:

- `packages/events`
- `services/event-store` or `artifacts/api-server/engine/event-store`
- event fixtures/tests

Files to modify:

- ingestion module
- document processing adapters

Files to deprecate:

- activity log as primary event model

Interfaces:

- `append(event)`
- `appendMany(events)`
- `findByTenant(tenantId)`
- `findBySourceRef(sourceRef)`

Dependencies:

- schemas
- ingestion/document adapters

Database changes:

- `canonicalEvents` append-only collection/table

Tests:

- append-only behavior
- dedupe
- tenant isolation
- schema validation

Migration risks:

- event shape churn

Rollback plan:

- disable event emission flag while keeping ingestion

Acceptance criteria:

- document upload emits validated canonical events

## Phase 5: Organizational Tokenizer

Objective: generate organizational tokens and canonical events from signals and document processing outputs.

Files to create:

- `intelligence/organizational-tokenizer/src/tokenizer.ts`
- `intelligence/organizational-tokenizer/src/event-tokenizer.ts`
- `intelligence/organizational-tokenizer/src/entity-tokenizer.ts`
- `intelligence/organizational-tokenizer/src/relation-tokenizer.ts`
- `intelligence/organizational-tokenizer/src/policy-tokenizer.ts`
- `intelligence/organizational-tokenizer/src/state-tokenizer.ts`
- `intelligence/organizational-tokenizer/src/confidence.ts`
- `intelligence/organizational-tokenizer/src/validators.ts`
- `intelligence/organizational-tokenizer/README.md`

Files to modify:

- ingestion processing pipeline

Files to deprecate:

- direct extraction-to-knowledge-map path for new uploads

Interfaces:

- `tokenize(input): { tokens, events, errors }`

Dependencies:

- schemas
- event store
- document processor events

Database changes:

- `organizationalTokens` collection/table

Tests:

- provenance preservation
- permissions propagation
- deterministic fixtures
- no fabricated missing entities

Migration risks:

- token granularity decisions

Rollback plan:

- disable tokenizer flag, keep events

Acceptance criteria:

- upload can produce organizational tokens without changing Lucy path

## Phase 6: Entity Resolution

Objective: resolve entities with explicit decisions.

Files to create:

- `services/entity-resolution-service`
- `services/entity-resolution-service/README.md`

Files to modify:

- tokenizer/event consumers

Files to deprecate:

- implicit role/department matching as identity resolution

Interfaces:

- `resolveEntity(candidate): ResolutionResult`

Dependencies:

- tokens
- entity schemas

Database changes:

- `entities`
- `entityResolutionDecisions`

Tests:

- matched/not matched/review required
- reversible merge
- tenant isolation

Migration risks:

- incorrect merges

Rollback plan:

- route low-confidence decisions to review

Acceptance criteria:

- entity identities are explicit and auditable

## Phase 7: Event Store

Objective: harden event store for replay and publication.

Files to create:

- `services/event-store/src/replay.ts`
- `services/event-store/src/publisher.ts`
- `services/event-store/tests/*`

Files to modify:

- canonical event writers

Files to deprecate:

- direct collection mutation for derived facts

Interfaces:

- append, dedupe, replay, subscribe

Dependencies:

- schemas

Database changes:

- event indexes by tenant/time/source/schema

Tests:

- replay ordering
- no mutation
- schema version persistence

Migration risks:

- event ordering bugs

Rollback plan:

- keep existing knowledge map path as projection fallback

Acceptance criteria:

- derived state can be rebuilt from events in tests

## Phase 8: State Engine

Objective: create deterministic state reducers and snapshots.

Files to create:

- `services/state-service`
- `state/reducers`
- `state/transitions`
- `state/snapshots`
- `state/conflicts`
- `state/replay`

Files to modify:

- knowledge map reads/writes behind projection facade

Files to deprecate:

- `knowledgeMap.model.mergeUpdate`

Interfaces:

- `reduce(event, state)`
- `snapshot(tenantId)`
- `replay(tenantId, until)`

Dependencies:

- event store
- entity resolution

Database changes:

- `stateSnapshots`
- `stateTransitions`
- `conflicts`

Tests:

- deterministic replay
- conflict preservation
- idempotent updates

Migration risks:

- breaking dashboard/model views

Rollback plan:

- continue reading old knowledge maps until projections match

Acceptance criteria:

- state snapshot versions are created from events

## Phase 9: Context Service

Objective: introduce a state-first context service for Lucy.

Files to create:

- `services/context-service`
- `services/context-service/README.md`

Files to modify:

- `orgni.engine.chat`
- `engine.controller.chat`

Files to deprecate:

- direct chunk retrieval from Lucy path

Interfaces:

- `getContext(query, tenant, principal): ContextResponse`

Dependencies:

- state service
- retrieval as subordinate strategy
- auth/policy

Database changes:

- none initially

Tests:

- context includes state version, evidence, limitations, conflicts
- authorization before retrieval

Migration risks:

- answer quality regressions

Rollback plan:

- feature flag to current chat flow

Acceptance criteria:

- Lucy can consume `ContextResponse` while old chat remains available

## Phase 10: Lucy Migration

Objective: migrate Lucy away from raw chunk-first retrieval.

Files to modify:

- `artifacts/orgni-app/src/App.jsx`
- `artifacts/api-server/engine/engine/orgni.engine.js`
- `artifacts/api-server/engine/controllers/engine.controller.js`

Files to deprecate:

- direct prompt construction from raw chunks

Interfaces:

- context-service-backed chat

Dependencies:

- context service

Database changes:

- none

Tests:

- chat contract tests
- grounded answer evidence tests

Migration risks:

- UX regressions

Rollback plan:

- feature flag

Acceptance criteria:

- Lucy responses cite state/evidence and include limitations

## Phase 11: Memory Modules

Objective: add inspectable memory after event/state foundation.

Files to create:

- `memory/working-memory`
- `memory/episodic-memory`
- `memory/semantic-memory`
- `memory/procedural-memory`
- `memory/compression`

Dependencies:

- events
- state
- context
- authorization

Acceptance criteria:

- every memory write includes tenant, source, evidence, confidence, auth, retention, timestamps, model/rule version

## Phase 12: Governance and Actions

Objective: isolate policy, authorization, lineage, audit, action gateway, and review flows.

Files to create:

- `services/policy-service`
- `services/action-service`
- `packages/auth`
- `packages/lineage`

Files to modify:

- `analysis.service.js`
- `engine.controller.runAction`

Acceptance criteria:

- actions pass authentication, authorization, state validation, policy validation, approval requirements, idempotency, audit logging, result event creation

## Phase 13: Evaluation

Objective: measure system quality.

Files to create:

- `services/evaluation-service`
- `research/benchmarks`
- `research/datasets`
- `tests/replay`
- `tests/security`
- `tests/evaluation`

Acceptance criteria:

- baseline comparisons exist against legacy chunk retrieval, vector RAG, graph retrieval, state-only retrieval, and hybrid Orgni context

## Phase 14: Research Modules

Objective: start advanced research only after foundations are stable.

Files to create:

- `research/attention`
- `research/continual-memory`
- `research/organizational-world-model`

Acceptance criteria:

- research modules do not affect production paths without explicit promotion criteria

