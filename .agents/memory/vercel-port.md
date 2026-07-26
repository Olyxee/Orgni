---
name: Vercel-to-Replit port notes
description: Key decisions made when porting the Orgni Vercel project into the Replit pnpm workspace.
---

This project was NOT a typical Next.js app. It was already a Vite + React + Express monorepo structured almost identically to the Replit pnpm_workspace template.

**Structure after port:**
- `artifacts/web/` — Vite + React frontend (from apps/web)
- `artifacts/api-server/` — Express API (from apps/api)
- `packages/config/`, `packages/contracts/`, `packages/observability/`, `packages/ui/`, `packages/worker/`, `packages/organizational-tokenizer/` — shared packages from .migration-backup/packages/ and intelligence/
- `lib/db/`, `lib/api-zod/`, `lib/api-spec/`, `lib/api-client-react/` — updated with backup content

**Key decisions:**
- Added `packages/*` to pnpm-workspace.yaml packages list
- Removed `vitest` devDep from lib/db and packages/worker/organizational-tokenizer (403 from package firewall); tests not needed for port
- packages/config and packages/contracts have `composite: true` tsconfig — added to root tsconfig.json references
- lib/db/package.json needed extra exports: `./repository` and `./connect` (used by api-server routes)

**Why:** The app was previously built for Replit (vite.config.ts already had PORT/BASE_PATH handling, Replit plugins, etc.) so no Next.js conversion was needed.
