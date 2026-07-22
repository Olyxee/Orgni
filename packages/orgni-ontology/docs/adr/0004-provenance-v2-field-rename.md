# ADR 0004: Provenance v2 — source_id/source_type/timestamp Replacing source_document/source_record

**Status:** Accepted — SCHEMA_VERSION bumped 1.0.0 → 2.0.0

## Context

The Phase 1 Technical Design Document's Provenance Model used:
```json
{"source_document": "contract.pdf", "source_record": "paragraph_12", "extraction_method": "tokenizer", "confidence": 0.94}
```
The later Engineering Design Specification's Provenance Model requires:
```json
{"source_id": "document_identifier", "source_type": "Invoice", "confidence": 0.97, "extraction_method": "system_name", "timestamp": "2026-07-01T12:00:00Z"}
```
These are not compatible by simple widening: `source_document` has no
`source_type` equivalent, and `timestamp` didn't exist at all in v1. This
is a genuine breaking change to the contract's most load-bearing model —
every single fact in the system carries a `Provenance`.

## Decision

Adopt the v2 shape as authoritative, since it is the newer, more detailed
specification, and treat this as what it actually is: a MAJOR,
breaking schema change.

- `source_document` → renamed to `source_id` (identical meaning).
- `source_type` added as a new required field, typed as `EntityType`
  (not a free-text string) so it draws from the same closed vocabulary as
  everything else in the ontology, rather than risking a `source_type`
  value that doesn't correspond to any real entity type.
- `timestamp` added as required-by-spec, but given a `default_factory=utcnow`
  so callers who don't explicitly supply one aren't broken — this default
  is a system-generated capture time, not an inferred business value, so
  it does not conflict with Principle 4 ("Unknown Remains Unknown").
- `source_record` (v1's finer-grained locator, e.g. `"paragraph_12"`) is
  KEPT, but demoted to optional. It isn't part of v2's four required
  fields, but dropping it entirely would lose real locator precision with
  no compensating benefit, and an optional field is a safe, additive
  choice that doesn't violate the letter of the v2 spec.

This is formally the first use of the "make a breaking change on purpose"
workflow documented in `docs/contract-stability.md`: `SCHEMA_VERSION` was
bumped to `2.0.0`, and `tests/fixtures/schema_baseline.json` was
regenerated via `python -m scripts.generate_schema_baseline` specifically
because of this change — `tests/test_schema_compatibility.py` correctly
failed before that regeneration, confirming the safety net works.

## Alternatives Considered

1. **Keep v1's shape and treat v2's Provenance section as a documentation
   error.** Rejected — v2 is the more recent, more detailed specification;
   deferring to the older one has no principled justification.
2. **Support both shapes simultaneously** (e.g. `source_document` as a
   deprecated alias for `source_id`). Considered, but rejected for Phase
   1 — there are no real external consumers of the v1 contract yet (this
   is a from-scratch Phase 1 build, not a live system with dependents), so
   the complexity of a compatibility shim buys nothing right now. If a
   real downstream consumer existed on the v1 contract, this would be the
   right call instead of a hard rename.
3. **Make `source_type` a free-text string**, matching v2's example
   (`"Invoice"` as a bare string) exactly. Rejected — typing it as
   `EntityType` gets validation for free (a typo like `"Invocie"` is
   caught at construction time) and keeps the vocabulary singular; the
   JSON Schema export still serializes it as a string enum, so an
   external, non-Python consumer sees no difference.

## Consequences

- Every mapping function's signature changed: `source_document=` became
  `source_id=`, and a `source_type=` parameter was added (defaulted
  per-mapping to the relevant document type, e.g. `map_invoice` defaults
  to `EntityType.INVOICE`).
- Every existing test and the demo script needed updating — a real cost,
  paid once, now, deliberately.
- Any real downstream consumer of the v1 schema would need to migrate:
  rename `source_document` → `source_id` in their own code, and start
  supplying `source_type`. This is exactly the kind of change
  `docs/contract-stability.md` exists to make loud and deliberate rather
  than silent.
