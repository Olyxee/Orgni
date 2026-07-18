# ADR-002: Canonical Schemas

Status: Proposed

## Context

Schemas are currently scattered across Joi validators, JavaScript model shapes, Python dataclasses/constants, and frontend assumptions.

## Decision

Create `packages/schemas` with JSON Schema as the language-neutral source of truth, TypeScript exports for Node, and Pydantic models for Python services.

## Consequences

- Node and Python validate the same contracts.
- Schema drift is reduced.
- Runtime modules must not invent local duplicates without generation or explicit mapping.

