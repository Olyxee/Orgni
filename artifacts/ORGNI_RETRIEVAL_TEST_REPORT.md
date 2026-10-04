# Orgni business-context retrieval test report

**Date:** 1 October 2026, Africa/Johannesburg. **Status:** preliminary evaluation completed; stored-data acceptance and production readiness are not established.

## Objective and conclusion

Evaluate completeness, relevance, consistency, provenance and organisation isolation of business context retrieved from entities, facts and relationships. Assess behaviour for normal, repeated, concurrent, larger-volume, incomplete-data and dependency-failure scenarios.

**Conclusion:** the engine is currently a workspace-summary implementation, not question-specific business-context retrieval. `gatherContext` returns document counts, the latest filename and fact-set counts; it never includes entity attributes, fact values or relationships. It receives only a tenant ID, not the question. Accurate answers to the fixture questions therefore cannot be produced from this context, even with an external language model.

The local API is reachable, but persisted organisational-model views return `503 persistence_unavailable`. The live environment cannot demonstrate retrieval accuracy over stored records. Nine unmet requirements were reproduced with controlled fixtures; authentication and basic tenant separation passed within the tested scope.

## Environment and evidence

- Windows, PowerShell test runner; Node 22.14.0; Vitest 3.2.7; local HTTP API at `http://127.0.0.1:8080`.
- Live development API: template-provider behaviour, in-memory product state (`durable: false`), no usable persistence. No real business records were inserted or changed. Two fresh synthetic organisations were created through development login; test activity remains in memory until restart.
- Live liveness: HTTP 200. Readiness: HTTP 503, document intelligence unavailable. A `database: true` readiness check here means the optional database is not configured, not that PostgreSQL was tested.
- Controlled engine tests replace repository loading and product-state storage with mocks; pure model functions use in-memory fixtures. No PostgreSQL, external model, Teams traffic or browser automation was used in these tests.
- Full suite: **71 tests, 68 reported passed, 3 skipped, 0 unexpected failures**. Of the 68 reported passes, **9 are `it.fails` assertions confirming unmet requirements**. These are not successful retrieval acceptance tests. The three skipped tests concern document persistence/replay/idempotency.
- Evidence: `retrieval-test-results.json` (full suite), `retrieval-live-results.json` (HTTP measurements), `api-server/tests/retrieval-evaluation.test.ts` (15 controlled cases), `../scripts/evaluate-retrieval.mjs` (repeatable live harness).
- Timings are single-machine exploratory measurements, not an SLA or capacity claim. Aggregation timings came from a separate verbose run of the same controlled test file.

## Test data and oracle

The fixture has two documents per tenant, ordered newest first, each naming Acme Ltd and Globex. The current source states a credit limit of **20,000**, effective 30 September 2026; the older source states **10,000**, effective 1 January 2025. Both contain `Acme SUPPLIES Globex`; the older result explicitly declares a scalar conflict. The two documents use different entity IDs. Source IDs and filenames carry distinct alpha/beta tenant markers.

Variants include empty data, a missing source row, an empty result object, a canonical entity with the alias ACME Trading, an entity ID reused by an unrelated company in another source, duplicate facts, a throwing repository, and 10/1,000/10,000-source fixtures. The large fixture contains two entity mentions, one fact and one relationship per source; it represents repeated mentions, not 10,000 unique entities.

The acceptance oracle for the credit-limit question is: retrieve Acme and its supplied organisation, include both conflicting claims with source IDs and dates, distinguish current from older evidence without silently choosing a value, and exclude unrelated tenants. Empty or unavailable context must be explicit. Identical input should produce consistent evidence; distinct questions should retrieve relevant evidence when their information needs differ.

## Functional test cases

