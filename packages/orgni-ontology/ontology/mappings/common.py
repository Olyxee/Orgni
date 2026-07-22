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
import uuid
from ontology.models.entity import Entity
from ontology.models.relationship import Relationship
from ontology.models.assertion import AttributeAssertion
from ontology.store.fact_store import FactStore
import hashlib

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
def generate_deterministic_id(entity_type: str, raw_value: str) -> str:
    """
    Generates a reliable, repeatable string ID using SHA-256.
    Ensures that identical strings always yield identical IDs across restarts.
    """
    # Normalize the string to prevent spacing or casing mismatch issues
    normalized = str(raw_value).strip().lower()
    
    # Create a unique combined string to prevent collisions across different entity types
    combined_string = f"{entity_type.lower()}:{normalized}"
    
    # Generate the SHA-256 hash digest
    sha256_hash = hashlib.sha256(combined_string.encode('utf-8')).hexdigest()
    
    # Return a clean prefix + hash structure
    return f"{entity_type.lower()}_{sha256_hash[:16]}"

ONTOLOGY_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

def generate_deterministic_id(entity_type: str, canonical_value: str) -> uuid.UUID:
    """
    Generates a RFC 4122 compliant UUIDv5 from an entity type and normalized string value.
    Always returns a valid UUID object accepted by Pydantic's UUID validation.
    """
    normalized = canonical_value.strip().lower()
    composite_key = f"{entity_type.lower()}:{normalized}"
    return uuid.uuid5(ONTOLOGY_NAMESPACE, composite_key)
