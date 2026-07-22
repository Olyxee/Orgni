"""
Directly implements section 7, Rule 5's worked example:

    Document A: Contract Value = R500,000
    Document B: Contract Value = R450,000
    -> Store both assertions. Never overwrite.
"""

from ontology.mappings import map_contract
from packages.contracts.tokens import OrganizationalToken
from ontology.mappings.common import commit


def test_conflicting_contract_values_are_both_preserved(store):
    # Ingest using decoupled Phase 1 Organizational Tokens instead of direct schemas
    token_a = OrganizationalToken(
        token_id="tok_con_001_a",
        token_type="CONTRACT",
        payload={"contract_id": "CON-001", "supplier_name": "ABC Ltd", "contract_value": 500_000}
    )
    token_b = OrganizationalToken(
        token_id="tok_con_001_b",
        token_type="CONTRACT",
        payload={"contract_id": "CON-001", "supplier_name": "ABC Ltd", "contract_value": 450_000}
    )

    commit(store, map_contract(token_a, source_id="document_a.pdf", confidence=0.95))
    commit(store, map_contract(token_b, source_id="document_b.pdf", confidence=0.90))

    # Both mappings referred to the same structural identifier, so they must resolve
    # to the SAME Contract entity (identity resolution), not two contracts.
    contracts = [e for e in store.all_entities() if e.type.value == "Contract"]
    assert len(contracts) == 1
    contract = contracts[0]

    # Yet both value assertions must be present, distinct, and traceable.
    assertions = store.conflicting_assertions(contract.id, "contract_value")
    values = sorted(a.value for a in assertions)
    sources = sorted(a.provenance.source_id for a in assertions)

    assert values == [450_000, 500_000]
    assert sources == ["document_a.pdf", "document_b.pdf"]

    # Neither assertion overwrote the other.
    assert len(assertions) == 2