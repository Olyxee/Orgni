class OntologyValidationError(Exception):
    """Raised when a fact fails structural or semantic validation
    (Rules 1, 2, 3, 4). This is a hard rejection — the fact never enters
    the store."""


class DuplicateFactError(Exception):
    """Raised when a fact is an exact re-assertion of an already-stored fact
    (same claim, same evidence fingerprint). Distinct from a *conflicting*
    fact (Rule 5), which is always accepted."""


class CardinalityViolationError(Exception):
    """Raised when adding a relationship would exceed the
    max_per_source / max_per_target limit registered for its
    relationship_type in RELATIONSHIP_CONSTRAINTS — e.g. attempting to
    give one Invoice a second BILLS relationship to a different Customer,
    when BILLS is capped at max_per_source=1."""
