import pytest
from pydantic import ValidationError

from ontology.models.provenance import Provenance
from ontology.models.assertion import AttributeAssertion
from ontology.types import EntityType
from uuid import uuid4


def test_provenance_confidence_must_be_in_unit_interval():
    with pytest.raises(ValidationError):
        Provenance(source_id="x.pdf", source_type=EntityType.INVOICE, extraction_method="tokenizer", confidence=1.5)


def test_provenance_requires_source_id():
    with pytest.raises(ValidationError):
        Provenance(source_type=EntityType.INVOICE, extraction_method="tokenizer", confidence=0.9)  # type: ignore[call-arg]


def test_provenance_requires_source_type():
    with pytest.raises(ValidationError):
        Provenance(source_id="x.pdf", extraction_method="tokenizer", confidence=0.9)  # type: ignore[call-arg]


def test_provenance_requires_extraction_method():
    with pytest.raises(ValidationError):
        Provenance(source_id="x.pdf", source_type=EntityType.INVOICE, confidence=0.9)  # type: ignore[call-arg]


def test_provenance_timestamp_defaults_when_not_supplied():
    """timestamp is required by the spec's own JSON shape, but defaulting it
    to now() when the caller doesn't supply one is a system fact, not an
    inferred business value — so this default does not violate Rule 4."""
    p = Provenance(source_id="x.pdf", source_type=EntityType.INVOICE, extraction_method="tokenizer", confidence=0.9)
    assert p.timestamp is not None


def test_provenance_is_immutable():
    p = Provenance(source_id="x.pdf", source_type=EntityType.INVOICE, extraction_method="tokenizer", confidence=0.9)
    with pytest.raises(ValidationError):
        p.confidence = 0.1  # type: ignore[misc]


def test_attribute_assertion_cannot_exist_without_provenance():
    with pytest.raises(ValidationError):
        AttributeAssertion(entity_id=uuid4(), attribute_name="amount", value=100)  # type: ignore[call-arg]
