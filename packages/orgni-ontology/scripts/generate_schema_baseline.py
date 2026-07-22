"""
Regenerates tests/fixtures/schema_baseline.json from the CURRENT state of
the ontology.

Do not run this casually. This file is the frozen reference that
tests/test_schema_compatibility.py checks every future change against.
Only run this (and commit the result) when you have deliberately made a
contract-breaking change and bumped SCHEMA_VERSION's major component in
ontology/schema_version.py accordingly — i.e. this script is part of the
"ship a breaking change" workflow, not part of routine development.

Run with:  python -m scripts.generate_schema_baseline
"""

from __future__ import annotations

import json
from pathlib import Path

from ontology.contract_snapshot import compute_snapshot

REPO_ROOT = Path(__file__).resolve().parent.parent
BASELINE_PATH = REPO_ROOT / "tests" / "fixtures" / "schema_baseline.json"


def main() -> None:
    snapshot = compute_snapshot()
    BASELINE_PATH.parent.mkdir(parents=True, exist_ok=True)
    BASELINE_PATH.write_text(json.dumps(snapshot, indent=2, sort_keys=True) + "\n")
    print(f"wrote {BASELINE_PATH.relative_to(REPO_ROOT)} (schema_major_version={snapshot['schema_major_version']})")


if __name__ == "__main__":
    main()
