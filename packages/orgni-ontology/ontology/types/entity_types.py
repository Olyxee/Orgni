"""
Entity type vocabulary.

Every value here corresponds 1:1 to an entity category listed in section 3
("In Scope / Entity Categories") of the Phase 1 Technical Design Document.
Adding a new entity type is a two-step process:

    1. Add the value here.
    2. Add its identity field to IDENTITY_FIELDS in ontology/models/entity.py.

Nothing else needs to change for the type to be storable — relationship
eligibility is configured separately in ontology/constraints/relationship_constraints.py
so that "what an entity IS" stays decoupled from "what an entity can PARTICIPATE IN".
"""

from enum import Enum


class EntityType(str, Enum):
    # --- Structure ---
    ORGANIZATION = "Organization"
    DEPARTMENT = "Department"
    PERSON = "Person"
    ROLE = "Role"

    # --- Business parties ---
    SUPPLIER = "Supplier"
    CUSTOMER = "Customer"
    COUNTERPARTY = "Counterparty"

    # --- Documents ---
    DOCUMENT = "Document"
    INVOICE = "Invoice"
    PROOF_OF_PAYMENT = "ProofOfPayment"
    CONTRACT = "Contract"

    # --- Financial ---
    TRANSACTION = "Transaction"
    PAYMENT = "Payment"
    AMOUNT = "Amount"
    ACCOUNT = "Account"

    # --- Operations ---
    WORKFLOW = "Workflow"
    TASK = "Task"
    APPROVAL = "Approval"
    DECISION = "Decision"

    # --- Governance ---
    RULE = "Rule"
    OBLIGATION = "Obligation"
    EXCEPTION = "Exception"
    RISK = "Risk"
