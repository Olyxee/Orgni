"""
AttributeAssertion — the mechanism behind Rule 5 ("conflicting facts
coexist... never overwrite").

This model is not named explicitly in section 6 of the design doc, but it is
required to actually satisfy Rule 5 as written. The doc's own example is:

    Document A: Contract Value = R500,000
    Document B: Contract Value = R450,000
    -> Store both assertions. Never overwrite.

A plain `contract.attributes["value"] = 500000` field cannot "store both" —
assigning it twice overwrites. An AttributeAssertion is therefore a
first-class fact: one (entity, attribute_name, value) claim, with its own
provenance, that can coexist with other claims about the same
(entity, attribute_name) pair without needing reconciliation at write time.
Reconciliation (choosing which value to "trust") is deliberately left to a
future reasoning layer (see section 11, out of scope for Phase 1) — this
layer's job is only to preserve all claims, faithfully and with evidence.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from ontology.models.provenance import Provenance


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AttributeAssertion(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    entity_id: UUID
    attribute_name: str = Field(..., min_length=1)
    value: Any
    created_at: datetime = Field(default_factory=utcnow)
    provenance: Provenance

    def conflicts_with(self, other: "AttributeAssertion") -> bool:
        """Two assertions 'conflict' when they claim different values for the
        same entity+attribute. This is informational, not rejected — Rule 5
        requires both to be retained regardless."""
        return (
            self.entity_id == other.entity_id
            and self.attribute_name == other.attribute_name
            and self.value != other.value
        )

    def duplicate_fingerprint(self) -> tuple:
        """Two assertions are true duplicates (same claim, same evidence) if
        this fingerprint matches — these ARE rejected by the store, since a
        duplicate adds no new information and Acceptance Criteria #5/#8
        require duplicate facts to be handled deliberately, not silently
        accumulated."""
        return (self.entity_id, self.attribute_name, self.value, self.provenance.fingerprint())
