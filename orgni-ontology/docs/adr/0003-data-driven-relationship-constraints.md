# ADR 0003: Relationship Constraints as a Data-Driven Registry

**Status:** Accepted

## Context

Both specifications' Relationship Model sections define specific,
enumerable rules ("Invoice BILLS Customer", "Contract GOVERNED_BY Rule",
etc.) — a closed, known set of (relationship_type, source_type,
target_type) triples. Rule 2 / "Relationship Validation" requires this to
actually be enforced, not just documented.

## Decision

Represent the entire rulebook as one data structure —
`RELATIONSHIP_CONSTRAINTS: dict[RelationshipType, RelationshipConstraint]`
in `ontology/constraints/relationship_constraints.py` — rather than as
`if`/`elif` branches or per-relationship-type validator methods scattered
across the codebase. `Relationship`'s own validator does nothing but look
up this dict and check membership; it contains no relationship-specific
logic itself.

## Alternatives Considered

1. **A validator method per relationship type** (e.g.
   `_validate_bills()`, `_validate_settles()`, ...). Rejected — this
   scales linearly in code volume with the number of relationship types,
   and makes "what are ALL the rules" a question you can only answer by
   reading every method, rather than one dict literal.
2. **Encode constraints directly as JSON Schema `oneOf`/`allOf` unions**
   inside the `Relationship` schema itself. Considered, since JSON Schema
   2020-12 is expressive enough — but this makes the rulebook far harder
   to read and to unit-test in isolation (you'd be testing schema
   validation behavior, not a plain Python dict), and harder to export as
   a clean, standalone artifact for non-Python consumers.
3. **Push constraint checking to the FactStore instead of the model.**
   Rejected for the type/direction check specifically — type and
   direction are fully determined by the Relationship instance alone; no
   store-wide context is needed, so failing fast at construction time (in
   the model) gives the earliest possible feedback. This is different
   from cardinality (ADR 0005), which genuinely needs store-wide context.

## Consequences

- Extending the ontology with a new relationship type is a one-entry
  addition to a single dict (see `docs/extending-the-ontology.md`) —
  deliberately designed to satisfy Deliverable requirement that another
  engineer can extend the ontology without tribal knowledge.
- The same dict is the source for `schema/constraints/relationship_constraints.json`
  (see `ontology/schema_export.py`), so the machine-readable contract and
  the enforced Python logic can never drift apart — there's only one
  place the rule is written.
- A relationship type with no registered entry fails LOUDLY
  (`ValueError: Unknown relationship type...`) the first time anyone
  tries to construct one — there's no silent "anything goes" fallback.
