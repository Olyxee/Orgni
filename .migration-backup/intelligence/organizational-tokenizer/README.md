# Organizational Tokenizer

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
