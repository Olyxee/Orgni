# ADR-010: Evaluation Strategy

Status: Proposed

## Context

Current automated tests mostly cover Orgni Docs. There is no broad evaluation harness for retrieval, tokenization, state replay, authorization leakage, or action safety.

## Decision

Create an evaluation service and research benchmark structure after schemas/adapters exist. Evaluate legacy chunk retrieval, vector RAG, graph retrieval, state-only retrieval, and hybrid Orgni context.

## Consequences

- Quality gates become measurable.
- Migration phases require fixtures and replay tests.
- Research modules must prove improvement before production use.

