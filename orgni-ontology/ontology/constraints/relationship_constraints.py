"""
Relationship constraint registry.

This is the single source of truth for "what does relationship X actually
mean": which entity types may sit at its source and target, in which
direction, and — as of v2 — how many of that relationship a given source
or target may participate in (cardinality). Rule 2 ("every relationship
must define source type, target type, direction") is enforced by
validating every Relationship instance against the type/direction part of
this registry (see ontology/models/relationship.py). Cardinality is
enforced separately, at the FactStore level (see
ontology/store/fact_store.py), because checking it requires seeing every
OTHER relationship already recorded for that source/target — something a
single Relationship instance can't know about itself in isolation.

Extending the ontology with a new relationship type means:
    1. Add the value to RelationshipType.
    2. Add one RelationshipConstraint entry here.
Nothing else in the validation layer needs to change.

=====================================================================
v2 CHANGE LOG — reconciling this registry against the Engineering
Design Specification (see docs/adr/ for the full reasoning on each):
=====================================================================

1. REQUIRES redefined (BREAKING). The Phase 1 Technical Design Document
   (v1) used REQUIRES for "Supplier ABC Ltd -- REQUIRES --> Contract
   CON-001". The Engineering Design Specification (v2) uses REQUIRES for
   an unrelated concept: "Workflow REQUIRES Approval". These are two
   different relationships that happen to share a name across the two
   source documents — they cannot both be honored under one registry
   entry, since a Supplier is not a Workflow and a Contract is not an
   Approval. Per docs/adr/0006-requires-and-triggers-conflict.md, v2 is
   treated as authoritative for what REQUIRES *means* going forward
   (it's the newer, more detailed spec), and the v1 concept is preserved
   under a new, more precise name: PARTY_TO (a supplier/customer/org IS A
   PARTY TO a contract). This is why RelationshipType gained a PARTY_TO
   member rather than the v1 meaning being silently dropped.

2. TRIGGERS widened (non-breaking). v1 didn't have Contract as a legal
   TRIGGERS source. v2's worked example, "Contract TRIGGERS Workflow",
   requires it. Added Contract to allowed_source_types — purely additive.

3. SUPPORTED_BY widened (non-breaking). v2's worked example, "Payment
   SUPPORTED_BY ProofOfPayment", requires ProofOfPayment as a legal
   target, which v1's registry didn't allow (only Document was). Added
   ProofOfPayment to allowed_target_types — purely additive; Document
   remains legal too, since "Invoice SUPPORTED_BY Document" (v1) is still
   a valid, distinct fact.

4. Two entity types used in v2's own worked examples — "Fact" (in "Fact
   DERIVED_FROM Document") and "Action" (in "Action VIOLATES Rule" and
   "Action CREATES_EXCEPTION Exception") — do not appear anywhere in v2's
   own Core Domain Model. Rather than inventing two new entity types the
   spec itself never defines, these are interpreted as referring to
   whichever already-defined entity types can plausibly BE a "fact" or
   an "action" in this ontology: Document/Contract/Invoice for
   DERIVED_FROM's source (things that assert facts), and
   Transaction/Invoice/Contract/Payment for VIOLATES/CREATES_EXCEPTION's
   source (things whose occurrence can be a violating action). This
   interpretation is unchanged from v1 and is flagged explicitly here
   rather than silently assumed — see
   docs/adr/0006-requires-and-triggers-conflict.md.

Everything not listed above is unchanged from v1; see the original
design-note comments preserved below for those.

Original (v1) design notes, still accurate for the entries they describe:
- BILLS is modeled as Invoice -> Customer (the invoice is the billing
  instrument).
- CREATED_BY is Document-family -> {Organization, Person, Supplier}, i.e.
  "this document was created by this party" (Invoice CREATED_BY Supplier;
  also matches v2's "Document CREATED_BY Person").
- GOVERNED_BY is Contract -> Rule.
"""

from __future__ import annotations

