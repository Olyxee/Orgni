# ADR-001: Event Sourcing Foundation

Status: Proposed

## Context

The current knowledge map is directly created and mutated by `orgni.engine.js` and `knowledgeMap.model.js`. The target architecture requires organizational state to be rebuilt from canonical events.

## Decision

Introduce an append-only canonical event store before replacing current projections. Existing document upload and Lucy flows stay operational behind feature flags.

## Consequences

- Derived state becomes replayable.
- Direct mutation paths must be deprecated gradually.
- Event schema versioning is mandatory.

