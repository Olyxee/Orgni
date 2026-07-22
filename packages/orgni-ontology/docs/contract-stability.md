# Contract Stability Policy

This is the plain-language version of what a downstream Orgni component is
allowed to build on top of, and what could change under it.

The ontology's whole job (per the design doc's section 1) is to be "the
canonical contract between information extraction systems, graph
construction services, validation engines, and future reasoning
components." A contract that can change shape without warning isn't one —
so this page states exactly what's promised, what enforces it, and where
to look if you need to check.

## What a downstream component can rely on, within a major version

- **Every entity type currently in the vocabulary will keep existing.**
  New ones may be added; none will be removed.
- **Every relationship type currently in the vocabulary will keep existing**,
  on the same terms.
- **A relationship's allowed source/target types will never shrink.**
  They may grow (a relationship gaining a newly-legal source or target
  type is safe and additive) but a type that's legal today will not
  silently become illegal.
- **An entity type's identity field will never be renamed.** If you resolve
  entities by natural key today (e.g. matching Invoices by `invoice_number`),
  that key's name is stable.
- **No new required field will appear on `Entity`, `Relationship`,
  `Provenance`, or `AttributeAssertion`** without a major version bump.
  A producer built against today's contract will not start failing
  validation tomorrow because of an undocumented new mandatory field.
- **A relationship's cardinality cap will never tighten.** If a
  relationship type is uncapped today, it will not silently gain a cap;
  if it's capped at N today, that cap will not silently drop below N.
  Caps may only be raised or removed.
- **Every fact will continue to require provenance.** This is Rule 3 and
  it is treated as permanent, not just current behavior.

## What is explicitly NOT promised to stay the same

- **JSON Schema `description` text, field ordering, and other cosmetic
  presentation.** These may change freely (documentation improvements,
  wording fixes) and are not contract-breaking.
- **The Python package's internal structure** (module layout, private
  helper functions, non-exported classes). Only `ontology/models/`,
  `ontology/types/`, `ontology/constraints/`, and the generated `schema/`
  files constitute the contract. Anything else is implementation detail.
- **Confidence scores, timestamps, or any other runtime VALUE.** The
  contract fixes *shape*, not the actual data any given extraction run
  produces.

## How this is enforced, not just stated

Every rule above corresponds to an automated check in
`tests/test_schema_compatibility.py`, which compares the ontology's live
state against a committed snapshot (`tests/fixtures/schema_baseline.json`).
That test is part of the standard test run (`python -m pytest`) — a change
that violates any promise above fails CI, it doesn't just fail a manual
review.

| Promise | Enforced by |
|---|---|
| No entity type removed | `test_no_entity_types_removed` |
| No relationship type removed | `test_no_relationship_types_removed` |
| No identity field renamed | `test_identity_fields_unchanged_for_existing_types` |
| No relationship narrows its allowed types | `test_relationship_constraints_never_narrow` |
| No relationship's cardinality cap tightens | `test_relationship_cardinality_never_tightens` |
| No new required field on a base model | `test_no_new_required_fields_on_base_models` |

## Versioning

The contract's version lives in `ontology/schema_version.py` as
`SCHEMA_VERSION`, and is stamped into every file under `schema/` as
`x-schema-version`, plus surfaced at the top of `schema/schema_manifest.json`
— check that one file first if you only want a quick answer to "what
version am I looking at, and what's the full type vocabulary."

- **MAJOR** — bumped for any change that breaks a promise above. Requires
  regenerating `tests/fixtures/schema_baseline.json` via
  `python -m scripts.generate_schema_baseline`, and a note here describing
  what changed and what a consumer needs to do about it.
- **MINOR** — bumped for additive, backward-compatible changes: a new
  entity type, a new relationship type, a relationship gaining a new legal
  source/target type, a new optional field.
- **PATCH** — no consumer-visible change at all.

### Version history

| Version | Date | Change |
|---|---|---|
| 1.0.0 | Phase 1 | Initial contract: Invoice, Contract, ProofOfPayment and their supporting entity/relationship vocabulary, as specified in the Phase 1 Technical Design Document. |
| 2.0.0 | Phase 1 (reconciliation) | Reconciled against the Engineering Design Specification. **Breaking:** `Provenance` reshaped (`source_document`/`source_record` → `source_id`/`source_type`/`timestamp`, see ADR 0004); `REQUIRES` redefined from `Supplier/Customer/Organization → Contract/Obligation` to `Workflow → Approval`, with the prior meaning preserved under new relationship type `PARTY_TO` (see ADR 0006). **Additive:** cardinality enforcement (`max_per_source`/`max_per_target`) added to the relationship constraint registry and enforced at the store; `effective_from`/`effective_to`/`event_timestamp` added to `Relationship` (Entity already had the first two, gained `event_timestamp`); `TRIGGERS` widened to allow `Contract` as a source; `SUPPORTED_BY` widened to allow `ProofOfPayment` as a target. |

## If you need to make a breaking change anyway

Sometimes a real-world requirement genuinely demands one (e.g. discovering
an identity field was modeled wrong). The process is:

1. Make the code change.
2. Run `python -m pytest` — `test_schema_compatibility.py` will fail and
   tell you exactly which promise you broke.
3. Bump `SCHEMA_VERSION`'s major component in `ontology/schema_version.py`.
4. Run `python -m scripts.generate_schema_baseline` to regenerate the
   baseline against the new, intentional shape.
5. Run `python -m ontology.schema_export` to regenerate `schema/*.json`
   with the new version stamped in.
6. Add a row to the version history table above describing the change and
   what a downstream consumer needs to do to adapt.
7. Communicate the bump to whoever owns downstream components — a major
   version bump in this contract is exactly the signal they should be
   watching for.
