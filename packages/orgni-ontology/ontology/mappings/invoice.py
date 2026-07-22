from __future__ import annotations

from datetime import datetime
from ontology.models.entity import Entity
from ontology.models.relationship import Relationship
from ontology.models.assertion import AttributeAssertion
from ontology.models.provenance import Provenance
from ontology.types import EntityType, RelationshipType
from ontology.mappings.common import MappingResult, generate_deterministic_id
from packages.contracts.tokens import OrganizationalToken


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

    # Deterministic Entity ID for Invoice
    invoice_id = generate_deterministic_id("invoice", invoice_number)
    invoice = Entity(
        id=invoice_id,
        type=EntityType.INVOICE,
        attributes={"invoice_number": invoice_number},
        provenance=prov,
    )
    
    # Deterministic Entity ID for Supplier (strips whitespace and normalizes case)
    supplier_id = generate_deterministic_id("supplier", supplier_name.strip().lower())
    supplier = Entity(
        id=supplier_id,
        type=EntityType.SUPPLIER,
        attributes={"name": supplier_name.strip()},
        provenance=prov,
    )

    # Deterministic Entity ID for Source Document
    document_id = generate_deterministic_id("document", source_id)
    document = Entity(
        id=document_id,
        type=EntityType.DOCUMENT,
        attributes={"source_document": source_id},
        provenance=prov,
    )
    
    result.entities += [invoice, supplier, document]

    result.assertions.append(
        AttributeAssertion(entity_id=supplier.id, attribute_name="legal_name", value=supplier_name.strip(), provenance=prov)
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
        # Deterministic Entity ID for Customer (strips whitespace and normalizes case)
        customer_id = generate_deterministic_id("customer", customer_name.strip().lower())
        customer = Entity(
            id=customer_id,
            type=EntityType.CUSTOMER,
            attributes={"name": customer_name.strip()},
            provenance=prov,
        )
        result.entities.append(customer)
        result.assertions.append(
            AttributeAssertion(entity_id=customer.id, attribute_name="display_name", value=customer_name.strip(), provenance=prov)
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
        contract_uuid = generate_deterministic_id("contract", contract_id)
        contract = Entity(
            id=contract_uuid,
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