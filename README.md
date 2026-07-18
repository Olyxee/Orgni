# Orgni

Orgni is Olyxee's operating-context platform — an AI-driven business intelligence layer that extracts structured "Business Maps" (roles, workflows, financial patterns, rules) from company documents.

This repository is a pnpm monorepo hosted on Replit. It was migrated from the original Vercel repo; the pre-migration snapshot is preserved in [`.migration-backup/`](.migration-backup/README.md).

## Repository Map

```text
artifacts/
  frontend/              Public marketing site + docs (React, Vite, Tailwind v4)
  api-server/            Node/Express API (waitlist endpoints, health)
  mockup-sandbox/        Isolated UI/mockup preview workspace

lib/
  api-spec/              OpenAPI source of truth for all API contracts
  api-client-react/      Generated React Query API client
  api-zod/               Generated Zod validation schemas
  db/                    Drizzle ORM + PostgreSQL schema

attached_assets/         Images and video used by the frontend (@assets alias)

.migration-backup/       Frozen pre-migration snapshot (original apps/, services/,
                         intelligence/, packages/ — see its README for details)
```

## Development

```bash
pnpm install

# Frontend dev server
pnpm --filter @workspace/frontend run dev

# API server
pnpm --filter @workspace/api-server run dev

# After editing lib/api-spec/openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# After editing lib/db schema
pnpm --filter @workspace/db run push
```

On Replit, the frontend and API server run as managed workflows and are wired together automatically.

## Deployment

| Piece | Where | Notes |
|---|---|---|
| Marketing site (`artifacts/frontend`) | Vercel | Static build via root `vercel.json`; SPA rewrites included |
| API server + PostgreSQL | Replit (dev) | Not included in the Vercel static deploy — host separately (Replit publishing, Azure App Service, etc.) and point the frontend at it |
| Document / ingestion services | Not yet ported | Live only in `.migration-backup/services/` — see below |

The Vercel build is configured by [`vercel.json`](vercel.json): it builds `@workspace/frontend` and serves `artifacts/frontend/dist/public`. No Root Directory or build-command overrides are needed in Vercel project settings.

> **Note on AI infrastructure:** Orgni does not self-host ML models. Document understanding calls Anthropic's hosted API; the only local processing is Tesseract OCR. The backend services are ordinary Node/Python web services — any host with Node, Python, and Postgres works.

## Backend services not yet ported

These remain in `.migration-backup/services/` and are not running in this workspace:

- **document-service** — Python/FastAPI document integrity pipeline (OCR → extraction → validation → trust scoring)
- **ingestion-service** — TypeScript signal-envelope ingestion boundary
- **intelligence/organizational-tokenizer** — converts canonical events into organizational tokens

To deploy them, host each as its own service (e.g. Azure App Service, or port them into this workspace) alongside a PostgreSQL database.
