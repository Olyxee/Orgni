# ADR 0001: Identity Attributes vs. Asserted Attributes

**Status:** Accepted

## Context

Principle 4 ("Unknown Remains Unknown") and Principle 5 ("Conflicting
Claims Are Preserved") together create a hard requirement: the ontology
must be able to hold two different values for the same real-world field —
e.g. a contract's value reported as R500,000 by one document and R450,000
by another — without either overwriting the other, and without inventing
a "correct" one.

A naive implementation puts every extracted field directly on the entity:
`contract.attributes["value"] = 500000`. Assigning that field twice
overwrites it. There is no way to "store both" under that design without
building a second mechanism specifically for the fields that might
conflict.

## Decision

Split entity data into two kinds:

- **Identity attributes** — the natural-key fields used to recognize "this
  is the same real-world thing" across documents (an invoice's
  `invoice_number`, a contract's `contract_id`). These live directly on
  `Entity.attributes`, are required per entity type (`IDENTITY_FIELDS`),
  and are not expected to conflict.
- **Asserted attributes** — every other business value (an amount, a
  contract value, a status). These are modeled as separate
  `AttributeAssertion` records, each with its own `Provenance`, stored
  independently in `FactStore`. Two assertions for the same
  (entity, attribute_name) pair simply coexist.

## Alternatives Considered

1. **Plain fields with a "last write wins" policy.** Rejected outright —
   this is exactly what Principle 5 forbids.
2. **Plain fields with a list-of-values type** (e.g.
   `contract.attributes["value"] = [500000, 450000]`). Rejected because it
   loses per-value provenance — you'd know two values were claimed but not
   which document said which, breaking Principle 3 ("Evidence First").
3. **A generic "fact" table holding both entities and assertions in one
   shape.** Considered, but conflates two different validation concerns
   (entity identity vs. attribute claims) into one model, making the
   identity-field requirement (Rule 1 equivalent) harder to enforce
   cleanly at construction time.

## Consequences

- Any mapping function must decide, per field, whether it's identity
  (goes on the entity) or a claim (becomes an assertion). This is a
  judgment call documented per-mapping in `ontology/mappings/*.py`.
- Querying "the amount of this invoice" is no longer a single field read —
  it's `store.assertions_for(invoice.id, "amount")`, which may return more
  than one result. Any downstream consumer must be built expecting this,
  not assuming a single scalar.
- Reconciling conflicting assertions into a single "trusted" value is
  explicitly left to a future reasoning layer (out of Phase 1 scope) —
  this layer's job is preservation, not resolution.
