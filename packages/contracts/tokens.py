from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Literal
from pydantic import BaseModel, Field


class OrganizationalToken(BaseModel):
    """
    Standardized canonical wrapper that decouples raw extraction JSON from 
    the Core Ontology Mapping layer, shared across all microservices.
    """
    token_id: str = Field(..., description="Unique synthetic UUID or URI for the token instance")
    token_type: Literal["CONTRACT", "INVOICE", "PAYMENT"] = Field(..., description="Categorized schema type")
    payload: Dict[str, Any] = Field(..., description="Normalized extracted properties and data fields")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Ingestion context, lineage, and source provenance")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))