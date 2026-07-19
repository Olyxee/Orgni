from pydantic import BaseModel, Field
from typing import List, Dict, Any

class PolicyModel(BaseModel):
    """
    Represents constraints and invariant criteria for evaluation.
    """
    policy_id: str = Field(..., description="Unique internal policy structural key")
    name: str = Field(..., description="Descriptive title of operational rule")
    invariant_rules: List[Dict[str, Any]] = Field(..., description="Rule-based matching logic parameters")
    is_active: bool = Field(default=True)