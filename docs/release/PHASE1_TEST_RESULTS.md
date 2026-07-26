# Phase 1 Test Results — Live Readiness Run

**Date:** 2026-07-26
**Commit tested:** `6fd5e5f` (`main`)
**Tester:** Release readiness run (real system, no mocks)
**Environment:** Windows 11 host. Document Intelligence (`:8000`), Ontology (`:8100`)
and the API (`:8080`) run **natively** against the real service code. The full
Docker Compose stack was brought up once successfully, then Docker Desktop's
engine became unstable under load (see Limitations); the native run is the system
of record for this session.

This document records only what was **actually executed and observed** in this
session. Claims not verified live are labelled as covered by CI or not covered.

---

## 1. End-to-end pipeline (real documents, no mocks)

Flow exercised for every document: `Upload → Ingestion → Document Intelligence →
Normalized Envelope v0.1.0 → Organizational Tokenizer → OrganizationalToken[] →
Organizational Ontology → reviewable facts`, via `POST /api/documents` with a
real bearer session.

| Document | Classified | State | Tokens | Facts (epistemic status) | Result |
|----------|-----------|-------|--------|--------------------------|--------|
| Invoice | INVOICE | COMPLETED | EVENT, STATE | INVOICE_ISSUED (OBSERVED), INVOICE_OBLIGATION (ASSERTED) | ✅ |
| Proof of Payment | PROOF_OF_PAYMENT | COMPLETED | EVENT, STATE | PAYMENT_MADE (OBSERVED), PAYMENT_SETTLEMENT (ASSERTED) | ✅ |
| Contract (unsigned) | CONTRACT | COMPLETED | RELATION | — (parties + obligations extracted) | ✅ |
| Malformed invoice (wrong layout) | INVOICE | FAILED | — | — | ✅ controlled failure, no fabrication |

Entities extracted with provenance (e.g. invoice → `ABC Logistics (Pty) Ltd`,
`XYZ Manufacturing CC`).

### Epistemic guarantees — all verified live
- **No fabrication.** Invoice with no stated payment status →
  `invoice_status_not_stated`; no paid/settled fact created.
- **PoP does not settle an invoice.** Referenced invoice captured as a reference
  only: `invoice_reference_is_not_settlement`; settlement stays `ASSERTED`, never
  `OBSERVED`.
- **Unsigned contract is not executed.** `contract_execution_unknown: no
  signature evidence found; contract is not treated as executed`.
- **Missing data stays unknown.** Absent fields reported in `warnings`
  (`fields_not_found: …`); required-but-missing fields drive a controlled
  `FAILED`, never a guessed value.

---

## 2. Automated test suites

| Suite | Command | Result |
|-------|---------|--------|
| Organizational tokenizer | `pnpm --filter @workspace/organizational-tokenizer test` | ✅ 16/16 |
| Worker (ingestion→envelope→tokenize→handoff) | `pnpm --filter @workspace/worker test` | ✅ 53/53 |
| API (auth, documents, model aggregation) | `pnpm --filter @workspace/api test` | ✅ 19/19 (2 skipped: need live DB) |
| Ontology (Python) | `pytest` | ✅ 17/17 |
| Document Intelligence (Python) | `pytest` | ⚠️ 9/11 — 2 failures (below) |

**Document Intelligence failures (real findings):**
1. `test_run_with_real_invoice_image` — image OCR path; the native host has no
   Tesseract binary installed, so the scanned-image case cannot run here.
2. `test_run_with_corrupted_invoice_math` — `KeyError` on a corrupted-image
   fixture; needs investigation (potential unhandled path in the OCR branch).

---

## 3. Security checks (live)

| Check | Result |
|-------|--------|
| Auth required — no token → `GET /api/documents` | ✅ 401 |
| Auth required — invalid token | ✅ 401 |
| Log redaction — no document content/field values in API logs | ✅ pass (logs contain only `sourceId`, `tenantId`, `state`, counts) |
| One canonical `OrganizationalToken` | ✅ single definition (`packages/contracts/src/schemas.ts` + generated `schemas/organizational-token.schema.json`); ontology validates real tokenizer output against it |

