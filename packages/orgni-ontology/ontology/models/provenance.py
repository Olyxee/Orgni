"""
Provenance model — v2 shape, per the "Provenance Model" section of the
Phase 1 Engineering Design Specification:

    {
      "source_id": "document_identifier",
      "source_type": "Invoice",
      "confidence": 0.97,
      "extraction_method": "system_name",
      "timestamp": "2026-07-01T12:00:00Z"
    }

This is a deliberate BREAKING change from the v1 shape
(source_document/source_record/extraction_method/confidence) — see
docs/adr/0004-provenance-v2-field-rename.md for the full rationale and
docs/contract-stability.md's version history for the migration note.
SCHEMA_VERSION was bumped to 2.0.0 specifically because of this rename.

Field-by-field mapping from v1 -> v2:
    source_document  -> source_id     (same meaning: identifies the source
                                        document/record the fact came from)
    (new)            -> source_type   (what KIND of document source_id is —
                                        typed against EntityType so it's
                                        drawn from the same closed
                                        vocabulary as everything else,
                                        rather than a free-text label that
                                        could drift out of sync)
    extraction_method -> extraction_method  (unchanged)
    confidence         -> confidence         (unchanged)
    (new)             -> timestamp    (when the evidence was captured/
                                        asserted — distinct from an
                                        Entity's or Relationship's
                                        created_at, which is when the FACT
                                        RECORD was created in this system;
                                        timestamp is when the underlying
                                        evidence itself was produced, e.g.
                                        the document's own date, which may
                                        be earlier)

`source_record` (the v1 field for a finer-grained locator like
"paragraph_12") is kept as an OPTIONAL addition beyond the spec's four
required fields — dropping it would lose real locator precision that
several existing facts want to keep, and keeping it as optional is a safe,
additive choice under the contract-stability policy (it does not appear
in the spec's worked example, but nothing in the spec says a locator field
is forbidden, and Rule 3 — "evidence linkage required" — is only
strengthened by keeping it).
"""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field, ConfigDict

from ontology.types import EntityType


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Provenance(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    source_id: str = Field(
        ..., min_length=1, description="Identifier of the source document/record, e.g. 'invoice_INV-001.pdf'."
    )
    source_type: EntityType = Field(
        ..., description="What kind of document source_id is, e.g. Invoice, Contract, ProofOfPayment."
    )
    extraction_method: str = Field(
        ..., min_length=1, description="How the value was obtained, e.g. 'tokenizer', 'manual_entry', 'ocr'."
    )
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Extraction confidence in [0, 1]. Required — never defaulted."
    )
    timestamp: datetime = Field(
        default_factory=_utcnow,
        description="When this evidence was captured/asserted. Defaults to now() if not supplied by the caller — "
        "this is a system-generated capture time, not an inferred business value, so it does not violate "
        "Rule 4 ('never infer missing values') to default it.",
    )
    source_record: str | None = Field(
        default=None,
        description="Optional finer-grained locator within the source, e.g. 'paragraph_12', 'row_4'. "
        "Not part of the v2 spec's required fields; kept as an additive, optional extension.",
    )

    def fingerprint(self) -> tuple:
        """A stable key used for duplicate detection. Two facts are considered
        to originate from the *same* evidence if they share this fingerprint."""
        return (self.source_id, self.source_type, self.source_record, self.extraction_method)
