# Task Assignment Plan

Tasks are sized for one engineer and one normal pull request.

## Canonical Schemas

### ORG-SCH-001

Module: Canonical schemas
Title: Define JSON Schema sources of truth
Owner role: Platform engineer
Priority: P1
Dependencies: Phase 0 approval
Files involved: `packages/schemas/schemas/*.schema.json`, `packages/schemas/README.md`
Description: Create versioned JSON Schemas for `SignalEnvelope`, `OrganizationalToken`, `CanonicalEvent`, `Entity`, `Relation`, `EvidenceReference`, `StateTransition`, `StateSnapshot`, `ContextResponse`, `ActionRequest`, `Conflict`, `Episode`, and `PrincipalRule`.
Acceptance criteria: all required schemas exist, include `schemaVersion`, and validate fixtures.
Tests required: JSON Schema fixture validation.
Estimated complexity: M
Can run in parallel: yes
Blocked by: architecture approval

### ORG-SCH-002

Module: Canonical schemas
Title: Add TypeScript exports and validators
Owner role: TypeScript backend engineer
Priority: P1
Dependencies: ORG-SCH-001
Files involved: `packages/schemas/src/*`, `packages/schemas/tests/*.test.ts`
Description: Export TypeScript types and validation helpers from schema package.
Acceptance criteria: Node services can import schemas and validate sample payloads.
Tests required: TypeScript unit tests.
Estimated complexity: M
Can run in parallel: partially
Blocked by: ORG-SCH-001

### ORG-SCH-003

Module: Canonical schemas
Title: Add Pydantic models for Python services
Owner role: Python backend engineer
Priority: P1
Dependencies: ORG-SCH-001
Files involved: `packages/schemas/python/orgni_schemas/*`, `packages/schemas/tests/test_pydantic_models.py`
Description: Add generated or mirrored Pydantic models for Orgni Docs and future Python services.
Acceptance criteria: Python can validate the same fixtures as Node.
Tests required: pytest schema validation.
Estimated complexity: M
Can run in parallel: partially
Blocked by: ORG-SCH-001

## Ingestion Separation

### ORG-ING-001

Module: Ingestion
Title: Add checksum and raw evidence contracts
Owner role: Backend platform engineer
Priority: P1
Dependencies: ORG-SCH-001
Files involved: `artifacts/api-server/engine/ingestion/checksum.js`, `evidence-store.js`, tests
Description: Add checksum generation and raw evidence reference creation without changing upload behavior.
Acceptance criteria: same file produces same checksum; evidence record references tenant/org and content ref.
Tests required: unit tests for checksum/evidence record.
Estimated complexity: S
Can run in parallel: yes
Blocked by: schema approval

### ORG-ING-002

Module: Ingestion
Title: Extract upload processing into ingestion service
Owner role: Backend engineer
Priority: P1
Dependencies: ORG-ING-001
Files involved: `document.controller.js`, `ingestion.service.js`, `jobs.js`
Description: Move processing orchestration out of HTTP controller behind feature flag while preserving response compatibility.
Acceptance criteria: existing upload works; controller delegates to ingestion module when flag enabled.
Tests required: controller/integration tests.
Estimated complexity: L
Can run in parallel: no
Blocked by: ORG-ING-001

### ORG-ING-003

Module: Ingestion
Title: Add ingestion job lifecycle
Owner role: Backend engineer
Priority: P2
Dependencies: ORG-ING-002
Files involved: `jobs.js`, `document.model.js`, db adapter collection defaults
Description: Track pending/running/completed/failed processing jobs with errors.
Acceptance criteria: upload returns job IDs; failures are persisted.
Tests required: lifecycle tests.
Estimated complexity: M
Can run in parallel: yes
Blocked by: ORG-ING-002

## Orgni Docs Adapter

### ORG-DOC-001

Module: Document processing
Title: Define DocumentProcessor interface
Owner role: Backend platform engineer
Priority: P1
Dependencies: ORG-SCH-002
Files involved: `artifacts/api-server/engine/document-processing/DocumentProcessor.js`, README
Description: Define input/output contract for document processors.
Acceptance criteria: interface documents supported fields, errors, and normalized events.
Tests required: contract fixture tests.
Estimated complexity: S
Can run in parallel: yes
Blocked by: schemas

### ORG-DOC-002

