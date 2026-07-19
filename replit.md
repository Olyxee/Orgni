# Orgni — Business context for AI execution

## Project overview

Orgni is an AI-driven business intelligence platform that extracts structured "Business Maps" from documents. This repo is a production-oriented modular monorepo (pnpm + Turborepo): marketing site, backend API, and background worker.

## Architecture

- **`apps/web`** (`@workspace/web`) — Marketing site (React + Vite, Tailwind v4, wouter, shadcn/ui). Served at `/`. Deploys to Vercel.
- **`apps/api`** (`@workspace/api`) — Express API. Served at `/api`. Targets Azure Container Apps.
- **`apps/worker`** (`@workspace/worker`) — Background/async job runner (ingestion, future document processing).
- **`packages/`** — Shared code: `contracts` (domain types/events), `ui` (shadcn components), `auth`, `config` (zod env validation), `observability` (pino), `testing`.
- **`lib/`** — Contract-first API tooling: `api-spec` (OpenAPI source of truth), `api-client-react`, `api-zod` (generated), `db` (Drizzle + Postgres).
- **`infrastructure/`** — Dockerfiles, docker-compose (API+worker+Postgres+Redis), Azure deploy guide, scripts.
- **`artifacts/web` & `artifacts/api`** — Replit platform config ONLY (`.replit-artifact/artifact.toml`). The preview router requires artifact config under `artifacts/`; app code stays in `apps/`. Do not put code here.
- **`.migration-backup/`** — Archived original repo (product dashboard, Python document-service) — not built.

## Key commands

```bash
pnpm install
pnpm --filter @workspace/api-spec run codegen   # after OpenAPI changes
pnpm --filter @workspace/db run push            # DB schema changes
pnpm run typecheck                              # whole workspace
pnpm run lint                                   # prettier check
```

## Workflows

- `artifacts/web: web` — Vite dev server (runs code from apps/web)
- `artifacts/api: API Server` — Express API (runs code from apps/api)

## Health endpoints

`GET /api/health` (live), `GET /api/health/ready` (ready), `GET /api/version`, `GET /api/healthz` (legacy Replit probe).

## Design

- Dark mode by default (`class="dark"` on `<html>`)
- Brand: black background, orange primary (`16 88% 54%`), Geist / Geist Mono fonts
- Shared shadcn/ui components in `packages/ui/src/components/` (aliased as `@/components/ui/*` in apps/web)
- Tailwind v4 tokens in `apps/web/src/index.css` (includes `@source` for packages/ui)

## User preferences

- Use pnpm for all package management
- Follow OpenAPI-first pattern: edit spec → run codegen → use generated hooks
- Never hardcode ports; always read from `process.env.PORT`
