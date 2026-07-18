# ADR-008: Memory Boundaries

Status: Proposed

## Context

The current knowledge map is sometimes described as memory, but the target architecture separates working, episodic, semantic, and procedural memory.

## Decision

Do not implement advanced memory until canonical events and state services exist. Begin with inspectable memory records with tenant, evidence, confidence, authorization, retention, timestamps, and model/rule version.

## Consequences

- Memory work is deferred.
- Existing knowledge map remains a compatibility projection.
- Research memory modules do not enter production paths early.

