# ADR-003: Tenant Isolation

Status: Proposed

## Context

The current system uses `orgId` filtering but has no authenticated principal, membership, or source ACL propagation.

## Decision

Model tenant isolation explicitly through `tenantId`, `PrincipalRule`, source ACLs, and authorization checks before retrieval, context construction, and actions.

## Consequences

- Existing org routes remain temporarily for compatibility.
- New canonical objects must include tenant and visibility fields.
- Auth product decisions are required before enforcement can be complete.

