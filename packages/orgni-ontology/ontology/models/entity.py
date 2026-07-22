"""
Entity model (section 6, "Entity Base Model").

Design decision — identity vs. asserted attributes:
The design doc's Rule 4 ("unknown values remain null, never infer") and
Rule 5 ("conflicting facts coexist, never overwrite") together imply that
an entity's *business-value* fields (an invoice amount, a contract value, a
payment status) cannot simply be plain attributes on the entity, because two
documents may claim two different values for the same entity, and both must
be kept. If those values lived directly on Entity.attributes, "storing both"
would be impossible without silently overwriting one.

So this ontology draws a line:
  - Entity.attributes holds only the entity's *identity* attributes — the
    natural-key values used to recognize "this is the same real-world thing"
    across documents (e.g. an invoice_number, a contract_id, a person's name).
    These are required and are not expected to conflict; if they do (e.g.
    same invoice_number, different supplier name), that is itself a
    reconciliation problem, not something this layer silently resolves.
  - Every other business fact about the entity (amount, contract value,
    status, dates) is modeled as a separate AttributeAssertion (see
    assertion.py), each carrying its own provenance, so that conflicting
    claims from different documents can coexist and be queried explicitly.

IDENTITY_FIELDS is the single place that defines, per entity type, which
attribute key(s) count as identity. Extending the ontology with a new entity
type means adding one line here.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, model_validator

from ontology.types import EntityType
from ontology.models.provenance import Provenance

# Entity type -> required identity attribute key(s) that must be present
# (and non-null) in Entity.attributes for that type.
IDENTITY_FIELDS: dict[EntityType, tuple[str, ...]] = {
    EntityType.ORGANIZATION: ("name",),
    EntityType.DEPARTMENT: ("name",),
    EntityType.PERSON: ("name",),
    EntityType.ROLE: ("title",),
    EntityType.SUPPLIER: ("name",),
    EntityType.CUSTOMER: ("name",),
    EntityType.COUNTERPARTY: ("name",),
    EntityType.DOCUMENT: ("source_document",),
    EntityType.INVOICE: ("invoice_number",),
    EntityType.PROOF_OF_PAYMENT: ("reference_number",),
    EntityType.CONTRACT: ("contract_id",),
    EntityType.TRANSACTION: ("transaction_id",),
    EntityType.PAYMENT: ("payment_reference",),
    EntityType.AMOUNT: ("label",),
    EntityType.ACCOUNT: ("account_number",),
    EntityType.WORKFLOW: ("name",),
    EntityType.TASK: ("name",),
    EntityType.APPROVAL: ("reference",),
    EntityType.DECISION: ("reference",),
    EntityType.RULE: ("name",),
    EntityType.OBLIGATION: ("name",),
    EntityType.EXCEPTION: ("reference",),
    EntityType.RISK: ("name",),
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Entity(BaseModel):
    """A node in the organizational ontology.

    Rule 1 ("every entity must have ID and type") is enforced structurally:
    `id` and `type` are required fields with no defaults for `type`.
    """

    id: UUID = Field(default_factory=uuid4)
    type: EntityType
    attributes: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utcnow)
    effective_from: datetime | None = None
    effective_to: datetime | None = None
    event_timestamp: datetime | None = Field(
        default=None,
        description="When the real-world event this entity represents actually occurred "
        "(e.g. an invoice's issue date), as distinct from created_at (when this "
        "record was written) and effective_from/effective_to (the validity window).",
    )
    provenance: Provenance

    @model_validator(mode="after")
    def _check_identity_fields(self) -> "Entity":
        required = IDENTITY_FIELDS.get(self.type, ())
        missing = [f for f in required if self.attributes.get(f) in (None, "")]
        if missing:
            raise ValueError(
                f"Entity of type {self.type.value!r} is missing required identity "
                f"attribute(s) {missing}. Rule 4 forbids inferring these — the "
                f"caller must supply them or the entity must not be created."
            )
        return self

    @model_validator(mode="after")
    def _check_effective_window(self) -> "Entity":
        if self.effective_from and self.effective_to and self.effective_from > self.effective_to:
            raise ValueError("effective_from must not be after effective_to.")
        return self

    def identity_key(self) -> tuple[EntityType, tuple]:
        """Natural key used for cross-document entity resolution: same type
        plus same identity attribute values means 'the same real-world thing'."""
        fields = IDENTITY_FIELDS.get(self.type, ())
        return self.type, tuple(self.attributes.get(f) for f in fields)
