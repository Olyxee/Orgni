# ADR 0006: Resolving the REQUIRES / TRIGGERS / SUPPORTED_BY Conflict Between the Two Source Specifications

**Status:** Accepted — SCHEMA_VERSION bumped as part of the same 2.0.0 change as ADR 0004

## Context

Two design documents exist for this ontology: the Phase 1 Technical Design
Document (v1) and the later Engineering Design Specification (v2). Most of
v2 is consistent with — or a strict superset of — v1. Three relationships
are not:

| Relationship | v1 meaning | v2 meaning |
|---|---|---|
| `REQUIRES` | Supplier/Customer/Organization → Contract/Obligation ("Supplier ABC Ltd REQUIRES Contract CON-001") | Workflow → Approval ("Workflow REQUIRES Approval") |
| `TRIGGERS` | Rule/Task/Decision/Transaction → Task/Workflow/Exception | adds Contract → Workflow ("Contract TRIGGERS Workflow") |
| `SUPPORTED_BY` | Invoice/Contract/Payment/Transaction/ProofOfPayment → Document only | adds Payment → ProofOfPayment ("Payment SUPPORTED_BY ProofOfPayment") |

`TRIGGERS` and `SUPPORTED_BY` are resolvable by widening — v2's cases are
additive, not contradictory, so both specs' examples can be true
simultaneously. `REQUIRES` is not resolvable by widening: a Supplier is
not a Workflow, and a Contract is not an Approval. Keeping v1's entity
types as *also* legal would mean `REQUIRES` no longer constrains anything
meaningfully — it would accept two unrelated shapes of fact under one
name, defeating Principle 1 ("Explicit Semantics": every concept must have
a clearly defined meaning).

Separately, v2's own worked examples use two entity types — `Fact` (in
"Fact DERIVED_FROM Document") and `Action` (in "Action VIOLATES Rule",
"Action CREATES_EXCEPTION Exception") — that do not appear anywhere in
v2's own Core Domain Model. These are genuinely undefined in the source
material, not just ambiguous.

## Decision

**REQUIRES:** v2 is treated as authoritative for what `REQUIRES` *means*
going forward, since it is the newer, more detailed specification.
`RELATIONSHIP_CONSTRAINTS[REQUIRES]` now reads `Workflow → Approval`. The
v1 concept ("a supplier is bound to a contract") is not deleted — it is
preserved under a new, more precise relationship name: `PARTY_TO`
(`Supplier/Customer/Organization → Contract/Obligation`). This required
adding `PARTY_TO` as a new `RelationshipType` member and updating
`ontology/mappings/contract.py` to emit `PARTY_TO` instead of `REQUIRES`
for the Supplier↔Contract link.

**TRIGGERS:** Widened, not redefined. `Contract` was added to
`allowed_source_types`. Both v1's and v2's worked examples now hold.

**SUPPORTED_BY:** Widened, not redefined. `ProofOfPayment` was added to
`allowed_target_types`, alongside the existing `Document`. Both v1's and
v2's worked examples now hold; `ontology/mappings/payment.py` was updated
to emit `Payment SUPPORTED_BY ProofOfPayment` in addition to the
pre-existing `ProofOfPayment SETTLES Invoice`.

**`Fact` and `Action`:** Rather than inventing two new entity types the
specification itself never defines, these are interpreted as referring to
whichever already-defined entity types can plausibly fill that role in
this ontology: `Document/Contract/Invoice` for `DERIVED_FROM`'s source
("things that assert facts"), and `Transaction/Invoice/Contract/Payment`
for `VIOLATES`/`CREATES_EXCEPTION`'s source ("things whose occurrence can
be a violation"). This is flagged explicitly here, in code comments in
`relationship_constraints.py`, and in `docs/relationships.md`, rather than
silently assumed — if `Fact` or `Action` were meant to be distinct,
first-class entity types, that requires a specification update, not a
guess encoded quietly into the registry.

## Alternatives Considered

1. **Keep v1's REQUIRES and treat v2's example as an error.** Rejected —
   symmetric with ADR 0004's reasoning: no principled basis for
   preferring the older document once a newer one exists and disagrees.
2. **Overload REQUIRES to accept both shapes** (widen instead of
   redefine). Rejected — unlike TRIGGERS/SUPPORTED_BY, the two shapes
   share no entity types at all; "widening" here would just mean
   `REQUIRES` stops meaning anything specific, which directly violates
   Principle 1.
3. **Drop the v1 Supplier↔Contract fact entirely**, since it's not in v2's
   worked examples under any name. Rejected — nothing in either
   specification says this fact is no longer wanted; it's a real,
   still-useful business relationship that simply needs a name that
   doesn't collide with v2's redefinition.
4. **Invent `Fact` and `Action` as new first-class entity types** to match
   v2's worked-example wording literally. Rejected — this would mean
   silently expanding the entity vocabulary based on incidental wording
   in two example sentences, without any definition, identity field, or
   business meaning specified for either — exactly the kind of
   unstated-tribal-knowledge decision Deliverable #10 is meant to prevent.

## Consequences

- `REQUIRES`'s redefinition is a genuine breaking change, confirmed by
  `tests/test_schema_compatibility.py::test_relationship_constraints_never_narrow`
  correctly failing before the baseline was deliberately regenerated (see
  ADR 0004 — both changes shipped together under the same 2.0.0 bump).
- Any existing caller using `RelationshipType.REQUIRES` for a
  Supplier/Contract fact must migrate to `RelationshipType.PARTY_TO`.
  `ontology/mappings/contract.py` already reflects this.
- `docs/relationships.md`'s constraint table documents both the current
  rules and this reasoning, so a future engineer encountering `PARTY_TO`
  for the first time understands why it exists rather than assuming it
  was there from the start.
