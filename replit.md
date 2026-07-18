# Orgni — Business context for AI execution

## Project overview

Orgni is an AI-driven business intelligence platform that extracts structured "Business Maps" from documents — identifying roles, workflows, financial patterns, and rules. This is the marketing/landing site ported from Vercel to Replit as a pnpm monorepo.

## Architecture

- **`artifacts/frontend`** — Marketing site (React + Vite, Tailwind v4, wouter, shadcn/ui). Served at `/`.
- **`artifacts/api-server`** — Express API server. Served at `/api`. Handles waitlist signup.
- **`lib/api-spec`** — OpenAPI spec (source of truth for all API contracts).
- **`lib/api-client-react`** — Generated React Query hooks (from codegen).
- **`lib/api-zod`** — Generated Zod validation schemas (from codegen).
- **`lib/db`** — Drizzle ORM + PostgreSQL schema.

## Key commands

```bash
# Install dependencies
pnpm install

# Run codegen after any OpenAPI spec change
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes
pnpm --filter @workspace/db run push

# Typecheck frontend
pnpm --filter @workspace/frontend run typecheck
```

## Workflows

- `artifacts/frontend: web` — Vite dev server for the marketing site
- `artifacts/api-server: API Server` — Express API server

## Design

- Dark mode by default (`class="dark"` on `<html>`)
- Brand: black background, orange primary (`16 88% 54%`), Geist / Geist Mono fonts
- All shadcn/ui components in `artifacts/frontend/src/components/ui/`
- Tailwind v4 with CSS variable tokens in `artifacts/frontend/src/index.css`

## User preferences

- Use pnpm for all package management
- Follow OpenAPI-first pattern: edit spec → run codegen → use generated hooks
- Never hardcode ports; always read from `process.env.PORT`
