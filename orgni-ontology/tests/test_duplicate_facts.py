import pytest

from ontology.models.entity import Entity
from ontology.models.relationship import Relationship
from ontology.models.assertion import AttributeAssertion
from ontology.types import EntityType, RelationshipType
from ontology.store.exceptions import DuplicateFactError


def test_duplicate_relationship_from_same_evidence_is_rejected(store, prov):
    invoice = store.resolve_or_create_entity(
        Entity(type=EntityType.INVOICE, attributes={"invoice_number": "INV-001"}, provenance=prov)
    )
    customer = store.resolve_or_create_entity(
        Entity(type=EntityType.CUSTOMER, attributes={"name": "XYZ"}, provenance=prov)
    )
    rel_kwargs = dict(
        relationship_type=RelationshipType.BILLS,
        source_id=invoice.id,
        source_type=EntityType.INVOICE,
        target_id=customer.id,
        target_type=EntityType.CUSTOMER,
        provenance=prov,
    )
    store.add_relationship(Relationship(**rel_kwargs))
    with pytest.raises(DuplicateFactError):
        store.add_relationship(Relationship(**rel_kwargs))


def test_duplicate_attribute_assertion_from_same_evidence_is_rejected(store, prov):
    invoice = store.resolve_or_create_entity(
        Entity(type=EntityType.INVOICE, attributes={"invoice_number": "INV-001"}, provenance=prov)
    )
    assertion_kwargs = dict(entity_id=invoice.id, attribute_name="amount", value=50000, provenance=prov)
    store.add_attribute_assertion(AttributeAssertion(**assertion_kwargs))
    with pytest.raises(DuplicateFactError):
        store.add_attribute_assertion(AttributeAssertion(**assertion_kwargs))


def test_same_relationship_from_different_evidence_is_not_a_duplicate(store, prov):
    """Re-confirmation of the same fact from a second, independent document
    is new corroborating evidence, not a duplicate — it must be accepted."""
    from ontology.models.provenance import Provenance

    prov2 = Provenance(source_id="other.pdf", source_type=EntityType.INVOICE, extraction_method="manual_entry", confidence=0.99)
    invoice = store.resolve_or_create_entity(
        Entity(type=EntityType.INVOICE, attributes={"invoice_number": "INV-001"}, provenance=prov)
    )
    customer = store.resolve_or_create_entity(
        Entity(type=EntityType.CUSTOMER, attributes={"name": "XYZ"}, provenance=prov)
    )
    store.add_relationship(
        Relationship(
            relationship_type=RelationshipType.BILLS,
            source_id=invoice.id,
            source_type=EntityType.INVOICE,
            target_id=customer.id,
            target_type=EntityType.CUSTOMER,
            provenance=prov,
        )
    )
    # Should not raise.
    store.add_relationship(
        Relationship(
            relationship_type=RelationshipType.BILLS,
            source_id=invoice.id,
            source_type=EntityType.INVOICE,
            target_id=customer.id,
            target_type=EntityType.CUSTOMER,
            provenance=prov2,
        )
    )
    assert len(store.all_relationships()) == 2
