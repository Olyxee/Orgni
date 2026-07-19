from __future__ import annotations

from datetime import datetime
from ontology.models.entity import Entity
from ontology.models.relationship import Relationship
from ontology.models.assertion import AttributeAssertion
from ontology.models.provenance import Provenance
from ontology.types import EntityType, RelationshipType
from ontology.mappings.common import MappingResult, OrganizationalToken


def map_invoice(
    token: OrganizationalToken,
    *,
    source_id: str,
    source_type: EntityType = EntityType.INVOICE,
    source_record: str | None = None,
    extraction_method: str = "tokenizer",
    confidence: float = 0.9,
    timestamp: datetime | None = None,
) -> MappingResult:
    """
    Decoupled Invoice mapping that consumes an OrganizationalToken.
    """
    if token.token_type != "INVOICE":
        raise ValueError(f"Expected INVOICE token, got {token.token_type}")

    payload = token.payload
    invoice_number = payload.get("invoice_number")
    supplier_name = payload.get("supplier_name")
    customer_name = payload.get("customer_name")
    amount = payload.get("amount")
    currency = payload.get("currency")
    issue_date = payload.get("issue_date")
    contract_id = payload.get("contract_id")

    if not invoice_number or not supplier_name:
        raise ValueError("Missing critical fields: 'invoice_number' and 'supplier_name' are required.")

    prov = Provenance(
        source_id=source_id,
        source_type=source_type,
        source_record=source_record,
        extraction_method=extraction_method,
        confidence=confidence,
        **({"timestamp": timestamp} if timestamp is not None else {}),
    )
    result = MappingResult()

    # Fixed: Uses exact required schema key 'invoice_number'
    invoice = Entity(
        type=EntityType.INVOICE,
        attributes={"invoice_number": invoice_number},
        provenance=prov,
    )
    supplier = Entity(
        type=EntityType.SUPPLIER,
        attributes={"name": f"SPL-{hash(supplier_name)}"},
        provenance=prov,
    )
    document = Entity(
        type=EntityType.DOCUMENT,
        attributes={"source_document": source_id},
        provenance=prov,
    )
    result.entities += [invoice, supplier, document]

    result.assertions.append(
        AttributeAssertion(entity_id=supplier.id, attribute_name="legal_name", value=supplier_name, provenance=prov)
    )

    result.relationships.append(
        Relationship(
            relationship_type=RelationshipType.CREATED_BY,
            source_id=invoice.id,
            source_type=EntityType.INVOICE,
            target_id=supplier.id,
            target_type=EntityType.SUPPLIER,
            provenance=prov,
        )
    )
    result.relationships.append(
        Relationship(
            relationship_type=RelationshipType.SUPPORTED_BY,
            source_id=invoice.id,
            source_type=EntityType.INVOICE,
            target_id=document.id,
            target_type=EntityType.DOCUMENT,
            provenance=prov,
        )
    )

    if customer_name is not None:
        customer = Entity(
            type=EntityType.CUSTOMER,
            attributes={"name": f"CST-{hash(customer_name)}"},
            provenance=prov,
        )
        result.entities.append(customer)
        result.assertions.append(
            AttributeAssertion(entity_id=customer.id, attribute_name="display_name", value=customer_name, provenance=prov)
        )
        result.relationships.append(
            Relationship(
                relationship_type=RelationshipType.BILLS,
                source_id=invoice.id,
                source_type=EntityType.INVOICE,
                target_id=customer.id,
                target_type=EntityType.CUSTOMER,
                provenance=prov,
            )
        )

    if contract_id is not None:
        contract = Entity(
            type=EntityType.CONTRACT,
            attributes={"contract_id": contract_id},
            provenance=prov,
        )
        result.entities.append(contract)
        result.relationships.append(
            Relationship(
                relationship_type=RelationshipType.DERIVED_FROM,
                source_id=invoice.id,
                source_type=EntityType.INVOICE,
                target_id=contract.id,
                target_type=EntityType.CONTRACT,
                provenance=prov,
            )
        )

    if amount is not None:
        result.assertions.append(
            AttributeAssertion(entity_id=invoice.id, attribute_name="amount", value=amount, provenance=prov)
        )
    if currency is not None:
        result.assertions.append(
            AttributeAssertion(entity_id=invoice.id, attribute_name="currency", value=currency, provenance=prov)
        )
    if issue_date is not None:
        val_str = issue_date.isoformat() if isinstance(issue_date, datetime) else str(issue_date)
        result.assertions.append(
            AttributeAssertion(entity_id=invoice.id, attribute_name="issue_date", value=val_str, provenance=prov)
        )

    return result