Module: Document processing
Title: Wrap current parser as LegacyNodeParserProcessor
Owner role: Backend engineer
Priority: P1
Dependencies: ORG-DOC-001
Files involved: `LegacyNodeParserProcessor.js`, `parser.service.js`, tests
Description: Implement adapter around existing `parseBuffer` and chunk preparation.
Acceptance criteria: existing supported files produce same text/status as before.
Tests required: parser adapter tests.
Estimated complexity: M
Can run in parallel: yes
Blocked by: ORG-DOC-001

### ORG-DOC-003

Module: Document processing
Title: Implement OrgniDocsProcessor adapter
Owner role: Backend/Python integration engineer
Priority: P1
Dependencies: ORG-DOC-001
Files involved: `OrgniDocsProcessor.js`, `normalizeOrgniDocsResult.js`, tests
Description: Call Orgni Docs `/run` behind one adapter and normalize output.
Acceptance criteria: raw Orgni Docs response is not exposed as platform contract; failures are captured as unavailable/failed integrity analysis.
Tests required: mocked HTTP tests.
Estimated complexity: M
Can run in parallel: yes
Blocked by: ORG-DOC-001

### ORG-DOC-004

Module: Document processing
Title: Convert processor output into document processing events
Owner role: Backend engineer
Priority: P1
Dependencies: ORG-DOC-002, ORG-DOC-003
Files involved: `document-processing/events.js`, `packages/events`
Description: Emit normalized events including `DocumentReceived`, `DocumentParsed`, `DocumentIntegrityEvaluated`, and validation issue events.
Acceptance criteria: fixture upload produces stable event list.
Tests required: event snapshot tests.
Estimated complexity: M
Can run in parallel: no
Blocked by: adapter implementations

## Organizational Tokenizer

### ORG-TOK-001

Module: Organizational tokenizer
Title: Scaffold tokenizer module with documentation
Owner role: Intelligence engineer
Priority: P1
Dependencies: ORG-SCH-002
Files involved: `intelligence/organizational-tokenizer/README.md`, `src/tokenizer.ts`
Description: Create module boundary and documented responsibilities/non-responsibilities.
Acceptance criteria: module README follows required documentation format.
Tests required: basic import test.
Estimated complexity: S
Can run in parallel: yes
Blocked by: schemas

### ORG-TOK-002

Module: Organizational tokenizer
Title: Convert document events into EVENT tokens
Owner role: Intelligence engineer
Priority: P1
Dependencies: ORG-TOK-001, ORG-DOC-004
Files involved: `event-tokenizer.ts`, tests
Description: Convert `DocumentReceived`, `DocumentParsed`, and integrity events into organizational tokens.
Acceptance criteria: tokens preserve tenant, evidence refs, permissions, confidence, and epistemic status.
Tests required: provenance tests.
Estimated complexity: M
Can run in parallel: no
Blocked by: event definitions

### ORG-TOK-003

Module: Organizational tokenizer
Title: Convert extracted fields into ENTITY and STATE tokens
Owner role: Intelligence engineer
Priority: P1
Dependencies: ORG-TOK-002
Files involved: `entity-tokenizer.ts`, `state-tokenizer.ts`, tests
Description: Convert extracted invoice/document fields into entity/state tokens without fabricating missing fields.
Acceptance criteria: missing fields produce validation errors, not invented tokens.
Tests required: fixture tests with complete and incomplete extraction.
Estimated complexity: M
Can run in parallel: no
Blocked by: ORG-TOK-002

## Event Store

### ORG-EVT-001

Module: Event store
Title: Add append-only event store interface
Owner role: Backend platform engineer
Priority: P1
Dependencies: ORG-SCH-002
Files involved: `artifacts/api-server/engine/event-store/event-store.js`, tests
Description: Implement append and read APIs over repository adapter.
Acceptance criteria: events cannot be updated through event store API.
Tests required: append/read tests.
Estimated complexity: M
Can run in parallel: yes
Blocked by: schemas

### ORG-EVT-002

Module: Event store
Title: Add event dedupe and source provenance indexes
Owner role: Backend platform engineer
Priority: P1
Dependencies: ORG-EVT-001
Files involved: `dedupe.js`, db adapters
Description: Prevent duplicate events for same tenant/source/schema/extractor tuple.
Acceptance criteria: duplicate fixture append returns existing event or idempotent result.
Tests required: dedupe tests.
Estimated complexity: M
Can run in parallel: no
Blocked by: ORG-EVT-001

