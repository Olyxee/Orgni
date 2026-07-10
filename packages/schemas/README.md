# @workspace/schemas

Purpose: shared canonical contracts for Orgni signals, events, tokens, state, context, actions, evidence, and authorization.

Responsibilities:

- Define versioned TypeScript contracts used by Node services.
- Keep provenance, tenant isolation, confidence, epistemic status, and visibility fields explicit.
- Provide small runtime guards for the first migration phase.

Non-responsibilities:

- Persist data.
- Decide entity resolution.
- Execute actions.
- Replace service-specific validation where stricter input validation is required.

Known limitations:

- JSON Schema and Pydantic generation are still pending. The TypeScript contracts are the first clean source module.
