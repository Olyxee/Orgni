# Target Gap Analysis

Status values:

- `EXISTS`
- `PARTIAL`
- `MISSING`
- `INCORRECTLY_PLACED`
- `NEEDS_REFACTOR`
- `RESEARCH_ONLY`

## Summary

The current repository has a working product, document upload flow, Node parser, chunk retrieval, knowledge map, Lucy chat, and a standalone Orgni Docs integrity pipeline. The target architecture requires those capabilities to be reorganized around signals, canonical events, organizational tokens, entity resolution, state, memory, context, governance, actions, and evaluation.

## Module Matrix

| Target module | Current status | Existing reusable code | Missing capability | Required refactor | Dependencies | Risk | Recommended owner | Priority |
|---|---|---|---|---|---|---|---|---|
| `apps/orgni-web` | INCORRECTLY_PLACED | `apps/frontend` | target app path and app contract | keep current app, add migration alias later | workspace migration | low | frontend | P3 |
| `apps/orgni-product` | INCORRECTLY_PLACED | `apps/product` | target app path, typed API client to context service | keep operational, migrate API consumers gradually | API contracts | medium | product frontend | P2 |
| `apps/admin-console` | MISSING | none | admin UI | create later | auth/governance | low now | product/admin | P4 |
| `apps/review-console` | PARTIAL | validation/findings UI in `orgni-app` | dedicated review workflows | isolate review UI later | validation/action service | medium | product frontend | P3 |
| `services/api-gateway` | PARTIAL | `services/api/src/app.ts`, `engine/routes/index.js` | auth, routing boundary, service delegation | separate gateway responsibilities from domain engine | auth, schemas | high | backend platform | P1 |
| `services/ingestion-service` | MISSING | `document.controller.upload`, `parser.service.js` | raw evidence, checksums, jobs, idempotency, SignalEnvelope | extract internal ingestion module first | schemas, storage | high | backend platform | P1 |
| `services/document-service` | PARTIAL | `parser.service.js`, `services/document-service` | processor adapter contract, normalized outputs | wrap legacy parser and Orgni Docs behind `DocumentProcessor` | ingestion, schemas | high | backend/document AI | P1 |
| `services/tokenization-service` | MISSING | deterministic extractors as reference | OrganizationalToken generation | create tokenizer module | schemas, events | high | intelligence | P1 |
| `services/entity-resolution-service` | MISSING | role/department extraction hints | entity identity resolution and review status | create explicit service/module | schemas, event store | high | intelligence/backend | P2 |
| `services/relationship-service` | PARTIAL | workflow/rule/risk extractors | relationship model and provenance | extract relationship builder from engine | entities/events | high | intelligence | P3 |
| `services/timeline-service` | MISSING | timestamps on records | valid time vs transaction time | create after events exist | event store | medium | backend | P3 |
| `services/event-store` | MISSING | activity log only | append-only canonical events, dedupe, replay | add event model/store | schemas | high | backend platform | P1 |
| `services/state-service` | MISSING | `knowledgeMap.model` as current projection | reducers, snapshots, replay, conflicts | build state reducers and projections | event store, entity resolution | high | backend platform | P2 |
| `services/memory-service` | MISSING | knowledge map is not memory service | working/episodic/semantic/procedural memory | defer until events/state | state, governance | medium | intelligence | P4 |
| `services/context-service` | PARTIAL | `orgni.engine.chat`, retrieval service | state-first context response with auth/evidence/conflicts | create context service facade, migrate Lucy | state, retrieval, auth | high | backend/intelligence | P2 |
| `services/policy-service` | MISSING | `ai_boundaries` fields, validations | policy evaluation and approval requirements | create after auth/action contracts | auth, state | high | governance | P3 |
| `services/action-service` | PARTIAL | `analysis.service.js`, `engine.controller.runAction` | action request, policy validation, audit, result events | wrap current action formatting behind action gateway | policy, event store | high | backend/product | P3 |
| `services/evaluation-service` | MISSING | Orgni Docs tests | benchmarks, replay, leakage, accuracy metrics | create evaluation harness | schemas, fixtures | medium | QA/research | P2 |
| `intelligence/organizational-tokenizer` | MISSING | deterministic extractor, Orgni Docs output | token generation with provenance/permissions/confidence | create deterministic first module | schemas, ingestion | high | intelligence | P1 |
| `intelligence/ontology` | MISSING | implicit workflow/rule/risk shapes | explicit organization ontology | define ontology docs/schemas | schemas | medium | architecture | P2 |
| `intelligence/event-model` | MISSING | activity types | canonical event definitions | create event schemas | schemas | high | architecture/backend | P1 |
| `intelligence/entity-model` | PARTIAL | orgs, documents, workflows | canonical entity schema/types | create entity schema | schemas | high | architecture | P1 |
| `intelligence/temporal-model` | MISSING | `createdAt`, `updatedAt` | valid time and transaction time semantics | add temporal fields to schemas | schemas/event store | medium | architecture | P2 |
| `intelligence/context-model` | PARTIAL | chat result shape | `ContextResponse` contract | define shared schema | schemas/state | high | backend/intelligence | P1 |
| `intelligence/prediction-model` | RESEARCH_ONLY | none | prediction contracts | defer | stable state | high | research | P5 |
| `intelligence/anomaly-model` | RESEARCH_ONLY | Orgni Docs integrity signals | anomaly model/eval | defer | event/state/eval | high | research | P5 |
| `memory/working-memory` | MISSING | chat local storage in UI | inspectable scoped memory | defer | context service | medium | intelligence | P4 |
| `memory/episodic-memory` | MISSING | activity log | episodes with evidence/auth | create after canonical events | event store | medium | intelligence | P4 |
| `memory/semantic-memory` | PARTIAL | knowledge map | semantic projection from state | replace knowledge map with state projection | state service | high | intelligence | P4 |
| `memory/procedural-memory` | PARTIAL | workflows | procedure state/projections | derive from events | state service | high | intelligence | P4 |
| `memory/compression` | RESEARCH_ONLY | none | compression strategy | defer | memory modules | medium | research | P5 |
| `state/reducers` | MISSING | none | deterministic reducers | create | events/entities | high | backend | P2 |
| `state/transitions` | MISSING | none | state transition records | create | schemas | high | backend | P2 |
| `state/snapshots` | MISSING | active knowledge map versions | state snapshots | create snapshot store | reducers | high | backend | P2 |
| `state/conflicts` | PARTIAL | exception model | conflict preservation and resolution | create conflict schema/projection | events/state | high | backend/governance | P2 |
| `state/replay` | MISSING | none | replay from event store | create replay tests | event store/reducers | high | backend | P2 |
| `connectors/email` | MISSING | UI logo only | connector ingestion | defer | ingestion/auth | medium | integrations | P4 |
| `connectors/documents` | PARTIAL | upload flow | connector abstraction | reframe upload as connector/source | ingestion | medium | integrations | P2 |
| `connectors/crm` | MISSING | UI logos | connector ingestion | defer | ingestion/auth | medium | integrations | P4 |
| `connectors/erp` | MISSING | finance logos | connector ingestion | defer | ingestion/auth | medium | integrations | P4 |
| `connectors/calendar` | MISSING | UI logos | connector ingestion | defer | ingestion/auth | medium | integrations | P4 |
| `connectors/calls` | MISSING | none | connector ingestion | defer | ingestion/auth | medium | integrations | P4 |
| `connectors/mcp` | MISSING | none | MCP connector layer | defer | ingestion/auth | medium | integrations | P4 |
| `packages/schemas` | MISSING | scattered Joi/Python/dataclasses | JSON Schema, TS types, Pydantic generation | create first | repo tooling | high | platform | P1 |
| `packages/events` | MISSING | activity log strings | event constants and validators | create with schemas | packages/schemas | high | platform | P1 |
| `packages/auth` | MISSING | none | auth principal and authorization helpers | create after auth decision | product decision | high | platform/security | P2 |
| `packages/lineage` | PARTIAL | source excerpts/chunk provenance | EvidenceReference helpers | create after schemas | schemas | medium | platform | P1 |
| `packages/clients` | PARTIAL | `lib/api-client-react` | generated clients for new services | extend after APIs | OpenAPI/schemas | medium | platform | P3 |
| `packages/observability` | PARTIAL | pino/winston loggers | metrics/tracing conventions | create shared logger/metrics | service boundaries | medium | platform | P3 |
| `research/datasets` | MISSING | Orgni Docs sample invoices | evaluation datasets | create fixtures | eval service | medium | research/QA | P3 |
| `research/experiments` | MISSING | none | experiment tracking | defer | eval | low | research | P4 |
| `research/benchmarks` | MISSING | none | benchmark suite | create after evaluation harness | eval | medium | QA/research | P3 |
| `research/attention` | RESEARCH_ONLY | none | research only | defer | state/memory | high | research | P5 |
| `research/continual-memory` | RESEARCH_ONLY | none | research only | defer | memory foundation | high | research | P5 |
| `research/organizational-world-model` | RESEARCH_ONLY | none | research only | defer | stable event/state | high | research | P5 |
| `infrastructure/docker` | PARTIAL | no obvious service Docker files; deployment docs exist | multi-service local/prod runtime | add after service split | services | medium | devops | P3 |
| `infrastructure/terraform` | MISSING | none | infra provisioning | defer | deployment target | medium | devops | P4 |
| `infrastructure/kubernetes` | MISSING | none in current repo | k8s manifests | defer | deployment target | medium | devops | P4 |
| `infrastructure/local` | PARTIAL | package scripts, FastAPI run docs | local multi-service orchestration | add after adapter | services | medium | platform | P2 |
| `docs/architecture` | PARTIAL | this audit set | architecture docs/diagrams | continue | architecture | low | architecture | P1 |
| `docs/modules` | MISSING | some READMEs | module docs | add per module | module creation | low | module owners | P1 |
| `docs/api` | PARTIAL | `lib/api-spec/openapi.yaml` | new service APIs | update as APIs appear | schemas | medium | platform | P2 |
| `docs/research` | MISSING | none | research docs | defer | research modules | low | research | P4 |
| `docs/adr` | MISSING | none | ADRs | create minimum ADR set before phase 1 | decisions | low | architecture | P1 |

## Highest-Risk Gaps

1. No authentication or principal model.
2. No canonical schema package.
3. No raw evidence preservation.
4. Upload controller owns processing pipeline.
5. Knowledge map is directly mutated.
6. Lucy is chunk/context-map-first instead of state/context-service-first.
7. Orgni Docs is not behind a stable adapter.
8. No event store, replay, or state reducers.

