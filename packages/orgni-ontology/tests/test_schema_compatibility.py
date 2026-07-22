"""
Enforces the compatibility policy stated in docs/contract-stability.md and
ontology/schema_version.py, by comparing the ontology's CURRENT shape
against the committed baseline snapshot (tests/fixtures/schema_baseline.json).

If this test fails, one of two things is true:

  1. You made an accidental breaking change (removed a type, narrowed a
     relationship's allowed types, added a new required field to a base
     model, or removed a required field a producer might rely on). Fix the
     code, not the test.

  2. You made a DELIBERATE breaking change. In that case: bump
     SCHEMA_VERSION's major component in ontology/schema_version.py, run
     `python -m scripts.generate_schema_baseline` to regenerate the
     baseline, and update docs/contract-stability.md to describe the
     migration. Only then should this test's baseline fixture change in
     your commit.

Additive, non-breaking changes (a new entity type, a new relationship
type, a relationship's allowed types widening, a new OPTIONAL field) are
expected to pass this test without any baseline update — that's the whole
point of separating MAJOR from MINOR.
"""

import json
from pathlib import Path

from ontology.contract_snapshot import compute_snapshot
from ontology.schema_version import SCHEMA_VERSION, schema_major_version

BASELINE_PATH = Path(__file__).resolve().parent / "fixtures" / "schema_baseline.json"


def _load_baseline() -> dict:
    return json.loads(BASELINE_PATH.read_text())


def test_baseline_fixture_exists():
    assert BASELINE_PATH.exists(), (
        "No committed schema baseline found. Run "
        "`python -m scripts.generate_schema_baseline` once to create it."
    )


def test_no_entity_types_removed():
    baseline = _load_baseline()
    current = compute_snapshot()
    missing = set(baseline["entity_types"]) - set(current["entity_types"])
    assert not missing, (
        f"Entity type(s) {sorted(missing)} were removed. This is a MAJOR, "
        f"contract-breaking change — bump SCHEMA_VERSION and regenerate "
        f"the baseline deliberately if this is intended."
    )


def test_no_relationship_types_removed():
    baseline = _load_baseline()
    current = compute_snapshot()
    missing = set(baseline["relationship_types"]) - set(current["relationship_types"])
    assert not missing, (
        f"Relationship type(s) {sorted(missing)} were removed. This is a "
        f"MAJOR, contract-breaking change."
    )


def test_identity_fields_unchanged_for_existing_types():
    """A downstream consumer that resolves entities by natural key depends
    on IDENTITY_FIELDS staying put for types that already existed. New
    types may define whatever identity field they like."""
    baseline = _load_baseline()
    current = compute_snapshot()
    for entity_type, fields in baseline["identity_fields"].items():
        assert entity_type in current["identity_fields"], f"{entity_type} was removed."
        assert current["identity_fields"][entity_type] == fields, (
            f"Identity field(s) for {entity_type} changed from {fields} to "
            f"{current['identity_fields'][entity_type]}. Renaming an identity "
            f"field breaks any consumer resolving entities by natural key — "
            f"this is a MAJOR change."
        )


def test_relationship_constraints_never_narrow():
    """Existing relationship types may gain new legal source/target types
    (widening — safe, additive) but must never lose one that a downstream
    consumer might already be relying on (narrowing — breaking)."""
    baseline = _load_baseline()
    current = compute_snapshot()
    for rel_type, constraint in baseline["relationship_constraints"].items():
        assert rel_type in current["relationship_constraints"], f"{rel_type} was removed."
        current_constraint = current["relationship_constraints"][rel_type]

        removed_sources = set(constraint["allowed_source_types"]) - set(current_constraint["allowed_source_types"])
        assert not removed_sources, (
            f"{rel_type} narrowed its allowed_source_types by removing "
            f"{sorted(removed_sources)} — this is a MAJOR, breaking change."
        )

        removed_targets = set(constraint["allowed_target_types"]) - set(current_constraint["allowed_target_types"])
        assert not removed_targets, (
            f"{rel_type} narrowed its allowed_target_types by removing "
            f"{sorted(removed_targets)} — this is a MAJOR, breaking change."
        )


def test_no_new_required_fields_on_base_models():
    """A new REQUIRED field on Entity/Relationship/Provenance/AttributeAssertion
    would break every existing producer that doesn't yet send it. New fields
    must be optional to stay backward compatible."""
    baseline = _load_baseline()
    current = compute_snapshot()
    for model_name, required in baseline["required_fields"].items():
        current_required = current["required_fields"][model_name]
        new_required = set(current_required) - set(required)
        assert not new_required, (
            f"{model_name} gained new REQUIRED field(s) {sorted(new_required)} "
            f"not present in the baseline. Existing producers don't send "
            f"these — this breaks them. Either make the field optional, or "
            f"if this is a deliberate MAJOR change, bump SCHEMA_VERSION and "
            f"regenerate the baseline."
        )


def test_relationship_cardinality_never_tightens():
    """A relationship's cardinality cap may be loosened (raised, or removed
    entirely — going from capped to None) but must never be tightened
    (lowered, or added where none existed before) — a consumer that was
    relying on being able to add a 3rd, 4th, 5th... relationship of a kind
    that was previously uncapped would break if a cap suddenly appeared or
    dropped below what they already rely on."""
    baseline = _load_baseline()
    current = compute_snapshot()
    for rel_type, constraint in baseline["relationship_constraints"].items():
        current_constraint = current["relationship_constraints"][rel_type]
        for field in ("max_per_source", "max_per_target"):
            old_cap = constraint.get(field)
            new_cap = current_constraint.get(field)
            if old_cap is None:
                assert new_cap is None, (
                    f"{rel_type}.{field} was uncapped but is now capped at {new_cap} — "
                    f"this is a MAJOR, breaking change (tightens an existing contract)."
                )
            elif new_cap is not None:
                assert new_cap >= old_cap, (
                    f"{rel_type}.{field} was capped at {old_cap} but is now capped at "
                    f"{new_cap} — lowering a cardinality cap is a MAJOR, breaking change."
                )


def test_major_version_matches_baseline_unless_deliberately_bumped():
    """If the code's major version has been bumped, the baseline fixture
    must have been regenerated to match — otherwise this test (and the
    ones above) would be comparing against a stale contract."""
    baseline = _load_baseline()
    current_major = schema_major_version(SCHEMA_VERSION)
    assert current_major == baseline["schema_major_version"], (
        f"SCHEMA_VERSION major component is {current_major} but the "
        f"committed baseline is for major version {baseline['schema_major_version']}. "
        f"Run `python -m scripts.generate_schema_baseline` to bring the "
        f"baseline in sync with the new major version."
    )
