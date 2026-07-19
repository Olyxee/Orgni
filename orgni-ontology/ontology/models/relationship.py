"""
Relationship model (section 6, "Relationship Base Model").

Rule 2 ("every relationship must define source type, target type,
direction") is enforced two ways:
  1. Structurally — source_type and target_type are required fields, not
     inferred from the entities at write time, so a relationship record is
     self-describing even if read in isolation from the entities it links.
  2. Semantically — an `after` validator checks the (relationship_type,
     source_type, target_type) triple against RELATIONSHIP_CONSTRAINTS.
     An invalid combination (e.g. Person -- BILLS --> Invoice) is rejected
     at construction time with a message naming exactly what is and isn't
     allowed, rather than being silently accepted and only failing later at
     query time.

Temporal fields (effective_from/effective_to/event_timestamp) mirror what
Entity already carries — a relationship is just as time-sensitive as an
entity (e.g. "Person REPORTS_TO Person" was only true from March to June),
and the spec's Temporal Model section makes no distinction between the two.
Cardinality (how many of a given relationship_type a source/target may
participate in) is deliberately NOT checked here — it requires seeing
every other relationship already in the store, which a single Relationship
instance can't see in isolation. That check lives in
ontology/store/fact_store.py instead; see CardinalityViolationError.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, model_validator

from ontology.types import EntityType, RelationshipType
from ontology.constraints.relationship_constraints import validate_relationship_types
from ontology.models.provenance import Provenance


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Relationship(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    relationship_type: RelationshipType

    source_id: UUID
    source_type: EntityType
    target_id: UUID
    target_type: EntityType

    created_at: datetime = Field(default_factory=utcnow)
    effective_from: datetime | None = None
    effective_to: datetime | None = None
    event_timestamp: datetime | None = Field(
        default=None,
        description="When the real-world event this relationship represents actually occurred "
        "(e.g. the date a payment settled an invoice), as distinct from created_at.",
    )
    provenance: Provenance

    @model_validator(mode="after")
    def _check_no_self_loop_on_hierarchy(self) -> "Relationship":
        if self.relationship_type == RelationshipType.REPORTS_TO and self.source_id == self.target_id:
            raise ValueError("A person cannot report to themselves.")
        return self

    @model_validator(mode="after")
    def _check_direction(self) -> "Relationship":
        # Raises ValueError (caught upstream as a validation error) if this
        # relationship_type/source_type/target_type triple is not registered
        # as legal in RELATIONSHIP_CONSTRAINTS.
        validate_relationship_types(self.relationship_type, self.source_type, self.target_type)
        return self

    @model_validator(mode="after")
    def _check_effective_window(self) -> "Relationship":
        if self.effective_from and self.effective_to and self.effective_from > self.effective_to:
            raise ValueError("effective_from must not be after effective_to.")
        return self
