from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Dict, Any, Literal

class StateModel(BaseModel):
    """
    Tracks state machine values for target entities without implying cross-entity resolution.
    """
    entity_id: str = Field(..., description="Target internal surrogate identifier")
    current_state: str = Field(..., description="E.g., UNPAID, PARTIALLY_PAID, PENDING_MATCH")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    state_qualifiers: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Internal telemetry metrics keeping trace of balance parameters"
    )