"""
Tests for the Temporal Model requirements: effective_from/effective_to on
both Entity and Relationship, and event_timestamp distinguishing "when the
real-world thing happened" from created_at ("when this record was written").
"""

import pytest
from pydantic import ValidationError

from ontology.models.entity import Entity
from ontology.models.relationship import Relationship
from ontology.types import EntityType, RelationshipType


def test_entity_supports_event_timestamp(prov):
    e = Entity(
        type=EntityType.INVOICE,
        attributes={"invoice_number": "INV-001"},
        provenance=prov,
        event_timestamp="2026-01-15T00:00:00Z",
    )
    assert e.event_timestamp is not None
    assert e.event_timestamp != e.created_at


def test_relationship_supports_effective_window(prov):
    person_a_id = "00000000-0000-0000-0000-000000000001"
    person_b_id = "00000000-0000-0000-0000-000000000002"
    rel = Relationship(
        relationship_type=RelationshipType.REPORTS_TO,
        source_id=person_a_id,
        source_type=EntityType.PERSON,
        target_id=person_b_id,
        target_type=EntityType.PERSON,
        provenance=prov,
        effective_from="2026-03-01T00:00:00Z",
        effective_to="2026-06-30T00:00:00Z",
    )
    assert rel.effective_from is not None
    assert rel.effective_to is not None


def test_relationship_rejects_inverted_effective_window(prov):
    person_a_id = "00000000-0000-0000-0000-000000000001"
    person_b_id = "00000000-0000-0000-0000-000000000002"
    with pytest.raises(ValidationError):
        Relationship(
            relationship_type=RelationshipType.REPORTS_TO,
            source_id=person_a_id,
            source_type=EntityType.PERSON,
            target_id=person_b_id,
            target_type=EntityType.PERSON,
            provenance=prov,
            effective_from="2026-06-30T00:00:00Z",
            effective_to="2026-03-01T00:00:00Z",
        )


def test_relationship_supports_event_timestamp(prov):
    payment_id = "00000000-0000-0000-0000-000000000003"
    invoice_id = "00000000-0000-0000-0000-000000000004"
    rel = Relationship(
        relationship_type=RelationshipType.SETTLES,
        source_id=payment_id,
        source_type=EntityType.PAYMENT,
        target_id=invoice_id,
        target_type=EntityType.INVOICE,
        provenance=prov,
        event_timestamp="2026-05-01T00:00:00Z",
    )
    assert rel.event_timestamp is not None
