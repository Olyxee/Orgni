from __future__ import annotations

from datetime import datetime
from ontology.models.entity import Entity
from ontology.models.relationship import Relationship
from ontology.models.assertion import AttributeAssertion
from ontology.models.provenance import Provenance
from ontology.types import EntityType, RelationshipType
from ontology.mappings.common import MappingResult, OrganizationalToken


def map_payment(
    token: OrganizationalToken,
    *,
    source_id: str,
    source_type: EntityType = EntityType.PROOF_OF_PAYMENT,
    source_record: str | None = None,
    extraction_method: str = "tokenizer",
    confidence: float = 0.9,
    timestamp: datetime | None = None,
) -> MappingResult:
    """
    Decoupled Payment mapping that consumes an OrganizationalToken.
    Strictly avoids assuming a payment SETTLES an invoice from its reference string alone.
    """
    if token.token_type != "PAYMENT":
        raise ValueError(f"Expected PAYMENT token, got {token.token_type}")

    payload = token.payload
    payment_reference = payload.get("payment_reference")
    invoice_number = payload.get("invoice_number")
    proof_of_payment_reference = payload.get("proof_of_payment_reference")
    amount = payload.get("amount")

    if not payment_reference or not invoice_number:
        raise ValueError("Missing critical fields: 'payment_reference' and 'invoice_number' are required.")

    prov = Provenance(
        source_id=source_id,
        source_type=source_type,
        source_record=source_record,
        extraction_method=extraction_method,
        confidence=confidence,
        **({"timestamp": timestamp} if timestamp is not None else {}),
    )
    result = MappingResult()

    # Track structural transaction references on the payment node
    payment = Entity(
        type=EntityType.PAYMENT,
        attributes={
            "payment_reference": payment_reference,
            "unverified_target_invoice": invoice_number  # Stored safely as an attribute trace to avoid auto-settlement
        },
        provenance=prov,
    )
    result.entities.append(payment)

    if proof_of_payment_reference is not None:
        pop = Entity(
            type=EntityType.PROOF_OF_PAYMENT,
            attributes={"reference_number": proof_of_payment_reference},
            provenance=prov,
        )
        result.entities.append(pop)
        
        # Valid: Payment is SUPPORTED_BY a ProofOfPayment document entity
        result.relationships.append(
            Relationship(
                relationship_type=RelationshipType.SUPPORTED_BY,
                source_id=payment.id,
                source_type=EntityType.PAYMENT,
                target_id=pop.id,
                target_type=EntityType.PROOF_OF_PAYMENT,
                provenance=prov,
            )
        )

    if amount is not None:
        result.assertions.append(
            AttributeAssertion(entity_id=payment.id, attribute_name="amount", value=amount, provenance=prov)
        )

    return result