| ID | Case and expected result | Actual result | Outcome / severity |
|---|---|---|---|
| F01 | Normal credit-limit and supplier question: return 20,000/10,000 claims, dates, Acme→Globex and provenance | Engine fixture returned only counts/latest filename; live API returned no context | Fail, High, D01 |
| F02 | Change question from credit limit to supplier: evidence should reflect the information need | Identical engine `sourcesUsed` for both questions | Fail, High, D02 |
| F03 | Two fixture tenants: load only the requesting tenant | Repository mock received alpha then beta; output filenames did not cross tenants | Pass at engine boundary; real SQL isolation untested |
| F04 | Empty data: no invented business values, explain missing context | Question reply said insufficient context; `sourcesUsed` empty | Pass for reply; completed/Done activity is misleading (D03) |
| F05 | Empty brief request: acknowledge unavailable context | Reply claimed account context, conversations, issues and documents had been pulled together | Fail, High, D04 |
| F06 | Model detail: preserve both facts, relationships and their source provenance; surface declared conflict | Two facts, two relationships, two sources; exceptions contained one declared conflict | Pass for model aggregation; conflict not included in engine reply (D01) |
| F07 | Incomplete rows: safely handle orphan fact result and missing fields | Orphan skipped; empty object tolerated; valid fact retained | Pass; no diagnostic explains the skipped orphan |
| F08 | Canonical alias: detail includes evidence for Acme Ltd and ACME Trading | Detail omitted alias evidence; desired two-fact assertion failed | Fail, High, D05 |
| F09 | Source-local entity IDs: unrelated relationship must not attach through an ID reused elsewhere | Detail included two relationships where only one was relevant | Fail, High, D06; same-tenant contamination, not cross-tenant exposure |
| F10 | Current versus older information: distinguish stale evidence | Flat fact output preserved effective dates in payload but supplied no stale/current classification | Unmet oracle, Medium, D07; freshness policy needs agreement |
| F11 | Duplicate fact within one source: one logical result with provenance | Identical fact appeared twice | Unmet oracle, Medium, D08; raw list endpoint may intentionally preserve rows |
| F12 | Repository failure: explicit unavailable/degraded retrieval outcome | Error logged, empty context returned, action marked completed/Done | Fail, High, D03 |
| F13 | Repeat request 20 times: stable retrieved evidence | Fixture contexts stable; live contexts also stable but empty | Pass for repeatability, not accuracy |
| F14 | 20 concurrent fixture requests: persist every generated action | All requests returned, but final mocked clone-based state did not retain all 20 actions | Fail in controlled reproduction, High, D09; not reproduced by live burst |
| F15 | Authenticated model API: retrieve stored organisational overview | HTTP 503 `persistence_unavailable` | Environment blocker; stored-data acceptance not executed |
| F16 | Missing authentication / tampered token: reject | HTTP 401 `unauthenticated` / HTTP 401 `invalid_token` | Pass |
| F17 | Two live test organisations: Alpha's activity absent from Beta | Beta had zero activities after Alpha's 41 requests | Pass for product-state separation; stored facts isolation untested |

## Performance and non-functional observations

| Workload | Measurement | Interpretation |
|---|---|---|
| One live normal question | 200; 26.99 ms | Empty-context request, not successful business retrieval |
| 20 sequential repeat requests | 20/20 HTTP 200; median 3.14 ms; nearest-rank p95 4.86 ms; max 9.51 ms | Warm local requests, no DB/model/network inference |
| 20 simultaneous requests | 20/20 HTTP 200; median 39.22 ms; p95 52.72 ms; max 55.15 ms | All 20 actions persisted in this live burst; total activity 21→41 |
| Aggregate 10 sources, 10 iterations | median 0.35 ms; max 1.03 ms | Combined entities/facts/relationships builders, including assertion overhead |
| Aggregate 1,000 sources, 10 iterations | median 9.72 ms; max 17.47 ms | Pure functions; excludes SQL, serialization and HTTP |
| Aggregate 10,000 sources, 10 iterations | median 48.22 ms; max 97.17 ms | Repeated-entity fixture; not full application load testing |

- **Reliability:** normal and burst requests returned successfully; a controlled repository failure was concealed as an empty successful result. Clone/read/modify/write storage can lose concurrent actions under the reproduced interleaving. The live burst did not reproduce that race.
- **Scalability:** repository loads every source, fact result and review for a tenant before summarising. No query filtering or pagination is used in `loadTenantModel`. Synthetic aggregation timings do not establish DB capacity, memory use, large-response behaviour or multi-process scalability.
- **Security:** token tampering and missing credentials were rejected. Engine forwards the tenant and SQL inspection shows tenant predicates for sources, facts and reviews. Actual database-backed tenant isolation was not executed. Development login issues Owner sessions for any supplied organisation name; this is not organisation identity verification. The production login route rejects this flow. Do not interpret these local tests as production authorisation certification.
- **Availability:** health returned 200 while readiness returned 503 because the Python service was unavailable. Stored model endpoints are unavailable without persistence. No soak, restart, failover or sustained availability measurements were taken.
- **Consistency:** repeated context is stable; aliases and reused source-local IDs cause model/detail inconsistency. Repository reads use three independent queries, not a demonstrated consistent snapshot; updates during reads remain untested. In-memory product state is non-durable.
- **Usability:** normal empty-context question explains insufficient data, but activity says Answered/Done. Brief templates claim evidence that was not retrieved. Engine evidence has counts/filenames rather than navigable fact citations, dates, uncertainty or conflict annotations. These are code/response observations, not a user study.

## Defects and recommended improvements

Severity: **Critical** = demonstrated broad unauthorised disclosure; **High** = incorrect/missing core business evidence or unreliable outcome; **Medium** = ambiguity, duplication or freshness limitation; **Low** = minor presentation issue. No critical stored-data exposure was demonstrated; that scenario remains untested.

