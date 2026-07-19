from ontology.mappings.payment import map_payment
from ontology.mappings.common import commit, OrganizationalToken
from ontology.types import EntityType, RelationshipType


def test_payment_safely_tracks_references_without_settling_invoice(store):
    """
    Decoupled Phase 1 verification: Confirm the mapping creates isolated
    entities and tracks targeted reference contexts without assuming settlement status.
    """
    payment_token = OrganizationalToken(
        token_id="tok_pay_001",
        token_type="PAYMENT",
        payload={
            "payment_reference": "PAY-001",
            "invoice_number": "INV-001",
            "amount": 50000,
            "proof_of_payment_reference": "POP-9911"
        }
    )
    commit(store, map_payment(payment_token, source_id="pop_PAY-001.pdf", confidence=0.92))

    # Asserting no automatic SETTLES link is generated from raw reference ingestion
    settles = [r for r in store.all_relationships() if r.relationship_type == RelationshipType.SETTLES]
    assert len(settles) == 0

    payment_entity = next(e for e in store.all_entities() if e.type == EntityType.PAYMENT)
    assert payment_entity.attributes["unverified_target_invoice"] == "INV-001"