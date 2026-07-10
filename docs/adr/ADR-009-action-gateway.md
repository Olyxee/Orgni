# ADR-009: Action Gateway

Status: Proposed

## Context

Current actions are deterministic text outputs from `analysis.service.js`. Future models must not execute business actions directly.

## Decision

Introduce an action gateway that enforces authentication, authorization, current state validation, policy validation, approval requirements, idempotency, audit logging, and result event creation.

## Consequences

- Current action endpoint remains compatibility-only.
- Executable actions require policy and event infrastructure.
- Action results become canonical events.