| Defect | Severity | Evidence / cause | Recommendation |
|---|---|---|---|
| D01 Missing facts/relationships/conflicts in engine context | High | `engine.ts:gatherContext` produces summaries only; expected-failure F01 | Retrieve actual entity/fact/relationship records; retain source IDs, dates, conflict and uncertainty markers; add oracle-based acceptance tests |
| D02 Question-independent retrieval | High | `gatherContext` has no question parameter; F02 | Pass query/intent; implement relevant entity resolution, graph expansion and ranking; evaluate precision/recall on labelled questions |
| D03 Retrieval outage/no context recorded as success | High | Exception returns `[]`; action completed/Done; F12 and live normal response | Represent empty, partial and unavailable retrieval separately; expose safe diagnostics and metrics; avoid claiming answered/completed |
| D04 Unsupported brief claims | High | Template emits context claims with empty evidence; F05 | Make replies conditional on evidence and explicitly list missing information |
| D05 Alias grouping and detail use different matching rules | High | Grouping resolves aliases; detail matches representative name and `entityKey`, excluding grouped aliases | Share one canonical membership map across overview, grouping and detail; include every source-local alias ID/name |
| D06 Relationship IDs matched globally across documents | High | Detail accumulates IDs into one global set; F09 | Match `(sourceId, entityId)` pairs before following source-local relationships |
| D07 No explicit temporal relevance handling | Medium | Both dates retained as raw fact values; no stale/current logic | Define validity windows and precedence; preserve history and flag unresolved temporal contradictions |
| D08 Duplicate logical results | Medium | Flat builders append repeated rows; F11 | Define raw versus logical views; deduplicate logical claims while retaining distinct provenance |
| D09 Concurrent activity overwrite risk | High, controlled reproduction | Whole-state clone/read/modify/write; F14; live burst retained all actions | Persist actions atomically as append-only records or use optimistic concurrency/transactions; verify against real storage under synchronised load |

These findings are documented, not fixed by this evaluation. `it.fails` keeps reproducible unmet requirements visible; when fixed, convert each into an ordinary passing acceptance test.

## Repeatable execution

Start both services from the repository root with `npm run dev`. In another terminal:

```bash
# Full API suite, including controlled retrieval evaluation
cd artifacts/api-server
node node_modules/vitest/vitest.mjs run --reporter=json --outputFile=../retrieval-test-results.json

# Detailed retrieval results and aggregate timings
node node_modules/vitest/vitest.mjs run tests/retrieval-evaluation.test.ts --reporter=verbose

# Live checks from the repository root; creates fresh synthetic test tenants
cd ../..
node scripts/evaluate-retrieval.mjs
```

The live harness defaults to port 8080; override with `ORGNI_TEST_API`. It uses development login and should target a development environment. JSON evidence contains no session tokens. Aggregate fixture tests make no external service calls.

## Required next phase and release criteria

1. Provision a dedicated PostgreSQL test database; seed two organisations with overlapping names and source-local IDs, distinct secret markers, independent canonical IDs, current/old facts, declared and undeclared contradictions, duplicates and review decisions. Use the real repository and HTTP routes rather than mocks.
2. Define a labelled set of at least 30 business questions, with required and forbidden evidence per organisation. Suggested targets, subject to approval: required fact/relationship recall >=95%, relevance precision >=90%, source/date coverage 100%, conflict disclosure 100%, and zero foreign-tenant results. Present tests do not report these metrics because actual engine evidence lacks the required records.
3. Exercise authenticated organisation A while forging organisation B in request bodies/query strings/source IDs/entity keys; reject invalid/expired/API-key scopes and verify real SQL results contain zero B markers. Test non-owner roles and production authentication independently.
4. Run DB-backed workloads with 10/1,000/10,000 sources and increasing unique entities/fact fan-out. Exercise 1/20/100 concurrent users over a sustained interval; record p50/p95/p99, error rate, throughput, DB query count, CPU, memory and response bytes. Suggested provisional target: p95 <=500 ms for retrieval excluding external model generation, error rate <1%, and zero lost activity records. These thresholds were not agreed or verified here.
5. Stop/restart PostgreSQL and intelligence services, inject timeouts/malformed results/partial data, test recovery and persistent state after restart, and verify errors never masquerade as successful complete answers. Update records during reads and test snapshot consistency.
6. Perform a browser review of citations, conflict display, no-data/service-failure messages and organisation switching; run a longer soak and deployment failover exercise for availability. Re-run this report after repairs with actual versus target results.

**Acceptance decision:** not ready to claim accurate retrieval from stored business context. The current results establish baseline behaviour and concrete defects; database-backed security, accuracy, sustained scalability and availability remain required work.
