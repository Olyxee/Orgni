# ADR-006: State Engine

Status: Proposed

## Context

The active knowledge map acts as the current operating model but is not rebuilt from immutable events.

## Decision

Build a state engine with reducers, transitions, snapshots, conflicts, and replay. The operating model becomes a projection of organizational state.

## Consequences

- Knowledge maps become compatibility projections.
- Direct active-map mutation must be deprecated.
- Replay tests are mandatory before migration.

