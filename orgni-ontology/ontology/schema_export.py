"""
Generates the canonical JSON Schema (2020-12) artifacts described in
section 5 ("Ontology Definition") and section 9 (repository layout:
schema/entities, schema/relationships, schema/constraints).

Pydantic v2's `model_json_schema()` emits JSON Schema 2020-12 by default,
so these files ARE the ontology's language-agnostic contract — any other
system (a Node service, a Go extractor, a validation-as-a-service endpoint)
can validate against them without depending on this Python package at all.

Every exported schema is stamped with two vendor-extension fields so a
downstream consumer can tell, without reading any Python, exactly which
version of the contract they're looking at and where to find the stability
policy:

  "$id"               a stable, dereferenceable identifier for this schema
  "x-schema-version"  the SCHEMA_VERSION this file was generated from —
                       see ontology/schema_version.py for the bump policy

A "schema_manifest.json" is also written at the schema/ root: a single
file a consumer can check first to see the overall contract version and
the full list of entity/relationship types currently supported, without
having to open every individual schema file.

Run with:  python -m ontology.schema_export
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from ontology.models.entity import Entity
from ontology.models.relationship import Relationship
from ontology.models.assertion import AttributeAssertion
from ontology.models.provenance import Provenance
from ontology.constraints.relationship_constraints import RELATIONSHIP_CONSTRAINTS
from ontology.schema_version import SCHEMA_VERSION
from ontology.types import EntityType, RelationshipType

REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_DIR = REPO_ROOT / "schema"

BASE_ID_URL = "https://schema.orgni.internal/ontology"


def _write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=False) + "\n")


def _stamp(schema: dict, name: str) -> dict:
    """Adds $id and x-schema-version to a generated JSON Schema, without
    disturbing the fields Pydantic generated. Field order: $id and
    x-schema-version go first so they're the first thing a human or a
    diff sees when opening the file."""
    stamped = {
        "$id": f"{BASE_ID_URL}/{SCHEMA_VERSION}/{name}",
        "x-schema-version": SCHEMA_VERSION,
        **schema,
    }
    return stamped


def export_all() -> list[Path]:
    written: list[Path] = []

    entity_schema = _stamp(Entity.model_json_schema(), "entity.schema.json")
    p = SCHEMA_DIR / "entities" / "entity.schema.json"
    _write(p, entity_schema)
    written.append(p)

    relationship_schema = _stamp(Relationship.model_json_schema(), "relationship.schema.json")
    p = SCHEMA_DIR / "relationships" / "relationship.schema.json"
    _write(p, relationship_schema)
    written.append(p)

    assertion_schema = _stamp(AttributeAssertion.model_json_schema(), "attribute_assertion.schema.json")
    p = SCHEMA_DIR / "entities" / "attribute_assertion.schema.json"
    _write(p, assertion_schema)
    written.append(p)

    provenance_schema = _stamp(Provenance.model_json_schema(), "provenance.schema.json")
    p = SCHEMA_DIR / "constraints" / "provenance.schema.json"
    _write(p, provenance_schema)
    written.append(p)

    # Human/machine-readable dump of the relationship constraint registry,
    # i.e. the direction rulebook, as data rather than only as Python code —
    # so a non-Python system can still enforce Rule 2.
    constraints_payload = {
        "$id": f"{BASE_ID_URL}/{SCHEMA_VERSION}/relationship_constraints.json",
        "x-schema-version": SCHEMA_VERSION,
        "constraints": {
            rel_type.value: {
                "allowed_source_types": sorted(t.value for t in c.allowed_source_types),
                "allowed_target_types": sorted(t.value for t in c.allowed_target_types),
                "max_per_source": c.max_per_source,
                "max_per_target": c.max_per_target,
                "description": c.description,
            }
            for rel_type, c in RELATIONSHIP_CONSTRAINTS.items()
        },
    }
    p = SCHEMA_DIR / "constraints" / "relationship_constraints.json"
    _write(p, constraints_payload)
    written.append(p)

    # Top-level manifest — the one file a downstream consumer should check
    # first to see the overall contract version and the full type vocabulary,
    # without opening every individual schema file.
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "stability_policy": "docs/contract-stability.md",
        "entity_types": sorted(t.value for t in EntityType),
        "relationship_types": sorted(t.value for t in RelationshipType),
        "files": {
            "entity": "entities/entity.schema.json",
            "attribute_assertion": "entities/attribute_assertion.schema.json",
            "relationship": "relationships/relationship.schema.json",
            "provenance": "constraints/provenance.schema.json",
            "relationship_constraints": "constraints/relationship_constraints.json",
        },
    }
    p = SCHEMA_DIR / "schema_manifest.json"
    _write(p, manifest)
    written.append(p)

    return written


if __name__ == "__main__":
    for path in export_all():
        print(f"wrote {path.relative_to(REPO_ROOT)}")
