# Proposed File Changes

This document lists proposed changes only. It is not an implementation record.

## Phase 0 Files

Create:

- `docs/architecture/current-state-audit.md`
- `docs/architecture/target-gap-analysis.md`
- `docs/architecture/migration-plan.md`
- `docs/architecture/proposed-file-changes.md`
- `docs/planning/task-assignment-plan.md`
- `docs/adr/ADR-001-event-sourcing.md`
- `docs/adr/ADR-002-canonical-schemas.md`
- `docs/adr/ADR-003-tenant-isolation.md`
- `docs/adr/ADR-004-document-processing-adapter.md`
- `docs/adr/ADR-005-organizational-tokenizer.md`
- `docs/adr/ADR-006-state-engine.md`
- `docs/adr/ADR-007-context-service.md`
- `docs/adr/ADR-008-memory-boundaries.md`
- `docs/adr/ADR-009-action-gateway.md`
- `docs/adr/ADR-010-evaluation-strategy.md`

## First Approved Code Phase

Limit the first code phase to shared contracts, adapters, ingestion boundary, canonical event definitions, and tests.

### Shared schemas

Create:

- `packages/schemas/package.json`
- `packages/schemas/README.md`
- `packages/schemas/src/index.ts`
- `packages/schemas/src/types.ts`
- `packages/schemas/src/validate.ts`
- `packages/schemas/schemas/*.schema.json`
- `packages/schemas/python/orgni_schemas/*.py`
- `packages/schemas/fixtures/*.json`
- `packages/schemas/tests/*.test.ts`
- `packages/schemas/tests/test_pydantic_models.py`

Modify:

- `pnpm-workspace.yaml`
- root `package.json`

### Canonical events

Create:

- `packages/events/package.json`
- `packages/events/README.md`
- `packages/events/src/event-types.ts`
- `packages/events/src/builders.ts`
- `packages/events/src/validators.ts`
- `packages/events/tests/*.test.ts`

### Ingestion boundary

Create either a standalone service or internal-first module. Recommended internal-first for first PR:

- `services/api/engine/ingestion/README.md`
- `services/api/engine/ingestion/ingestion.service.js`
- `services/api/engine/ingestion/evidence-store.js`
- `services/api/engine/ingestion/checksum.js`
- `services/api/engine/ingestion/jobs.js`
- `services/api/engine/ingestion/events.js`
- `services/api/engine/ingestion/__tests__/*.test.js`

Modify:

- `services/api/engine/controllers/document.controller.js`
- `services/api/engine/models/document.model.js`
- `services/api/engine/db/adapters/lowdb.adapter.js`

### Document processor adapter

Create:

- `services/api/engine/document-processing/README.md`
- `services/api/engine/document-processing/DocumentProcessor.js`
- `services/api/engine/document-processing/LegacyNodeParserProcessor.js`
- `services/api/engine/document-processing/OrgniDocsProcessor.js`
- `services/api/engine/document-processing/normalizeOrgniDocsResult.js`
- `services/api/engine/document-processing/events.js`
- `services/api/engine/document-processing/__tests__/*.test.js`

Modify:

- `services/api/engine/services/parser.service.js` only if needed to expose metadata
- `services/api/engine/controllers/document.controller.js`

### Event store

Create:

- `services/api/engine/event-store/README.md`
- `services/api/engine/event-store/event-store.js`
- `services/api/engine/event-store/dedupe.js`
- `services/api/engine/event-store/replay.js`
- `services/api/engine/event-store/__tests__/*.test.js`

Modify:

- `services/api/engine/db/adapters/lowdb.adapter.js`
- `services/api/engine/db/adapters/postgres.adapter.js`

## Files Not To Change In Phase 1

Do not move or rewrite:

- `apps/frontend`
- `apps/product`
- `services/api/engine/engine/orgni.engine.js` except for feature-flagged adapter calls if approved
- `services/document-service` internals except service docs/config if required

Do not implement yet:

- advanced memory
- prediction
- attention
- research world model
- full repo restructure from `artifacts/*` to `apps/*` and `services/*`

