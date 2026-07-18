# ADR-005: Organizational Tokenizer

Status: Proposed

## Context

Current extraction writes workflows, rules, risks, validations, chunks, and knowledge maps directly. The target architecture requires organizational tokens as an intermediate representation.

## Decision

Create `intelligence/organizational-tokenizer` to convert signals, evidence, parsed content, and integrity results into `OrganizationalToken[]` and `CanonicalEvent[]`.

## Consequences

- Tokenization must preserve provenance, permissions, confidence, and epistemic status.
- Missing facts must produce validation errors, not fabricated tokens.
- The tokenizer becomes a required boundary before state mutation.

