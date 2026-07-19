# Architecture

## Pipeline

```
Source Documents (Invoice / Contract / Proof of Payment)
        |
        v
Extraction pipeline (OUT OF SCOPE — produces flat JSON, e.g.
{"invoice_number": "INV-001", "supplier": "ABC Ltd", "amount": 50000})
        |
        v
Mapping layer            ontology/mappings/{invoice,contract,payment}.py
  - Turns flat JSON into Entities, Relationships, AttributeAssertions
  - Attaches Provenance to every one
  - Never fabricates a value for a field that wasn't extracted (Rule 4)
        |
        v
Validation layer          ontology/models/{entity,relationship,assertion}.py
  - Pydantic v2 models reject invalid facts at CONSTRUCTION time,
    not later at write time
        |
        v
FactStore                 ontology/store/fact_store.py
  - Resolves entities across documents by natural key
  - Rejects exact duplicates
  - NEVER overwrites a conflicting claim (Rule 5)
        |
        v
Organizational Facts (in-memory; future: graph persistence, Phase 2)
```

## Why this shape

The design doc's own diagram (section 4) draws five stages: Source
Documents -> Tokenizer -> Normalized Tokens -> Ontology Layer -> Organizational
Facts. This implementation treats "Tokenizer -> Normalized Tokens" as the
part that's explicitly out of scope (an extraction pipeline is assumed to
already exist and hand off flat JSON), and implements everything from
"Ontology Layer" onward: the mapping layer produces the normalized-token
equivalent as a side effect of building typed Entities.

## Key design decision: identity vs. asserted attributes

This is the one design choice the source document doesn't spell out
explicitly, but that Rules 4 and 5 jointly require:

- **Identity attributes** (an invoice's `invoice_number`, a contract's
  `contract_id`, a person's `name`) live directly on `Entity.attributes`.
  They are how the system recognizes "this is the same real-world thing"
  across documents (`Entity.identity_key()`), and they are required —
  Rule 1 fails fast if they're missing.
- **Business-value attributes** (an invoice's `amount`, a contract's
  `contract_value`, a payment's `amount`) are **not** plain fields. They are
  separate `AttributeAssertion` facts, each with its own provenance. This is
  the only way to literally satisfy Rule 5's worked example — "Document A
  says R500,000, Document B says R450,000, store both" — without one
  overwriting the other. See `ontology/models/assertion.py` for the full
  rationale.

## Why in-memory, not a graph database

Section 2 scope explicitly excludes "graph database implementation" from
Phase 1. `FactStore` is deliberately a plain in-memory structure so that
Phase 2 can swap in a real graph backend (Neo4j, a triple store, etc.)
behind the same `add_relationship` / `resolve_or_create_entity` interface
without having to revisit the validation rules — those live in the models,
not the store.
