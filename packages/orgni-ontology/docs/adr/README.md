# Architecture Decision Records

An ADR captures a decision, the alternatives considered, and the
consequences accepted — so a future engineer changing this system
understands *why* it looks the way it does, not just what it currently
does. This satisfies Deliverable #10 of the Engineering Design
Specification ("Architecture Decision Record").

| ADR | Decision |
|---|---|
| [0001](0001-identity-vs-asserted-attributes.md) | Identity attributes vs. asserted attributes |
| [0002](0002-in-memory-fact-store.md) | In-memory FactStore, not a graph database |
| [0003](0003-data-driven-relationship-constraints.md) | Relationship constraints as a data-driven registry |
| [0004](0004-provenance-v2-field-rename.md) | Provenance v2 — source_id/source_type/timestamp replacing source_document/source_record |
| [0005](0005-cardinality-model.md) | Cardinality enforced at the store, not the model |
| [0006](0006-requires-and-triggers-conflict.md) | Resolving the REQUIRES/TRIGGERS/SUPPORTED_BY conflict between the two source specifications |

Each ADR follows the same shape: **Status**, **Context**, **Decision**,
**Alternatives Considered**, **Consequences**.
