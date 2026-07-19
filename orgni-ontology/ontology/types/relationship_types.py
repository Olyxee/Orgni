"""
Relationship type vocabulary.

Every value corresponds 1:1 to a relationship listed in section 3
("In Scope / Relationship Categories"). The *meaning* and *legal
source/target types* of each relationship are NOT defined here — see
ontology/constraints/relationship_constraints.py. This file only defines
which relationship names exist.
"""

from enum import Enum


class RelationshipType(str, Enum):
    # --- Structure ---
    BELONGS_TO = "BELONGS_TO"
    HAS_ROLE = "HAS_ROLE"
    REPORTS_TO = "REPORTS_TO"

    # --- Document evidence ---
    CREATED_BY = "CREATED_BY"
    ISSUED_TO = "ISSUED_TO"
    SUPPORTED_BY = "SUPPORTED_BY"
    DERIVED_FROM = "DERIVED_FROM"

    # --- Finance ---
    BILLS = "BILLS"
    PAYS = "PAYS"
    SETTLES = "SETTLES"
    GOVERNED_BY = "GOVERNED_BY"
    REQUIRES = "REQUIRES"
    PARTY_TO = "PARTY_TO"

    # --- Operations ---
    APPROVES = "APPROVES"
    ASSIGNED_TO = "ASSIGNED_TO"
    TRIGGERS = "TRIGGERS"
    VIOLATES = "VIOLATES"
    CREATES_EXCEPTION = "CREATES_EXCEPTION"
