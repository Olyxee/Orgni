"""
FactStore.

This is Phase 1's stand-in for "future graph construction" — an in-memory,
validating store of Entities, Relationships, and AttributeAssertions. It is
deliberately NOT a graph database; graph persistence is explicitly out of
scope for Phase 1. What it provides, faithfully implementing the spec's
five architectural principles and its Relationship Validation requirements:

  Principle 2 (strong typing)         -> Entity/Relationship reject
                                          untyped construction
  Principle 3 (evidence first)        -> Provenance is a required field on
                                          every model; the store cannot
                                          construct a fact-bearing object
                                          without one
  Principle 4 (unknown remains unknown) -> enforced procedurally: the store
                                          never fabricates a value for an
                                          absent field; see mappings/*.py
  Principle 5 (conflicting claims preserved) -> add_attribute_assertion()
                                          always appends; it only ever
                                          rejects an EXACT duplicate (same
                                          claim, same evidence), never a
                                          differing value
  Relationship Validation: valid source/target types, direction ->
                                          enforced in the Relationship
                                          model itself against
                                          RELATIONSHIP_CONSTRAINTS
  Relationship Validation: cardinality enforcement -> enforced HERE, in
                                          add_relationship(), because
                                          checking a cardinality limit
                                          requires seeing every OTHER
                                          relationship already recorded for
                                          that source/target — something a
                                          single Relationship instance
                                          cannot know about itself

It also implements identity resolution: `resolve_or_create_entity` looks an
entity up by its natural key (see Entity.identity_key) so that, e.g., an
Invoice created while mapping an invoice document can be found again and
linked to, rather than duplicated, when a later Proof-of-Payment document
references the same invoice_number.
"""

from __future__ import annotations

from uuid import UUID

from ontology.models.entity import Entity
from ontology.models.relationship import Relationship
from ontology.models.assertion import AttributeAssertion
from ontology.constraints.relationship_constraints import RELATIONSHIP_CONSTRAINTS
from ontology.store.exceptions import DuplicateFactError, CardinalityViolationError


