"""
Shared plumbing for all document-type mapping modules.

Each mapping module (invoice.py, contract.py, payment.py) turns raw
extraction JSON — the kind of flat, meaning-free record shown in section 2
of the design doc — into a MappingResult: a bundle of Entities,
Relationships, and AttributeAssertions with provenance attached to every
one of them. `commit()` then writes that bundle into a FactStore, entity by
entity, so that partial failures are visible (though in practice validation
happens at construction time, before commit is ever called).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ontology.models.entity import Entity
from ontology.models.relationship import Relationship
from ontology.models.assertion import AttributeAssertion
from ontology.store.fact_store import FactStore
from pydantic import BaseModel, Field
from typing import Dict, Any, Literal
from datetime import datetime, timezone

@dataclass
class MappingResult:
    entities: list[Entity] = field(default_factory=list)
    relationships: list[Relationship] = field(default_factory=list)
    assertions: list[AttributeAssertion] = field(default_factory=list)

    def merge(self, other: "MappingResult") -> "MappingResult":
        self.entities.extend(other.entities)
        self.relationships.extend(other.relationships)
        self.assertions.extend(other.assertions)
        return self


def commit(store: FactStore, result: MappingResult) -> dict[str, int]:
    """Writes a MappingResult into the store. Entities are resolved by
    identity key first (so re-mentioning 'Invoice INV-001' in a later
    document links to the existing node instead of duplicating it), then
    relationships and assertions are added directly."""
    resolved_by_original_id = {}
    for entity in result.entities:
        resolved = store.resolve_or_create_entity(entity)
        resolved_by_original_id[entity.id] = resolved.id

    committed_relationships = 0
    for rel in result.relationships:
        # Re-point source/target ids at whatever the entities actually
        # resolved to (in case an equivalent entity already existed).
        source_id = resolved_by_original_id.get(rel.source_id, rel.source_id)
        target_id = resolved_by_original_id.get(rel.target_id, rel.target_id)
        if source_id != rel.source_id or target_id != rel.target_id:
            rel = rel.model_copy(update={"source_id": source_id, "target_id": target_id})
        store.add_relationship(rel)
        committed_relationships += 1

    committed_assertions = 0
    for assertion in result.assertions:
        entity_id = resolved_by_original_id.get(assertion.entity_id, assertion.entity_id)
        if entity_id != assertion.entity_id:
            assertion = assertion.model_copy(update={"entity_id": entity_id})
        store.add_attribute_assertion(assertion)
        committed_assertions += 1

    return {
        "entities": len(result.entities),
        "relationships": committed_relationships,
        "assertions": committed_assertions,
    }
class OrganizationalToken(BaseModel):
    """
    Standardized wrapper that decouples the raw extraction JSON from 
    the Core Ontology Mapping layer.
    """
    token_id: str = Field(..., description="Unique synthetic UUID or URI for the token instance")
    token_type: Literal["CONTRACT", "INVOICE", "PAYMENT"] = Field(..., description="Categorized schema type")
    payload: Dict[str, Any] = Field(..., description="Normalized extracted properties and data fields")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Ingestion context, lineage, and source provenance")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))