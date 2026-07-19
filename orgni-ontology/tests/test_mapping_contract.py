from ontology.mappings.contract import map_contract
from ontology.mappings.common import commit, OrganizationalToken
from ontology.types import RelationshipType


def test_minimal_contract_matches_design_doc_input_shape(store):
    """The design doc's own Contract input example only has contract_id and
    supplier — this must map without inventing a rule or a value."""
    token = OrganizationalToken(
        token_id="tok_con_001",
        token_type="CONTRACT",
        payload={"contract_id": "CON-001", "supplier_name": "ABC Ltd"}
    )
    commit(store, map_contract(token, source_id="contract_CON-001.pdf", confidence=0.9))

    # The Supplier<->Contract link uses PARTY_TO
    party_to = [r for r in store.all_relationships() if r.relationship_type == RelationshipType.PARTY_TO]
    assert len(party_to) == 1

    # No GOVERNED_BY relationship should exist since no rule was supplied.
    governed = [r for r in store.all_relationships() if r.relationship_type == RelationshipType.GOVERNED_BY]
    assert governed == []


def test_contract_governed_by_rule_when_supplied(store):
    token = OrganizationalToken(
        token_id="tok_con_002",
        token_type="CONTRACT",
        payload={
            "contract_id": "CON-001",
            "supplier_name": "ABC Ltd",
            "governing_rule_name": "ProcurementRule"
        }
    )
    commit(store, map_contract(token, source_id="contract_CON-001.pdf", confidence=0.9))

    governed = [r for r in store.all_relationships() if r.relationship_type == RelationshipType.GOVERNED_BY]
    assert len(governed) == 1
    rule = store.get_entity(governed[0].target_id)
    
    # Assert values are verified via attribute assertions or non-identity claims
    name_assertions = store.assertions_for(rule.id, "name")
    assert len(name_assertions) == 1
    assert name_assertions[0].value == "ProcurementRule"