# ADR-007: Context Service

Status: Proposed

## Context

Lucy currently uses active knowledge map plus chunk retrieval. This makes chunks too central and does not enforce authorization before retrieval.

## Decision

Create a context service returning `ContextResponse`: state version, state slice, evidence, inferences, conflicts, confidence, limitations, and authorized actions.

## Consequences

- Vector/chunk retrieval becomes subordinate to state and policy.
- Lucy can migrate incrementally behind a feature flag.
- Context quality can be evaluated independently.

