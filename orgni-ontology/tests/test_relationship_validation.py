import pytest
from pydantic import ValidationError

from ontology.models.entity import Entity
from ontology.models.relationship import Relationship
from ontology.types import EntityType, RelationshipType


def test_valid_relationship_invoice_bills_customer(prov):
    invoice = Entity(type=EntityType.INVOICE, attributes={"invoice_number": "INV-001"}, provenance=prov)
    customer = Entity(type=EntityType.CUSTOMER, attributes={"name": "XYZ"}, provenance=prov)
    rel = Relationship(
        relationship_type=RelationshipType.BILLS,
        source_id=invoice.id,
        source_type=EntityType.INVOICE,
        target_id=customer.id,
        target_type=EntityType.CUSTOMER,
        provenance=prov,
    )
    assert rel.relationship_type == RelationshipType.BILLS


def test_invalid_relationship_direction_is_rejected(prov):
    """A Customer cannot BILL an Invoice — direction is reversed from what's
    legal. Rule 2 must reject this at construction time."""
    customer = Entity(type=EntityType.CUSTOMER, attributes={"name": "XYZ"}, provenance=prov)
    invoice = Entity(type=EntityType.INVOICE, attributes={"invoice_number": "INV-001"}, provenance=prov)
    with pytest.raises(ValidationError) as exc_info:
        Relationship(
            relationship_type=RelationshipType.BILLS,
            source_id=customer.id,
            source_type=EntityType.CUSTOMER,
            target_id=invoice.id,
            target_type=EntityType.INVOICE,
            provenance=prov,
        )
    assert "does not permit source type" in str(exc_info.value)


def test_invalid_relationship_wrong_target_type_is_rejected(prov):
    """A Person cannot be the target of BILLS."""
    invoice = Entity(type=EntityType.INVOICE, attributes={"invoice_number": "INV-001"}, provenance=prov)
    person = Entity(type=EntityType.PERSON, attributes={"name": "Jane"}, provenance=prov)
    with pytest.raises(ValidationError) as exc_info:
        Relationship(
            relationship_type=RelationshipType.BILLS,
            source_id=invoice.id,
            source_type=EntityType.INVOICE,
            target_id=person.id,
            target_type=EntityType.PERSON,
            provenance=prov,
        )
    assert "does not permit target type" in str(exc_info.value)


def test_relationship_requires_provenance():
    with pytest.raises(ValidationError):
        Relationship(
            relationship_type=RelationshipType.BILLS,
            source_id="00000000-0000-0000-0000-000000000001",
            source_type=EntityType.INVOICE,
            target_id="00000000-0000-0000-0000-000000000002",
            target_type=EntityType.CUSTOMER,
        )  # type: ignore[call-arg]


def test_person_cannot_report_to_self(prov):
    person = Entity(type=EntityType.PERSON, attributes={"name": "Jane"}, provenance=prov)
    with pytest.raises(ValidationError):
        Relationship(
            relationship_type=RelationshipType.REPORTS_TO,
            source_id=person.id,
            source_type=EntityType.PERSON,
            target_id=person.id,
            target_type=EntityType.PERSON,
            provenance=prov,
        )


def test_contract_governed_by_rule_matches_worked_example(prov):
    contract = Entity(type=EntityType.CONTRACT, attributes={"contract_id": "CON-001"}, provenance=prov)
    rule = Entity(type=EntityType.RULE, attributes={"name": "ProcurementRule"}, provenance=prov)
    rel = Relationship(
        relationship_type=RelationshipType.GOVERNED_BY,
        source_id=contract.id,
        source_type=EntityType.CONTRACT,
        target_id=rule.id,
        target_type=EntityType.RULE,
        provenance=prov,
    )
    assert rel.target_type == EntityType.RULE