class FactStore:
    def __init__(self) -> None:
        self._entities: dict[UUID, Entity] = {}
        self._relationships: dict[UUID, Relationship] = {}
        self._assertions: dict[UUID, AttributeAssertion] = {}

        # Identity index for cross-document entity resolution.
        self._identity_index: dict[tuple, UUID] = {}

        # Fingerprints already seen, for duplicate rejection.
        self._relationship_fingerprints: set[tuple] = set()
        self._assertion_fingerprints: set[tuple] = set()

        # Cardinality bookkeeping: for a given (relationship_type, source_id),
        # the set of DISTINCT target_ids already linked — and the mirror for
        # targets. Re-asserting the SAME edge from new evidence doesn't grow
        # these sets (it's corroboration, not a new participant), so it never
        # trips a cardinality limit; only a genuinely new distinct
        # source/target pairing counts.
        self._targets_by_source: dict[tuple, set[UUID]] = {}
        self._sources_by_target: dict[tuple, set[UUID]] = {}

    # ------------------------------------------------------------------
    # Entities
    # ------------------------------------------------------------------
    def resolve_or_create_entity(self, entity: Entity) -> Entity:
        """Return the existing entity with the same identity key if one
        exists; otherwise register and return the given entity. This is how
        the ontology avoids creating a second 'Invoice INV-001' node every
        time a new document mentions it."""
        key = entity.identity_key()
        existing_id = self._identity_index.get(key)
        if existing_id is not None:
            return self._entities[existing_id]

        self._entities[entity.id] = entity
        self._identity_index[key] = entity.id
        return entity

    def get_entity(self, entity_id: UUID) -> Entity | None:
        return self._entities.get(entity_id)

    def all_entities(self) -> list[Entity]:
        return list(self._entities.values())

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    def add_relationship(self, relationship: Relationship) -> Relationship:
        """Relationship() construction already enforces type/direction and
        provenance requirements. Here the store adds two further checks
        that require store-wide context a single Relationship can't have:

        1. Duplicate detection — the same relationship_type between the
           same source/target, asserted from the same evidence, adds no
           new information and is rejected.
        2. Cardinality — if this relationship_type caps how many distinct
           targets a source may have (or vice versa), adding a genuinely
           new distinct pairing that would exceed the cap is rejected.
        """
        fingerprint = (
            relationship.relationship_type,
            relationship.source_id,
            relationship.target_id,
            relationship.provenance.fingerprint(),
        )
        if fingerprint in self._relationship_fingerprints:
            raise DuplicateFactError(
                f"Duplicate relationship: {relationship.relationship_type.value} "
                f"{relationship.source_id} -> {relationship.target_id} already "
                f"asserted from {relationship.provenance.source_id!r}."
            )

        constraint = RELATIONSHIP_CONSTRAINTS[relationship.relationship_type]
        source_key = (relationship.relationship_type, relationship.source_id)
        target_key = (relationship.relationship_type, relationship.target_id)
        existing_targets = self._targets_by_source.get(source_key, set())
        existing_sources = self._sources_by_target.get(target_key, set())

        is_new_target_for_source = relationship.target_id not in existing_targets
        is_new_source_for_target = relationship.source_id not in existing_sources

        if is_new_target_for_source and constraint.max_per_source is not None:
            if len(existing_targets) + 1 > constraint.max_per_source:
                raise CardinalityViolationError(
                    f"{relationship.relationship_type.value} allows at most "
                    f"{constraint.max_per_source} distinct target(s) per source, but "
                    f"source {relationship.source_id} already has {len(existing_targets)} "
                    f"and this would add a new one. ({constraint.description})"
                )
        if is_new_source_for_target and constraint.max_per_target is not None:
            if len(existing_sources) + 1 > constraint.max_per_target:
                raise CardinalityViolationError(
                    f"{relationship.relationship_type.value} allows at most "
                    f"{constraint.max_per_target} distinct source(s) per target, but "
                    f"target {relationship.target_id} already has {len(existing_sources)} "
                    f"and this would add a new one. ({constraint.description})"
                )

        self._relationship_fingerprints.add(fingerprint)
        self._relationships[relationship.id] = relationship
        self._targets_by_source.setdefault(source_key, set()).add(relationship.target_id)
        self._sources_by_target.setdefault(target_key, set()).add(relationship.source_id)
        return relationship

    def all_relationships(self) -> list[Relationship]:
        return list(self._relationships.values())

    # ------------------------------------------------------------------
    # Attribute assertions (Rule 5 / Principle 5)
    # ------------------------------------------------------------------
    def add_attribute_assertion(self, assertion: AttributeAssertion) -> AttributeAssertion:
        fingerprint = assertion.duplicate_fingerprint()
        if fingerprint in self._assertion_fingerprints:
            raise DuplicateFactError(
                f"Duplicate assertion: {assertion.attribute_name}={assertion.value!r} on "
                f"entity {assertion.entity_id} already asserted from "
                f"{assertion.provenance.source_id!r}."
            )
        self._assertion_fingerprints.add(fingerprint)
        self._assertions[assertion.id] = assertion
        return assertion

    def assertions_for(self, entity_id: UUID, attribute_name: str | None = None) -> list[AttributeAssertion]:
        results = [a for a in self._assertions.values() if a.entity_id == entity_id]
        if attribute_name is not None:
            results = [a for a in results if a.attribute_name == attribute_name]
        return results

    def conflicting_assertions(self, entity_id: UUID, attribute_name: str) -> list[AttributeAssertion]:
        """Returns every distinct value asserted for this entity+attribute.
        More than one entry means Rule 5's 'conflicting facts' case is live
        for this field — callers (e.g. a future reasoning layer) decide what
        to do with that; this layer just reports it."""
        return self.assertions_for(entity_id, attribute_name)

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------
    def stats(self) -> dict[str, int]:
        return {
            "entities": len(self._entities),
            "relationships": len(self._relationships),
            "attribute_assertions": len(self._assertions),
        }
