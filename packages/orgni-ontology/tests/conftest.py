import pytest

from ontology.store.fact_store import FactStore
from ontology.models.provenance import Provenance
from ontology.types import EntityType


@pytest.fixture
def store() -> FactStore:
    return FactStore()


@pytest.fixture
def prov() -> Provenance:
    return Provenance(
        source_id="contract.pdf",
        source_type=EntityType.CONTRACT,
        source_record="paragraph_12",
        extraction_method="tokenizer",
        confidence=0.94,
    )