**Not re-verified live this session (Docker/Postgres unavailable):** tenant
isolation and cross-tenant access. These are covered by the tenant-scoped
repository (`lib/db` filters every query by `tenantId`) and its integration test
(`lib/db/tests/repository.test.ts`), which run against Postgres in CI. Treated as
a gap for this run, not a pass.

---

## 4. Persistence, model views, idempotency — NOT re-verified live

Blocked by Docker Desktop instability (no Postgres this session). Status:
- **Persistence** (sources/tokens/facts/reviews): code path exercised; rows not
  observed live. Covered by `lib/db` integration test in CI.
- **`/api/model/*`** (console read path): unit-tested (`apps/api` model
  aggregation, 6/6). Live HTTP responses not captured this session.
- **Idempotency** (duplicate upload dedup): covered by an `apps/api` test that is
  **skipped without a DB**; not observed live.

---

## 5. Limitations / findings

1. **Extraction recall is brittle.** Field extractors require near-exact inline
   labels (`Vendor: X`, `Bill To: X` on one line; contract parties only from a
   `between X and Y` preamble). The repo's own `sample_files/sample_invoice.txt`
   **FAILED** until reformatted to inline labels. Realistic layouts will often
   fail rather than mis-extract — safe (no false facts) but low recall.
2. **Invoice line items not parsed** for a valid invoice (`no_line_items_parsed`);
   `INVOICE_LINE_ITEMS` token not produced from the tested layout.
3. **Deprecated Anthropic model** used by the DI classifier (deprecation warning
   at runtime). Must be updated before launch.
4. **DI image/OCR path** unproven here (2 pytest failures; no Tesseract on host).
5. **Local Docker instability.** Docker Desktop crashed repeatedly under the
   full-stack load on this Windows host. Deploy target is Azure Container Apps,
   not local Docker, but the local dev-loop is unreliable and the OCR image is
   heavy.

---

## Decision

```text
Decision: CONDITIONAL GO
Commit tested: 6fd5e5f (main)
Environment: Windows host; DI + Ontology + API run natively against real service
             code; full Docker stack unstable this session.
Tests passed: tokenizer 16/16; worker 53/53; api 19/19 (2 DB-skipped);
              ontology pytest 17/17; live E2E 3/3 doc types + 1 controlled failure;
              auth 401 x2; log redaction pass.
Tests failed: document-intelligence pytest 2/11 (OCR image + corrupted-image KeyError).
Extraction results: invoice/PoP/contract all produced correct, evidence-backed,
                    reviewable facts with correct epistemic status; recall is
                    brittle to document layout (strict labels).
Security findings: auth enforced; logs redacted; single canonical token. Tenant
                   isolation NOT re-verified live (CI-covered) — treat as open.
Performance findings: native pipeline latency acceptable (sub-second per text
                      doc); formal throughput/latency numbers not measured.
Critical blockers: none observed in the pipeline; persistence + tenant isolation
                   must be re-verified live against Postgres before GO.
Required fixes: (1) update deprecated Anthropic model in DI classifier;
                (2) fix corrupted-image KeyError in DI; (3) re-verify persistence,
                idempotency, tenant isolation, and /api/model/* live on Postgres.
Known limitations: brittle extraction recall; line items not tokenized; OCR path
                   unproven on this host.
Recommended pilot limits: restricted, human-in-the-loop beta; digital (non-scanned)
                          documents; well-structured invoices/PoP/contracts;
                          single-tenant or closely-monitored multi-tenant;
                          every fact reviewed before downstream use.
```

**Rationale for CONDITIONAL GO (not GO / not NO-GO):** the complete pipeline and
its epistemic and auth/redaction guarantees pass live with real documents — no
critical integration or data-integrity **failure** was observed. It is not an
unrestricted GO because persistence and tenant isolation were not re-verified
live this session and the extraction-recall / OCR / deprecated-model limitations
are documented and non-trivial. Suitable for a restricted pilot; clear the
"Required fixes" and re-run the DB-backed checks before an unrestricted launch.
