import pytest
from pydantic import ValidationError

from ontology.models.entity import Entity
from ontology.types import EntityType


def test_valid_entity_has_id_and_type_by_construction(prov):
    e = Entity(type=EntityType.SUPPLIER, attributes={"name": "ABC Ltd"}, provenance=prov)
    assert e.id is not None
    assert e.type == EntityType.SUPPLIER


def test_entity_requires_a_type():
    with pytest.raises(ValidationError):
        Entity(attributes={"name": "ABC Ltd"})  # type: ignore[call-arg]


def test_entity_rejects_unknown_type(prov):
    with pytest.raises(ValidationError):
        Entity(type="NotARealType", attributes={"name": "x"}, provenance=prov)  # type: ignore[arg-type]


def test_entity_requires_provenance():
    with pytest.raises(ValidationError):
        Entity(type=EntityType.SUPPLIER, attributes={"name": "ABC Ltd"})  # type: ignore[call-arg]


def test_entity_missing_identity_attribute_is_rejected(prov):
    """Rule 1 + Rule 4: a Supplier without a name is not a usable entity, and
    the system must not invent one."""
    with pytest.raises(ValidationError) as exc_info:
        Entity(type=EntityType.SUPPLIER, attributes={}, provenance=prov)
    assert "name" in str(exc_info.value)


def test_effective_window_must_be_ordered(prov):
    with pytest.raises(ValidationError):
        Entity(
            type=EntityType.SUPPLIER,
            attributes={"name": "ABC Ltd"},
            provenance=prov,
            effective_from="2026-06-01T00:00:00Z",
            effective_to="2026-01-01T00:00:00Z",
        )


def test_identity_key_matches_for_same_natural_key(prov):
    e1 = Entity(type=EntityType.INVOICE, attributes={"invoice_number": "INV-001"}, provenance=prov)
    e2 = Entity(type=EntityType.INVOICE, attributes={"invoice_number": "INV-001", "extra": "ignored"}, provenance=prov)
    assert e1.identity_key() == e2.identity_key()


def test_identity_key_differs_for_different_natural_key(prov):
    e1 = Entity(type=EntityType.INVOICE, attributes={"invoice_number": "INV-001"}, provenance=prov)
    e2 = Entity(type=EntityType.INVOICE, attributes={"invoice_number": "INV-002"}, provenance=prov)
    assert e1.identity_key() != e2.identity_key()
