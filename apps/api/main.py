from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from packages.contracts.tokens import OrganizationalToken

# Minimal operational setup simulating a fast ingestion endpoint
def handle_incoming_extraction(document_type: str, extracted_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ingests flat data from the tokenizer, standardizes it into a canonical token,
    and forwards it out for structural mapping.
    """
    if document_type not in ["INVOICE", "CONTRACT", "PAYMENT"]:
        raise ValueError(f"Unsupported document type boundary: {document_type}")
        
    # Standardize data instantly inside the API boundary using the shared schema
    token = OrganizationalToken(
        token_id=f"tok_{uuid.uuid4().hex[:12]}",
        token_type=document_type,
        payload=extracted_payload,
        metadata={
            "ingested_by": "apps/api",
            "environment": "production"
        },
        timestamp=datetime.now(timezone.utc)
    )
    
    # Minimal validation response return
    return {
        "status": "tokenized_successfully",
        "token_id": token.token_id,
        "payload_snapshot": token.payload
    }