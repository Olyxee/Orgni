# Organizational Tokenizer

> **Status:** Not yet ported to the live Replit workspace — this backup copy is the current source. Despite the name, this is a TypeScript module that structures business events into "organizational tokens" — it is not an ML/NLP tokenizer and hosts no models.

Purpose: convert canonical events and extracted evidence into organizational tokens.

Responsibilities:

- Preserve tenant, evidence, confidence, epistemic status, visibility, and retention.
- Create deterministic event tokens from canonical events.
- Provide a clear home for future entity, relation, policy, and state tokenizers.

Non-responsibilities:

- Parse source files.
- Resolve entity identity.
- Mutate state.
- Invent missing facts.

Inputs: `CanonicalEvent` objects and later document processing outputs.

Outputs: `OrganizationalToken[]`.

Known limitations: this first implementation tokenizes canonical events only.
