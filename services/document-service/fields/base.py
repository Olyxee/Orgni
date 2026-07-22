"""
Orgni Document Intelligence — field extraction primitives.

Core rule for every extractor built on this module: a field that cannot be
located in the source is simply absent. Nothing is guessed, defaulted or
back-filled, because a fabricated value would flow into an OrganizationalToken
and become indistinguishable from observed fact.

Every extracted field carries a value, a confidence, the method used, and an
evidence location (page + character span + verbatim excerpt) so the token it
produces can be traced back to the exact text that justified it.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field as dc_field
from datetime import datetime
from typing import Any, Iterable

# Extraction methods, mirroring ConfidenceMethod in the tokenizer envelope.
RULE_MATCH = "RULE_MATCH"
OCR_EXTRACTION = "OCR_EXTRACTION"
INFERRED = "INFERRED"

# Confidence below this is reported but flagged; the pipeline marks the whole
# extraction LOW_CONFIDENCE so downstream consumers can gate on it.
LOW_CONFIDENCE_THRESHOLD = 0.55


@dataclass
class Field:
    """A single extracted value plus its provenance."""

    value: Any
    confidence: float
    method: str
    page: int | None = None
    section: str | None = None
    raw: str | None = None
    span: tuple[int, int] | None = None

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "value": self.value,
            "confidence": round(self.confidence, 3),
            "method": self.method,
        }
        if self.page is not None:
            out["page"] = self.page
        if self.section is not None:
            out["section"] = self.section
        if self.raw is not None:
            out["raw"] = self.raw
        return out

    def evidence(self, field_name: str) -> dict[str, Any] | None:
        """Evidence location for this field, or None when not locatable."""
        if self.span is None:
            return None
        return {
            "field": field_name,
            "type": "TEXT_SPAN",
            "page": self.page,
            "start": self.span[0],
            "end": self.span[1],
            "excerpt": (self.raw or "")[:200],
        }


@dataclass
class ExtractionOutcome:
    """Result of extracting one document type."""

    fields: dict[str, Field] = dc_field(default_factory=dict)
    line_items: list[dict[str, Field]] = dc_field(default_factory=list)
    warnings: list[str] = dc_field(default_factory=list)
    missing: list[str] = dc_field(default_factory=list)

    def add(self, name: str, value: Field | None) -> None:
        if value is None:
            self.missing.append(name)
        else:
            self.fields[name] = value

    def evidence_locations(self) -> list[dict[str, Any]]:
        found = []
        for name, f in self.fields.items():
            ev = f.evidence(name)
            if ev is not None:
                found.append(ev)
        return found

    def mean_confidence(self) -> float:
        if not self.fields:
            return 0.0
        return sum(f.confidence for f in self.fields.values()) / len(self.fields)


# ── Locating helpers ──────────────────────────────────────────────────────────

def page_for_offset(pages: list[dict], offset: int) -> int | None:
    """Map a character offset in the joined text back to its source page."""
    cursor = 0
    for p in pages:
        text = p.get("text") or ""
        end = cursor + len(text)
        if offset < end:
            return p.get("page")
        # +1 accounts for the newline joining pages.
        cursor = end + 1
    return pages[-1].get("page") if pages else None


def find(
    text: str,
    patterns: Iterable[str],
    pages: list[dict],
    *,
    confidence: float,
    section: str | None = None,
    group: int = 1,
    transform=None,
) -> Field | None:
    """
    Return the first pattern match as a Field, or None when nothing matches.

    `transform` normalizes the captured string (e.g. to a date or float); if it
    returns None the match is rejected, because a value we cannot parse is not
    a value we are willing to assert.
    """
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if not match:
            continue
        try:
            raw = match.group(group)
        except IndexError:  # pattern has no such capture group
            continue
        if raw is None:
            continue
        raw = raw.strip()
        if not raw:
            continue

        value: Any = raw
        conf = confidence
        if transform is not None:
            value = transform(raw)
            if value is None:
                # Matched the label but could not parse the value — record
                # nothing rather than a wrong value.
                continue

        start, end = match.span(group)
        return Field(
            value=value,
            confidence=conf,
            method=RULE_MATCH,
            page=page_for_offset(pages, start),
            section=section,
            raw=raw,
            span=(start, end),
        )
    return None


# ── Normalizers ───────────────────────────────────────────────────────────────

_DATE_FORMATS = [
    "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%d %B %Y",
    "%d %b %Y", "%B %d, %Y", "%b %d, %Y", "%Y/%m/%d", "%d.%m.%Y",
]


def normalise_date(raw: str) -> str | None:
    """Normalize a date to ISO-8601 (date only), or None if unparseable."""
    cleaned = raw.strip().replace(",", ", ").replace("  ", " ")
    cleaned = re.sub(r"(\d)(st|nd|rd|th)\b", r"\1", cleaned, flags=re.IGNORECASE)
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(cleaned.strip(), fmt).date().isoformat()
        except ValueError:
            continue
    return None


def parse_amount(raw: str) -> float | None:
    """Parse a monetary amount, tolerating thousands separators; None if invalid."""
    cleaned = re.sub(r"[^\d,.\-]", "", raw)
    if not cleaned:
        return None
    # Treat the last separator as the decimal point when both appear.
    if "," in cleaned and "." in cleaned:
        if cleaned.rfind(",") > cleaned.rfind("."):
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif "," in cleaned:
        # A single comma with exactly two trailing digits is a decimal comma.
        if re.search(r",\d{2}$", cleaned):
            cleaned = cleaned.replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    try:
        return round(float(cleaned), 2)
    except ValueError:
        return None


_CURRENCY_SYMBOLS = {
    "R": "ZAR", "$": "USD", "€": "EUR", "£": "GBP", "¥": "JPY",
}


def normalise_currency(raw: str) -> str | None:
    """Normalize a currency symbol or code to an ISO-4217 code."""
    token = raw.strip().upper()
    if token in _CURRENCY_SYMBOLS:
        return _CURRENCY_SYMBOLS[token]
    if re.fullmatch(r"[A-Z]{3}", token):
        return token
    symbol = raw.strip()
    return _CURRENCY_SYMBOLS.get(symbol)
