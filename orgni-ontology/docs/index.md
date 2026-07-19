# Orgni Organizational Ontology — Phase 1

This is the implementation of the Phase 1 Technical Design Document: a
machine-readable, validated, provenance-tracked semantic layer covering
**Invoice**, **Contract**, and **Proof of Payment** documents and the
business context around them.

It is a real, tested package — not a demo. Every rule in the design doc's
section 7 ("Validation Rules") is enforced in code and covered by an
automated test that fails if the rule is violated.

## What this package actually does

1. Defines a fixed vocabulary of **entity types** and **relationship types**
   (`ontology/types/`).
2. Defines, for every relationship type, exactly which entity types are
   legal at its source and target (`ontology/constraints/`) — this is the
   ontology's actual semantic content, not just a data shape.
3. Provides Pydantic v2 models (`ontology/models/`) that make the five
   validation rules structurally impossible to violate rather than
   something a caller has to remember to check.
4. Provides a `FactStore` (`ontology/store/`) that resolves entities across
   documents by natural key, rejects true duplicates, and — critically —
   never overwrites a conflicting claim.
5. Provides mapping functions (`ontology/mappings/`) that turn flat
   extraction JSON (the kind shown in section 2 of the design doc) into
   ontology facts, with provenance attached to every one.
6. Exports the ontology as JSON Schema 2020-12 (`schema/`) so any other
   system — not just this Python package — can validate against the same
   contract.

## Quick start

```bash
pip install -r requirements.txt
python3 -m pytest                 # 30 tests, all passing
python3 -m ontology.schema_export # (re)generate schema/*.json
python3 run_demo.py               # end-to-end walkthrough
```

## Where to go next

- [Architecture](architecture.md) — how the pieces fit together and why
- [Entities](entities.md) — the entity type catalogue and identity fields
- [Relationships](relationships.md) — the direction/constraint rulebook
- [Validation Rules](validation-rules.md) — where each of the doc's 5 rules is enforced, with code pointers
- [Contract Stability Policy](contract-stability.md) — what downstream components can safely assume will never change, and how that's enforced automatically
- [Architecture Decision Records](adr/README.md) — the numbered log of decisions, alternatives considered, and consequences, including how the two source specifications' conflicts were resolved
- [Extending the Ontology](extending-the-ontology.md) — the two-file checklist for adding a new type
