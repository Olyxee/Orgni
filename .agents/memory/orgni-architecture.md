---
name: Orgni architecture notes
description: Non-obvious decisions about Orgni's auth, theming, and intelligence services
---

# Orgni architecture notes

- **Intelligence services are external and NOT yet available.** Document Intelligence and Ontology are the user's own Python services; the user does not have URLs yet ("we don't have it yet"). Uploads intentionally return 503 `document_intelligence_unavailable` until `DOCUMENT_INTELLIGENCE_URL` / `ONTOLOGY_URL` are set. Do not replace them with built-in AI without asking — the user explicitly chose to connect their own services.
  **How to apply:** when the user provides real URLs, just set the two env vars and restart the API; the pipeline is already wired end-to-end.
- **Theme:** the root CSS theme is LIGHT; marketing pages opt into `.dark` locally. The console is intentionally light — don't "fix" it to dark navy.
- **Auth:** dev-mode HMAC login (no password) signed with SESSION_SECRET (mapped to AUTH_SECRET at boot). In production, dev login returns 403 unless `ALLOW_DEV_LOGIN=true`; boot fails on the default dev secret. Replaced later by OIDC (Entra External ID) at the `authenticate` seam.
  **Why:** code review flagged open token minting as tenant impersonation.
- **Ported libs** (contracts, config, observability, organizational-tokenizer, worker) are source-exporting pnpm packages under `lib/` (exports point at `src/*.ts`, no composite build) — consumers bundle them via esbuild; only `lib/db` is a composite referenced project (run `tsc -b lib/db` after changing it).
