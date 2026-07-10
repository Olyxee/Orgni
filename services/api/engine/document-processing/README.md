# Document Processing

Purpose: isolate document processors behind one API-facing contract.

Responsibilities:

- Keep legacy Node parsing and Orgni Docs processing swappable.
- Normalize parser/integrity output before platform events are emitted.
- Prevent raw processor responses from becoming global platform contracts.

Non-responsibilities:

- HTTP upload validation.
- Entity resolution.
- State mutation.
- Lucy context assembly.
