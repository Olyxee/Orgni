# Extending the Ontology

This page exists to satisfy Acceptance Criteria #10: "another engineer can
extend the ontology without relying on tribal knowledge." Each extension
scenario below is a closed checklist — if you do only these steps, the
system stays internally consistent and every existing test keeps passing.

## Add a new entity type

1. Add the value to `EntityType` in `ontology/types/entity_types.py`.
2. Add its identity attribute name to `IDENTITY_FIELDS` in
   `ontology/models/entity.py`.
3. (Optional) If the type should participate in existing relationships,
   add it to the relevant `allowed_source_types` / `allowed_target_types`
   sets in `ontology/constraints/relationship_constraints.py`.
4. Run `python3 -m ontology.schema_export` to regenerate `schema/*.json`.

Nothing else needs to change. The `Entity` model, the `FactStore`, and the
mapping layer are all written against the enum and the identity-field map,
not against a hardcoded list of types.

## Add a new relationship type

1. Add the value to `RelationshipType` in
   `ontology/types/relationship_types.py`.
2. Add exactly one `RelationshipConstraint` entry to
   `RELATIONSHIP_CONSTRAINTS` in
   `ontology/constraints/relationship_constraints.py`, stating which entity
   types are legal at the source and target, plus a one-line description
   of what the relationship means. This step is not optional — a
   relationship type with no registered constraint will raise
   `ValueError("Unknown relationship type...")` the first time anyone tries
   to construct one.
3. Run `python3 -m ontology.schema_export` to regenerate
   `schema/constraints/relationship_constraints.json`.

## Add a new document type mapping (e.g. Purchase Order)

1. Create `ontology/mappings/purchase_order.py`, following the shape of
   `ontology/mappings/invoice.py`:
   - Define a Pydantic `*ExtractionInput` model describing the flat fields
     an extraction pipeline would hand over.
   - Write a `map_purchase_order(data, *, source_document, ...) -> MappingResult`
     function. Required input fields become required entity identity
     attributes; every optional input field must be wrapped in
     `if data.field is not None:` before it produces any fact — this is
     Rule 4, and it is not enforced by the type system, only by discipline.
   - Business values (amounts, dates that might later be corrected) become
     `AttributeAssertion`s, not entity attributes — see
     `docs/validation-rules.md#rule-5`.
2. Export the new input model and mapping function from
   `ontology/mappings/__init__.py`.
3. Add a `tests/test_mapping_purchase_order.py` covering: the minimal input
   case (no optional fields — assert nothing was invented), the full input
   case, and any new relationship types it introduces.

## Things that will break if skipped

- Adding an entity type without an `IDENTITY_FIELDS` entry: any attempt to
  construct that entity raises `ValidationError` immediately (Rule 1's
  identity-field check has no fallback).
- Adding a relationship type without a `RELATIONSHIP_CONSTRAINTS` entry:
  any attempt to construct that relationship raises `ValueError` (Rule 2's
  direction check looks the type up unconditionally).
- Writing a mapping function that fills in a "reasonable default" for a
  missing input field: this silently violates Rule 4 and will not be
  caught by any validator — it can only be caught in code review, which is
  why every existing mapping module's docstring calls this out explicitly.
