from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Dict, Any

class EventModel(BaseModel):
    """
    Represents an immutable immutable point-in-time domain occurrence.
    """
    event_id: str = Field(..., description="Unique immutable event identifier")
    event_type: str = Field(..., description="Type of domain event (e.g., INVOICE_PUBLISHED, PAYMENT_RECEIVED)")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))    
    payload: Dict[str, Any] = Field(..., description="Structured event property bag")
    provenance_id: str = Field(..., description="Link back to the generating OrganizationalToken ID")