# ADR 0002: In-Memory FactStore, Not a Graph Database

**Status:** Accepted

## Context

The architecture diagram in both source specifications ends with "Future
Knowledge Graph" as a distinct, later stage. Both documents' scope
sections explicitly exclude "graph database implementation" from Phase 1.
Yet the ontology still needs *something* that holds facts, resolves
entities across documents, and enforces validation rules that require
seeing more than one fact at a time (duplicate detection, cardinality).

## Decision

Build `FactStore` as a plain, in-memory Python object (dicts and sets),
not backed by any persistent or graph-native storage. It exposes the
operations a graph backend would eventually need
(`resolve_or_create_entity`, `add_relationship`, `add_attribute_assertion`)
without assuming any particular storage technology underneath.

## Alternatives Considered

1. **Embed a lightweight graph library (e.g. NetworkX) now**, to make the
   "future knowledge graph" transition easier later. Rejected — this pulls
   in a real dependency and a real data model commitment (how NetworkX
   represents node/edge attributes) for a Phase whose own scope says not
   to do this yet. It would also make it harder to see, in code review,
   which validation is "the ontology's rules" versus "NetworkX's API
   surface."
2. **A relational (SQL) store**, for persistence across runs. Rejected for
   Phase 1 — nothing in either spec's Definition of Done requires facts to
   survive a process restart, and adding persistence now means solving
   migrations/schema evolution for a data model that itself might still
   change during Phase 1 development.
3. **No store at all — mapping functions just return data, caller decides
   what to do with it.** Rejected — this pushes duplicate detection and
   cardinality enforcement (which require store-wide state) onto every
   caller individually, defeating the purpose of having a single
   validation layer downstream components can rely on.

## Consequences

- `FactStore` does not survive process restarts. A Phase 2 component
  needing persistence must build a new store implementation.
- Because `FactStore`'s public methods (`resolve_or_create_entity`,
  `add_relationship`, `add_attribute_assertion`, `stats`) don't leak any
  in-memory-specific detail, a future graph-backed implementation can
  present the same interface — callers (the mapping layer, `run_demo.py`)
  would not need to change.
- Cardinality and duplicate-detection logic lives in `FactStore`, not in
  the `Entity`/`Relationship` models — see ADR 0005 for why this
  particular split was necessary, not just convenient.