## Entity Resolution

### ORG-ENT-001

Module: Entity resolution
Title: Define entity resolution contract
Owner role: Intelligence/backend engineer
Priority: P2
Dependencies: ORG-SCH-001
Files involved: `services/entity-resolution-service/README.md`, schemas
Description: Define `MATCHED`, `NOT_MATCHED`, and `REVIEW_REQUIRED` result contract.
Acceptance criteria: contract includes confidence, evidence, decision method, version, and review status.
Tests required: schema validation tests.
Estimated complexity: S
Can run in parallel: yes
Blocked by: schemas

### ORG-ENT-002

Module: Entity resolution
Title: Implement deterministic document/invoice entity resolver
Owner role: Intelligence engineer
Priority: P2
Dependencies: ORG-ENT-001, ORG-TOK-003
Files involved: entity-resolution module tests
Description: Resolve document and invoice candidates from document processing tokens.
Acceptance criteria: exact matches resolve; ambiguous matches require review.
Tests required: fixture tests.
Estimated complexity: M
Can run in parallel: no
Blocked by: tokenizer outputs

## State Engine

### ORG-ST-001

Module: State engine
Title: Define reducer interface and state snapshot schema usage
Owner role: Backend platform engineer
Priority: P2
Dependencies: ORG-EVT-001, ORG-SCH-002
Files involved: `state/reducers`, `state/snapshots`, README
Description: Create reducer contracts and snapshot writer API.
Acceptance criteria: reducer accepts canonical events and returns deterministic next state.
Tests required: reducer fixture tests.
Estimated complexity: M
Can run in parallel: yes
Blocked by: event store

### ORG-ST-002

Module: State engine
Title: Replay document processing events into document state projection
Owner role: Backend engineer
Priority: P2
Dependencies: ORG-ST-001, ORG-DOC-004
Files involved: state reducers/tests
Description: Build first projection from document events, including integrity status.
Acceptance criteria: replay reconstructs current document processing state.
Tests required: replay consistency tests.
Estimated complexity: M
Can run in parallel: no
Blocked by: document events

## Context Service

### ORG-CTX-001

Module: Context service
Title: Define ContextResponse contract and adapter facade
Owner role: Backend/intelligence engineer
Priority: P2
Dependencies: ORG-SCH-001
Files involved: `services/context-service/README.md`, context service source
Description: Create state-first context response interface without migrating Lucy yet.
Acceptance criteria: response includes state version, evidence, inferences, conflicts, confidence, limitations, authorized actions.
Tests required: schema validation tests.
Estimated complexity: M
Can run in parallel: yes
Blocked by: schemas

### ORG-CTX-002

Module: Context service
Title: Wrap legacy retrieval as subordinate context strategy
Owner role: Backend engineer
Priority: P2
Dependencies: ORG-CTX-001
Files involved: context service, `retrieval.service.js`
Description: Use existing chunk retrieval under context service while marking limitations.
Acceptance criteria: output is `ContextResponse`, not raw prompt corpus.
Tests required: fixture context tests.
Estimated complexity: M
Can run in parallel: yes
Blocked by: ORG-CTX-001

## Evaluation Harness

### ORG-EVAL-001

Module: Evaluation
Title: Create document processing fixture suite
Owner role: QA/evaluation engineer
Priority: P2
Dependencies: ORG-DOC-002, ORG-DOC-003
Files involved: `services/evaluation-service`, `research/datasets`
Description: Establish fixtures for legacy parser and Orgni Docs output comparison.
Acceptance criteria: fixtures run in CI/local and report parse/integrity outcomes.
Tests required: evaluation smoke test.
Estimated complexity: M
Can run in parallel: yes
Blocked by: adapters

## Product Integration

### ORG-PROD-001

Module: Product integration
Title: Surface integrity report summary in Sources
Owner role: Product frontend engineer
Priority: P3
Dependencies: ORG-DOC-003
Files involved: `artifacts/orgni-app/src/App.jsx`, styles
Description: Display verdict, trust score, and risk level when backend returns normalized document integrity summary.
Acceptance criteria: existing Sources page works with and without integrity summary.
Tests required: UI smoke/manual test.
Estimated complexity: S
Can run in parallel: yes
Blocked by: backend response contract

