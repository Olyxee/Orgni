# Orgni Organizational Ontology — Phase 1

A working implementation of the organizational ontology, reconciling two
source specifications: the Phase 1 Technical Design Document (v1) and the
later Engineering Design Specification (v2). A validated, provenance-
tracked, cardinality-aware semantic layer for Invoice, Contract, and
Proof of Payment documents.

```
pip install -r requirements.txt
python -m pytest              # 55/55 passing
python -m ontology.schema_export
python run_demo.py
```

Full documentation lives in `docs/` (viewable as a static site via
`mkdocs serve` once `mkdocs-material` is installed, or just read as plain
Markdown). Start with `docs/index.md`.

**Current contract version: 2.0.0.** See "v2 reconciliation" below and
`docs/adr/` for what changed and why.

## Repository layout

```
orgni-ontology/
├── ontology/
│   ├── types/                    Entity/Relationship type vocabularies (enums)
│   ├── models/                   Pydantic v2 models: Entity, Relationship,
│   │                             AttributeAssertion, Provenance (v2 shape)
│   ├── constraints/               Relationship direction/type/cardinality rulebook
│   ├── store/                    FactStore — validating, provenance-aware,
│   │                             duplicate-rejecting, cardinality-enforcing,
│   │                             conflict-preserving
│   ├── mappings/                  invoice.py / contract.py / payment.py —
│   │                             flat extraction JSON -> ontology facts
│   ├── schema_export.py           Generates schema/*.json from the models,
│   │                             stamped with the contract version
│   ├── schema_version.py          SCHEMA_VERSION + the MAJOR/MINOR/PATCH
│   │                             bump policy (see docs/contract-stability.md)
│   └── contract_snapshot.py       Computes the consumer-visible "shape"
│                                 (types, identity fields, relationship
│                                 constraints + cardinality, required fields)
│                                 used by both the baseline generator and its test
├── scripts/
│   └── generate_schema_baseline.py  Regenerates tests/fixtures/schema_baseline.json
│                                     — only run deliberately, on a MAJOR bump
├── schema/
│   ├── schema_manifest.json        Single file to check contract version +
│   │                               full type vocabulary at a glance
│   ├── entities/                   entity.schema.json, attribute_assertion.schema.json
│   ├── relationships/               relationship.schema.json
│   └── constraints/                provenance.schema.json,
│                                   relationship_constraints.json (now with cardinality)
├── examples/                      Sample extraction JSON for all 3 doc types,
│                                   including a deliberately conflicting
│                                   second contract to demo Rule 5
├── tests/                         55 pytest tests, one file per concern
│   └── fixtures/schema_baseline.json   Committed compatibility snapshot (v2.0.0)
├── docs/
│   ├── adr/                        Architecture Decision Records — the numbered
│   │                               decision log (Deliverable #10)
│   └── ...                         MkDocs Material documentation source
├── run_demo.py                    End-to-end runnable walkthrough
├── mkdocs.yml
├── pyproject.toml
└── requirements.txt
```

(Note: the design docs show `mappings/` as a sibling of `schema/` rather
than nested under `ontology/`. This implementation nests mapping code
under `ontology/` alongside the models it depends on, because Python's
import system makes that the natural home for code that imports
`ontology.models.*` directly — the doc's `mappings/{invoice,payment,contract}/`
subfolder structure is preserved as `ontology/mappings/{invoice,payment,contract}.py`.
Everything else in the specified layout is followed exactly.)

## v2 reconciliation — what changed and why

The Engineering Design Specification introduced requirements the original
build didn't yet meet, and two relationships (`REQUIRES`, plus knock-on
effects on `TRIGGERS`/`SUPPORTED_BY`) that outright disagreed with the v1
document. Rather than quietly picking one, every gap and every conflict
was resolved explicitly and is documented:

| Gap / conflict | Resolution | Where |
|---|---|---|
| No cardinality enforcement | Added `max_per_source`/`max_per_target` to `RelationshipConstraint`, enforced in `FactStore` | `docs/adr/0005-cardinality-model.md` |
| Provenance shape mismatch | `Provenance` reshaped to `source_id`/`source_type`/`timestamp` (breaking; SCHEMA_VERSION bumped 1.0.0 → 2.0.0) | `docs/adr/0004-provenance-v2-field-rename.md` |
| No temporal window on Relationship | Added `effective_from`/`effective_to`/`event_timestamp` to `Relationship`; `event_timestamp` also added to `Entity` | `docs/validation-rules.md` |
| No Architecture Decision Record | Added `docs/adr/` — six ADRs covering every non-obvious decision in this codebase | `docs/adr/README.md` |
| `REQUIRES` meant two different things across the two specs | v2 treated as authoritative (`Workflow → Approval`); v1's meaning preserved under new type `PARTY_TO` | `docs/adr/0006-requires-and-triggers-conflict.md` |
| `TRIGGERS` didn't allow `Contract` as a source | Widened (additive, non-breaking) | same ADR |
| `SUPPORTED_BY` didn't allow `ProofOfPayment` as a target | Widened (additive, non-breaking) | same ADR |
| v2 examples reference undefined types `Fact`/`Action` | Mapped to the closest already-defined types, flagged explicitly rather than silently assumed | same ADR |

