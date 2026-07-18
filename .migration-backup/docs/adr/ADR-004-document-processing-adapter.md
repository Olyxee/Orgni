# ADR-004: Document Processing Adapter

Status: Proposed

## Context

The Node upload controller currently calls the Node parser directly. Orgni Docs exists as a separate FastAPI integrity pipeline.

## Decision

Introduce a `DocumentProcessor` interface with `LegacyNodeParserProcessor` and `OrgniDocsProcessor` implementations. Normalize processor outputs into internal events instead of exposing raw processor responses as platform contracts.

## Consequences

- Upload behavior can migrate behind a feature flag.
- Orgni Docs can stand as a separate service boundary.
- Raw document processor output remains diagnostic, not authoritative.

