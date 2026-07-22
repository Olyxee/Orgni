# ADR 0005: Cardinality Enforced at the Store, Not the Model

**Status:** Accepted

## Context

The Engineering Design Specification lists "Cardinality enforcement"
explicitly under Relationship Validation, and again in the Technical
Architecture diagram's "Ontology Schema" box (alongside "Cardinality
Rules"). Without it, nothing stops an Invoice from being `BILLS`-linked to
five different Customers, or a Payment from `SETTLES`-ing two different
Invoices — both of which should be structurally impossible in this
domain.

## Decision

Add `max_per_source` / `max_per_target` fields to `RelationshipConstraint`
(default `None` = unlimited), and enforce them in
`FactStore.add_relationship()` — NOT in the `Relationship` Pydantic
model's validators.

The reason this has to live in the store rather than the model: checking
"does source X already have `max_per_source` targets for this
relationship type" requires knowing about every OTHER relationship
already recorded for X. A single `Relationship` instance, validated in
isolation at construction time, has no way to see that — it doesn't have
access to a store. So unlike type/direction validation (ADR 0003, which
genuinely is self-contained), cardinality is inherently a store-level
concern.

Re-asserting the *same* (source, target) edge from a second, corroborating
document does not count as a new distinct participant and never trips a
cardinality cap — only a genuinely new distinct pairing does. This keeps
cardinality checking orthogonal to duplicate-fact detection (which is
about identical evidence, not identical edges).

## Alternatives Considered

1. **Pass the FactStore into the Relationship model's validator.**
   Rejected — this inverts the natural dependency direction (models
   shouldn't need to know about the store that will eventually hold
   them), and would make `Relationship(...)` construction have a
   side-effecting dependency on global state, hurting testability.
2. **Enforce cardinality only at the mapping layer**, i.e. have each
   `map_invoice`/`map_contract`/`map_payment` function "know" not to
   produce a second BILLS relationship. Rejected — this only protects
   facts that flow through the mapping layer. A future mapping module
   (or a direct API consumer) could still violate cardinality with no
   enforcement at all; putting the check in `FactStore` protects every
   caller uniformly.
3. **A single global "max relationships per entity" limit**, rather than
   per-relationship-type caps. Rejected — cardinality genuinely differs by
   relationship type (an invoice bills exactly one customer, but a person
   may hold many roles); a single blanket number can't express this.

## Consequences

- `RELATIONSHIP_CONSTRAINTS` entries now carry real business judgment
  about multiplicity per relationship type (documented inline in
  `ontology/constraints/relationship_constraints.py`), not just legal
  types.
- `tests/test_schema_compatibility.py` was extended with
  `test_relationship_cardinality_never_tightens`, since lowering a cap (or
  adding one where none existed) is just as much a breaking contract
  change as narrowing allowed source/target types — a consumer relying on
  being able to add a 3rd instance of something previously uncapped would
  break silently otherwise.
- `CardinalityViolationError` is a new, distinct exception from
  `DuplicateFactError` — callers need to be able to tell "this fact was
  already known" apart from "this fact is legitimate on its own but
  violates a multiplicity rule."