This is also the first real exercise of the contract-stability mechanism
built earlier: `tests/test_schema_compatibility.py` correctly FAILED when
the `Provenance` rename and `REQUIRES` redefinition were made, confirming
the safety net catches real breaking changes — the baseline was then
deliberately regenerated via `python -m scripts.generate_schema_baseline`
as part of shipping this version, exactly per the documented process.

## What "done" looks like — Acceptance Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Invoice mappings validate successfully | ✅ | `tests/test_mapping_invoice.py` |
| 2 | Contract mappings validate successfully | ✅ | `tests/test_mapping_contract.py` |
| 3 | Proof-of-payment mappings validate successfully | ✅ | `tests/test_mapping_payment.py` |
| 4 | Invalid mappings/relationships are rejected | ✅ | `tests/test_relationship_validation.py` |
| 5 | Every fact retains provenance | ✅ | `tests/test_provenance.py` |
| 6 | Conflicting assertions are preserved | ✅ | `tests/test_conflicting_facts.py` |
| 7 | Temporal metadata is supported | ✅ | `tests/test_temporal.py` — `effective_from`/`effective_to`/`event_timestamp` on both Entity and Relationship |
| 8 | Cardinality is enforced | ✅ | `tests/test_cardinality.py` |
| 9 | Schema versioning is documented | ✅ | `ontology/schema_version.py::SCHEMA_VERSION` (currently `2.0.0`), stamped into every `schema/*.json` file, compatibility enforced by `tests/test_schema_compatibility.py` — see `docs/contract-stability.md` |
| 10 | Tests pass consistently | ✅ | `python3 -m pytest` → 55 passed |
| 11 | Documentation enables another engineer to extend the ontology without tribal knowledge | ✅ | `docs/extending-the-ontology.md` + `docs/adr/` |

## Design decisions worth knowing before you read the code

1. **Identity attributes vs. asserted attributes.** An entity's natural key
   (invoice number, contract ID, a person's name) lives on
   `Entity.attributes` and is required. Everything else that's a *claim*
   about the entity (an amount, a contract value) is a separate
   `AttributeAssertion` with its own provenance — this is the only way to
   literally satisfy "conflicting facts coexist, never overwrite." See
   `docs/adr/0001-identity-vs-asserted-attributes.md`.
2. **Entity resolution by natural key, not by ID.** `FactStore.resolve_or_create_entity`
   means the same real-world Supplier or Invoice mentioned across multiple
   documents becomes one node, not several — this is what makes cross-document
   relationships like `Payment --SETTLES--> Invoice` work even when the
   payment document is processed before the invoice document.
3. **"Never infer" is enforced procedurally, not structurally.** Pydantic
   can't check "did you make this value up" by itself — it's a discipline
   followed in every mapping function (only emit a fact when the source
   field is actually present) and it's tested explicitly.
4. **JSON Schema 2020-12 as the actual contract**, generated from the
   Pydantic models rather than hand-maintained, so the two can never drift
   apart — `python3 -m ontology.schema_export` regenerates `schema/*.json`
   from the models directly.
5. **Cardinality lives in the store, type/direction lives in the model.**
   Type and direction are fully knowable from a single `Relationship`
   instance in isolation; cardinality requires seeing every other
   relationship already recorded — see `docs/adr/0005-cardinality-model.md`.

## Contract stability — making the schema safe to build on

A contract only holds if it's actually protected against silent breakage:

1. **`ontology/schema_version.py`** — a `SCHEMA_VERSION` distinct from the
   package version, with an explicit MAJOR/MINOR/PATCH bump policy.
2. **`tests/test_schema_compatibility.py`** — compares the ontology's live
   shape against a committed baseline (`tests/fixtures/schema_baseline.json`)
   on every test run, and fails if an entity type or relationship type is
   removed, an identity field is renamed, a relationship's legal
   source/target types (or cardinality caps) narrow, or a new required
   field appears on a base model without a deliberate major-version bump.
3. **`docs/contract-stability.md`** — the plain-language statement of
   exactly what a downstream component is safe to assume will never change
   within a major version, and the step-by-step process for making a
   breaking change on purpose when one is genuinely needed.
4. **`docs/adr/`** — the numbered decision log explaining *why* the
   contract looks the way it does, including the real v1→v2 migration.

Every exported file under `schema/` is stamped with `x-schema-version`, and
`schema/schema_manifest.json` is the one file to check for "what version is
this, and what's the full type vocabulary" without opening every file.

## Explicitly out of scope

LLM reasoning, autonomous agents, a real graph database, workflow
orchestration, UI, enterprise-wide ontology expansion, industry-specific
extensions, document tokenization/extraction (this layer consumes flat
extraction JSON; it does not produce it). `FactStore` is in-memory by
design so that a Phase 2 graph backend can be swapped in behind the same
interface without touching the validation rules, which live in the
models, not the store.