from dataclasses import dataclass

from ontology.types import EntityType as ET
from ontology.types import RelationshipType as RT


@dataclass(frozen=True)
class RelationshipConstraint:
    allowed_source_types: frozenset[ET]
    allowed_target_types: frozenset[ET]
    description: str
    # Cardinality: how many DISTINCT (relationship_type, other-side) facts
    # a single source/target entity may participate in. None = unlimited.
    # Enforced by FactStore.add_relationship, not by this dataclass itself —
    # see ontology/store/fact_store.py.
    max_per_source: int | None = None  # e.g. BILLS: an Invoice bills at most 1 Customer
    max_per_target: int | None = None  # e.g. BILLS: a Customer may be billed by many Invoices (unlimited)


def _c(
    sources: set,
    targets: set,
    description: str,
    *,
    max_per_source: int | None = None,
    max_per_target: int | None = None,
) -> RelationshipConstraint:
    return RelationshipConstraint(
        frozenset(sources), frozenset(targets), description, max_per_source=max_per_source, max_per_target=max_per_target
    )


RELATIONSHIP_CONSTRAINTS: dict[RT, RelationshipConstraint] = {
    # --- Structure ---
    RT.BELONGS_TO: _c(
        {ET.DEPARTMENT, ET.PERSON, ET.ACCOUNT, ET.ROLE},
        {ET.ORGANIZATION, ET.DEPARTMENT},
        "A department, person, account, or role belongs to an organization or department.",
        max_per_source=1,  # an entity belongs to exactly one org/department at a time
    ),
    RT.HAS_ROLE: _c(
        {ET.PERSON},
        {ET.ROLE},
        "A person holds a role.",
        # unlimited: a person may hold multiple roles concurrently
    ),
    RT.REPORTS_TO: _c(
        {ET.PERSON},
        {ET.PERSON},
        "A person reports to another person.",
        max_per_source=1,  # a person has exactly one direct manager at a time
    ),
    # --- Document evidence ---
    RT.CREATED_BY: _c(
        {ET.DOCUMENT, ET.INVOICE, ET.CONTRACT, ET.PROOF_OF_PAYMENT},
        {ET.ORGANIZATION, ET.PERSON, ET.SUPPLIER},
        "A document/invoice/contract/proof-of-payment was created by an org, person, or supplier.",
        max_per_source=1,  # a document has exactly one creator of record
    ),
    RT.ISSUED_TO: _c(
        {ET.DOCUMENT, ET.INVOICE, ET.CONTRACT},
        {ET.CUSTOMER, ET.ORGANIZATION, ET.PERSON, ET.COUNTERPARTY},
        "A document/invoice/contract is issued to a receiving party.",
        max_per_source=1,  # a document is issued to exactly one recipient
    ),
    RT.SUPPORTED_BY: _c(
        {ET.INVOICE, ET.CONTRACT, ET.PAYMENT, ET.TRANSACTION, ET.PROOF_OF_PAYMENT},
        {ET.DOCUMENT, ET.PROOF_OF_PAYMENT},  # widened in v2: "Payment SUPPORTED_BY ProofOfPayment"
        "A business fact is supported by an underlying evidentiary document.",
        # unlimited both ways: a fact can be corroborated by several documents
    ),
    RT.DERIVED_FROM: _c(
        {ET.DOCUMENT, ET.CONTRACT, ET.INVOICE},
        {ET.DOCUMENT, ET.CONTRACT},
        "A document/invoice is derived from an earlier document or governing contract.",
    ),
    # --- Finance ---
    RT.BILLS: _c(
        {ET.INVOICE},
        {ET.CUSTOMER},
        "An invoice bills a customer.",
        max_per_source=1,  # an invoice bills exactly one customer
    ),
    RT.PAYS: _c(
        {ET.CUSTOMER, ET.ORGANIZATION, ET.PERSON},
        {ET.SUPPLIER, ET.COUNTERPARTY},
        "A paying party pays a supplier or counterparty.",
    ),
    RT.SETTLES: _c(
        {ET.PAYMENT, ET.PROOF_OF_PAYMENT},
        {ET.INVOICE},
        "A payment / proof of payment settles an invoice.",
        max_per_source=1,  # a given payment settles exactly one invoice
        # max_per_target intentionally unlimited: an invoice may be settled
        # by several partial payments
    ),
    RT.GOVERNED_BY: _c(
        {ET.CONTRACT, ET.INVOICE, ET.TRANSACTION},
        {ET.RULE},
        "A contract, invoice, or transaction is governed by a rule.",
    ),
    RT.REQUIRES: _c(
        # v2 REDEFINITION — see change-log note 1 above. This is no longer
        # "Supplier REQUIRES Contract" (that concept now lives under
        # PARTY_TO, below); it is "Workflow REQUIRES Approval" per the
        # Engineering Design Specification's worked example.
        {ET.WORKFLOW},
        {ET.APPROVAL},
        "A workflow requires an approval before it can proceed.",
    ),
    RT.PARTY_TO: _c(
        # Houses the v1 REQUIRES concept under a clearer name: a supplier,
        # customer, or organization is a party to a contract.
        {ET.SUPPLIER, ET.CUSTOMER, ET.ORGANIZATION},
        {ET.CONTRACT, ET.OBLIGATION},
        "A supplier, customer, or organization is a party to a contract or obligation.",
    ),
    # --- Operations ---
    RT.APPROVES: _c(
        {ET.PERSON, ET.ROLE},
        {ET.DECISION, ET.TASK, ET.CONTRACT, ET.INVOICE},
        "A person/role approves a decision, task, contract, or invoice.",
    ),
    RT.ASSIGNED_TO: _c(
        {ET.TASK, ET.APPROVAL, ET.DECISION},
        {ET.PERSON, ET.ROLE, ET.DEPARTMENT},
        "A task/approval/decision is assigned to a person, role, or department.",
        max_per_source=1,  # a task is assigned to exactly one owner at a time
    ),
    RT.TRIGGERS: _c(
        {ET.RULE, ET.TASK, ET.DECISION, ET.TRANSACTION, ET.CONTRACT},  # +CONTRACT, widened for v2
        {ET.TASK, ET.WORKFLOW, ET.EXCEPTION},
        "A rule/task/decision/transaction/contract triggers a task, workflow, or exception.",
    ),
    RT.VIOLATES: _c(
        {ET.TRANSACTION, ET.INVOICE, ET.CONTRACT, ET.PAYMENT},
        {ET.RULE, ET.OBLIGATION},
        "A transaction/invoice/contract/payment violates a rule or obligation.",
    ),
    RT.CREATES_EXCEPTION: _c(
        {ET.TRANSACTION, ET.INVOICE, ET.CONTRACT, ET.PAYMENT},
        {ET.EXCEPTION},
        "A violating fact creates an exception record.",
    ),
}


def validate_relationship_types(rel_type: RT, source_type: ET, target_type: ET) -> None:
    """Raises ValueError with a precise, actionable message if the given
    source/target types are not legal for this relationship type."""
    constraint = RELATIONSHIP_CONSTRAINTS.get(rel_type)
    if constraint is None:
        raise ValueError(f"Unknown relationship type {rel_type!r}; no constraint registered.")
    if source_type not in constraint.allowed_source_types:
        raise ValueError(
            f"{rel_type.value} does not permit source type {source_type.value!r}. "
            f"Allowed source types: {sorted(t.value for t in constraint.allowed_source_types)}. "
            f"({constraint.description})"
        )
    if target_type not in constraint.allowed_target_types:
        raise ValueError(
            f"{rel_type.value} does not permit target type {target_type.value!r}. "
            f"Allowed target types: {sorted(t.value for t in constraint.allowed_target_types)}. "
            f"({constraint.description})"
        )
