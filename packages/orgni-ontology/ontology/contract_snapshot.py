"""
Computes the subset of the ontology's current shape that the contract-
stability policy (docs/contract-stability.md) actually promises not to
break within a major version: the entity/relationship type vocabulary,
each relationship's allowed source/target types, and the required-field
set of every base model.

This is intentionally NOT "the whole schema" — cosmetic things like a
field's `description` text or JSON Schema key ordering are allowed to
change freely and are not captured here. Only consumer-visible structure
is captured, so this snapshot doesn't become a friction machine that fails
on harmless changes.

Used by:
  - scripts/generate_schema_baseline.py  (writes tests/fixtures/schema_baseline.json)
  - tests/test_schema_compatibility.py   (compares live state against it)
"""

from __future__ import annotations

from ontology.types import EntityType, RelationshipType
from ontology.constraints.relationship_constraints import RELATIONSHIP_CONSTRAINTS
from ontology.models.entity import Entity, IDENTITY_FIELDS
from ontology.models.relationship import Relationship
from ontology.models.provenance import Provenance
from ontology.models.assertion import AttributeAssertion
from ontology.schema_version import SCHEMA_VERSION, schema_major_version


def _required_fields(model) -> list[str]:
    return sorted(name for name, field in model.model_fields.items() if field.is_required())


def compute_snapshot() -> dict:
    return {
        "schema_major_version": schema_major_version(SCHEMA_VERSION),
        "entity_types": sorted(t.value for t in EntityType),
        "relationship_types": sorted(t.value for t in RelationshipType),
        "identity_fields": {t.value: list(fields) for t, fields in IDENTITY_FIELDS.items()},
        "relationship_constraints": {
            rt.value: {
                "allowed_source_types": sorted(t.value for t in c.allowed_source_types),
                "allowed_target_types": sorted(t.value for t in c.allowed_target_types),
                "max_per_source": c.max_per_source,
                "max_per_target": c.max_per_target,
            }
            for rt, c in RELATIONSHIP_CONSTRAINTS.items()
        },
        "required_fields": {
            "Entity": _required_fields(Entity),
            "Relationship": _required_fields(Relationship),
            "Provenance": _required_fields(Provenance),
            "AttributeAssertion": _required_fields(AttributeAssertion),
        },
    }
