from __future__ import annotations

from datetime import datetime
from ontology.models.entity import Entity
from ontology.models.relationship import Relationship
from ontology.models.assertion import AttributeAssertion
from ontology.models.provenance import Provenance
from ontology.types import EntityType, RelationshipType
from ontology.mappings.common import MappingResult, OrganizationalToken


def map_contract(
    token: OrganizationalToken,
    *,
    source_id: str,
    source_type: EntityType = EntityType.CONTRACT,
    source_record: str | None = None,
    extraction_method: str = "tokenizer",
    confidence: float = 0.9,
    timestamp: datetime | None = None,
) -> MappingResult:
    """
    Decoupled Contract mapping that consumes an OrganizationalToken.
    """
    if token.token_type != "CONTRACT":
        raise ValueError(f"Expected CONTRACT token, got {token.token_type}")

    payload = token.payload
    contract_id = payload.get("contract_id")
    supplier_name = payload.get("supplier_name")
    contract_value = payload.get("contract_value")
    governing_rule_name = payload.get("governing_rule_name")

    if not contract_id or not supplier_name:
        raise ValueError("Missing critical fields: 'contract_id' and 'supplier_name' are required.")

    prov = Provenance(
        source_id=source_id,
        source_type=source_type,
        source_record=source_record,
        extraction_method=extraction_method,
        confidence=confidence,
        **({"timestamp": timestamp} if timestamp is not None else {}),
    )
    result = MappingResult()

    # Fixed: Uses exact required schema key 'contract_id'
    contract = Entity(
        type=EntityType.CONTRACT,
        attributes={"contract_id": contract_id},
        provenance=prov,
    )
    
    # Avoid names as keys: generate a synthetic structural identifier key for the supplier
    supplier = Entity(
        type=EntityType.SUPPLIER,
        attributes={"name": f"SPL-{hash(supplier_name)}"},
        provenance=prov,
    )
    result.entities += [contract, supplier]

    # Track the actual legal name safely as a mutable assertion instead of a core identity key
    result.assertions.append(
        AttributeAssertion(entity_id=supplier.id, attribute_name="legal_name", value=supplier_name, provenance=prov)
    )

    result.relationships.append(
        Relationship(
            relationship_type=RelationshipType.PARTY_TO,
            source_id=supplier.id,
            source_type=EntityType.SUPPLIER,
            target_id=contract.id,
            target_type=EntityType.CONTRACT,
            provenance=prov,
        )
    )

    if governing_rule_name is not None:
        rule = Entity(
            type=EntityType.RULE,
            attributes={"name": f"RUL-{hash(governing_rule_name)}"},
            provenance=prov,
        )
        result.entities.append(rule)
        result.assertions.append(
            AttributeAssertion(entity_id=rule.id, attribute_name="name", value=governing_rule_name, provenance=prov)
        )
        result.relationships.append(
            Relationship(
                relationship_type=RelationshipType.GOVERNED_BY,
                source_id=contract.id,
                source_type=EntityType.CONTRACT,
                target_id=rule.id,
                target_type=EntityType.RULE,
                provenance=prov,
            )
        )

    if contract_value is not None:
        result.assertions.append(
            AttributeAssertion(
                entity_id=contract.id,
                attribute_name="contract_value",
                value=contract_value,
                provenance=prov,
            )
        )

    return result