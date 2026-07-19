"""
Schema version and compatibility policy.

This is the single source of truth for the ontology's *contract* version —
distinct from `ontology.__version__`, which tracks the Python package.
A downstream component consuming `schema/*.json` should pin against
SCHEMA_VERSION, not the package version, because the package could gain a
new mapping function or an internal refactor (package version bump) without
the semantic contract changing at all (schema version unchanged).

Policy (see docs/contract-stability.md for the full statement):

  MAJOR — bumped when a change could break an existing downstream consumer:
          an entity type is removed, a relationship type is removed, a
          relationship's allowed source/target types are narrowed, a field
          is removed from a base model, or a new REQUIRED field is added to
          a base model that existing producers wouldn't already be sending.

  MINOR — bumped when a change is purely additive and safe for existing
          consumers: a new entity type, a new relationship type, a
          relationship's allowed source/target types are widened, a new
          OPTIONAL field is added to a base model.

  PATCH — bumped for anything with no consumer-visible effect: doc fixes,
          description text changes, internal refactors.

`tests/test_schema_compatibility.py` enforces the MAJOR-bump rules
automatically by comparing the live schema against a committed baseline
snapshot (`tests/fixtures/schema_baseline.json`). If that test fails, it
means the change you just made is contract-breaking and SCHEMA_VERSION's
major component must be bumped (and the baseline snapshot deliberately
regenerated) before merging.
"""

SCHEMA_VERSION = "2.0.0"


def schema_major_version(version: str = SCHEMA_VERSION) -> int:
    return int(version.split(".")[0])
