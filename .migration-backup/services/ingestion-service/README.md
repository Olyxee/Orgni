# Ingestion Service

Purpose: convert incoming source material into immutable signal envelopes.

Responsibilities:

- Calculate checksums.
- Create `SignalEnvelope` objects.
- Preserve content references and source ACLs.
- Provide the boundary that HTTP controllers should call instead of owning processing.

Non-responsibilities:

- Parse documents.
- Score integrity.
- Resolve entities.
- Mutate organizational state.

Inputs: uploaded buffers or connector payload metadata.

Outputs: `SignalEnvelope` records ready for evidence storage and processing.

Known limitations: persistence and job retries are not wired yet.
