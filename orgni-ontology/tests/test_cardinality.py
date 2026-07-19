"""
Tests for cardinality enforcement (Relationship Validation requirement:
"Cardinality enforcement"), added in v2. See
ontology/constraints/relationship_constraints.py (max_per_source /
max_per_target on RelationshipConstraint) and
ontology/store/fact_store.py::add_relationship.
"""

import pytest

from ontology.models.entity import Entity
from ontology.models.relationship import Relationship
from ontology.types import EntityType, RelationshipType
from ontology.store.exceptions import CardinalityViolationError


def _make_entity(store, entity_type, attrs, prov):
    return store.resolve_or_create_entity(Entity(type=entity_type, attributes=attrs, provenance=prov))


def test_bills_rejects_a_second_distinct_customer_for_the_same_invoice(store, prov):
    """BILLS is capped at max_per_source=1: an invoice bills exactly one
    customer. A second, DIFFERENT customer for the same invoice must be
    rejected as a cardinality violation."""
    invoice = _make_entity(store, EntityType.INVOICE, {"invoice_number": "INV-001"}, prov)
    customer_a = _make_entity(store, EntityType.CUSTOMER, {"name": "XYZ"}, prov)
    customer_b = _make_entity(store, EntityType.CUSTOMER, {"name": "ACME"}, prov)

    store.add_relationship(
        Relationship(
            relationship_type=RelationshipType.BILLS,
            source_id=invoice.id,
            source_type=EntityType.INVOICE,
            target_id=customer_a.id,
            target_type=EntityType.CUSTOMER,
            provenance=prov,
        )
    )
    with pytest.raises(CardinalityViolationError):
        store.add_relationship(
            Relationship(
                relationship_type=RelationshipType.BILLS,
                source_id=invoice.id,
                source_type=EntityType.INVOICE,
                target_id=customer_b.id,
                target_type=EntityType.CUSTOMER,
                provenance=prov,
            )
        )


def test_settles_allows_many_payments_against_one_invoice(store, prov):
    """SETTLES caps max_per_source=1 (one payment settles one invoice) but
    deliberately leaves max_per_target uncapped (an invoice may be settled
    by several partial payments) — this must NOT raise."""
    invoice = _make_entity(store, EntityType.INVOICE, {"invoice_number": "INV-001"}, prov)
    payment_a = _make_entity(store, EntityType.PAYMENT, {"payment_reference": "PAY-001"}, prov)
    payment_b = _make_entity(store, EntityType.PAYMENT, {"payment_reference": "PAY-002"}, prov)

    for payment in (payment_a, payment_b):
        store.add_relationship(
            Relationship(
                relationship_type=RelationshipType.SETTLES,
                source_id=payment.id,
                source_type=EntityType.PAYMENT,
                target_id=invoice.id,
                target_type=EntityType.INVOICE,
                provenance=prov,
            )
        )
    settles = [r for r in store.all_relationships() if r.relationship_type == RelationshipType.SETTLES]
    assert len(settles) == 2


def test_settles_rejects_one_payment_settling_two_distinct_invoices(store, prov):
    """The mirror case: max_per_source=1 on SETTLES means one payment cannot
    settle two DIFFERENT invoices."""
    payment = _make_entity(store, EntityType.PAYMENT, {"payment_reference": "PAY-001"}, prov)
    invoice_a = _make_entity(store, EntityType.INVOICE, {"invoice_number": "INV-001"}, prov)
    invoice_b = _make_entity(store, EntityType.INVOICE, {"invoice_number": "INV-002"}, prov)

    store.add_relationship(
        Relationship(
            relationship_type=RelationshipType.SETTLES,
            source_id=payment.id,
            source_type=EntityType.PAYMENT,
            target_id=invoice_a.id,
            target_type=EntityType.INVOICE,
            provenance=prov,
        )
    )
    with pytest.raises(CardinalityViolationError):
        store.add_relationship(
            Relationship(
                relationship_type=RelationshipType.SETTLES,
                source_id=payment.id,
                source_type=EntityType.PAYMENT,
                target_id=invoice_b.id,
                target_type=EntityType.INVOICE,
                provenance=prov,
            )
        )


def test_reasserting_the_same_edge_from_new_evidence_never_trips_cardinality(store, prov):
    """Corroborating the SAME (source, target) pair from a second document
    is not a new distinct participant, so it must never be blocked by a
    cardinality cap, even one as strict as max_per_source=1."""
    from ontology.models.provenance import Provenance

    prov2 = Provenance(
        source_id="second_document.pdf", source_type=EntityType.INVOICE, extraction_method="manual_entry", confidence=0.99
    )
    invoice = _make_entity(store, EntityType.INVOICE, {"invoice_number": "INV-001"}, prov)
    customer = _make_entity(store, EntityType.CUSTOMER, {"name": "XYZ"}, prov)

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
    # Should not raise — same edge, different (corroborating) evidence.
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


def test_has_role_allows_multiple_roles_per_person(store, prov):
    """HAS_ROLE is deliberately uncapped: a person may hold multiple roles
    concurrently."""
    person = _make_entity(store, EntityType.PERSON, {"name": "Jane"}, prov)
    role_a = _make_entity(store, EntityType.ROLE, {"title": "Approver"}, prov)
    role_b = _make_entity(store, EntityType.ROLE, {"title": "Reviewer"}, prov)

    for role in (role_a, role_b):
        store.add_relationship(
            Relationship(
                relationship_type=RelationshipType.HAS_ROLE,
                source_id=person.id,
                source_type=EntityType.PERSON,
                target_id=role.id,
                target_type=EntityType.ROLE,
                provenance=prov,
            )
        )
    has_role = [r for r in store.all_relationships() if r.relationship_type == RelationshipType.HAS_ROLE]
    assert len(has_role) == 2
