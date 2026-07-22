# Validation Rules

This page maps each rule in section 7 of the design doc to exactly where
it is enforced in code and which test proves it.

## Rule 1 — Every entity must have ID and Type

**Enforcement:** `ontology/models/entity.py::Entity`
`id: UUID = Field(default_factory=uuid4)` and `type: EntityType` are
non-optional fields with no fallback value for `type`. Pydantic refuses to
construct an `Entity` without a valid, enum-member `type`.

Additionally enforced beyond the letter of Rule 1: every entity type also
has a required **identity attribute** (see `IDENTITY_FIELDS`) — an entity
without one is not a usable business fact even if it technically has an id
and a type, so construction fails the same way.

**Tests:** `tests/test_entity_validation.py`
(`test_entity_requires_a_type`, `test_entity_rejects_unknown_type`,
`test_entity_missing_identity_attribute_is_rejected`)

## Rule 2 — Every relationship must define source type, target type, direction

**Enforcement:** `ontology/models/relationship.py::Relationship`. Both
`source_type` and `target_type` are required fields (not inferred from the
entities). A `model_validator` then checks the
`(relationship_type, source_type, target_type)` triple against
`RELATIONSHIP_CONSTRAINTS` in
`ontology/constraints/relationship_constraints.py`, which is exactly the
"direction" part of the rule — e.g. `BILLS` is legal `Invoice -> Customer`
but not `Customer -> Invoice`.

**Tests:** `tests/test_relationship_validation.py`
(`test_invalid_relationship_direction_is_rejected`,
`test_invalid_relationship_wrong_target_type_is_rejected`)

## Rule 3 — Every fact must reference evidence

**Enforcement:** `provenance: Provenance` is a required field on `Entity`,
`Relationship`, and `AttributeAssertion` — there is no code path that
constructs any of these three fact types without one. `Provenance` itself
(v2 shape) requires `source_id`, `source_type`, `extraction_method`, and a
`confidence` in `[0, 1]` — no defaults on any of these four, so a caller
cannot accidentally supply "empty" evidence. `timestamp` is also part of
the required v2 shape but is given a system-generated default (now()) if
not supplied — see `docs/adr/0004-provenance-v2-field-rename.md` for why
that default doesn't conflict with Rule 4. `source_record` is kept as an
optional, additive extension beyond the v2 spec's four required fields.

**Tests:** `tests/test_provenance.py` (entire file); also
`tests/test_entity_validation.py::test_entity_requires_provenance` and
`tests/test_relationship_validation.py::test_relationship_requires_provenance`.

## Rule 4 — Unknown values remain null; never infer

**Enforcement:** This one is procedural rather than a single validator,
because "don't invent a value" isn't something a type system can check —
it has to be a discipline in the code that produces facts. Every mapping
function in `ontology/mappings/` follows the same pattern: optional input
fields (`customer_name`, `contract_id`, `governing_rule_name`, ...) only
produce an entity/relationship/assertion **if the field is actually
present**; there is no fallback branch that fabricates a value. See the
module docstring in `ontology/mappings/invoice.py` for the specific
reasoning, since the design doc's own Invoice example (section 8) shows a
richer ontology mapping than its own input JSON contains — this
implementation refuses to reproduce that gap by invention.

**Tests:** `tests/test_mapping_invoice.py::test_minimal_invoice_matches_design_doc_input_shape`
explicitly asserts that no `Customer` entity is created when no customer
name was extracted.

## Rule 5 — Conflicting facts coexist; never overwrite

**Enforcement:** `ontology/models/assertion.py::AttributeAssertion` plus
`FactStore.add_attribute_assertion`. Business values (amounts, contract
values, statuses) are modeled as assertions rather than plain entity
fields specifically so two different claims about the same
(entity, attribute) pair can both be stored — see the design rationale in
`ontology/models/entity.py` and `ontology/models/assertion.py`. The store
only rejects an assertion if it is an **exact duplicate** (same entity,
same attribute, same value, same evidence fingerprint) — a genuinely
different value is always accepted, never used to overwrite the earlier one.

**Tests:** `tests/test_conflicting_facts.py::test_conflicting_contract_values_are_both_preserved`
reproduces the design doc's own worked example verbatim (R500,000 vs.
R450,000) and asserts both values are retrievable, attributed to their
correct source document.

## Duplicate detection (supports Acceptance Criteria #4/#5)

Distinct from Rule 5 (differing values coexist), a **true duplicate** — the
same relationship or the same attribute value, asserted twice from the
identical piece of evidence — adds no information and is rejected by
`FactStore` with a `DuplicateFactError`. Re-confirmation of the same fact
from a **different** document is not a duplicate and is accepted as
corroborating evidence.

**Tests:** `tests/test_duplicate_facts.py`

## Cardinality enforcement (added in v2)

**Enforcement:** `RelationshipConstraint.max_per_source` /
`max_per_target` in `ontology/constraints/relationship_constraints.py`
declare, per relationship type, how many distinct participants a source or
target may have. `FactStore.add_relationship()` checks these limits before
recording a genuinely new distinct (source, target) pairing, raising
`CardinalityViolationError` if the limit would be exceeded. This lives in
the store rather than the `Relationship` model because checking it
requires seeing every OTHER relationship already recorded for that
source/target — see `docs/adr/0005-cardinality-model.md` for the full
reasoning.

Re-asserting the *same* edge from new, corroborating evidence never trips
a cardinality limit — only a genuinely new distinct participant does.

**Tests:** `tests/test_cardinality.py`

## Temporal validation (added in v2)

**Enforcement:** `effective_from`/`effective_to` (a validity window) and
`event_timestamp` (when the real-world thing actually happened, as
distinct from `created_at`, when the record was written) are optional
fields on both `Entity` and `Relationship`. An `after` validator on both
models rejects an inverted window (`effective_from` after `effective_to`).

**Tests:** `tests/test_temporal.py`

