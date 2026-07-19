# Orgni — Pre-Migration Snapshot (archived)

> **⚠️ This directory is a frozen backup.** The live codebase now lives at the repository root (see the [root README](../README.md) and [DEPLOYMENT.md](../DEPLOYMENT.md)). After the July 2026 migration and restructure into the production monorepo layout:
>
> - `apps/frontend` → now `apps/web` (`@workspace/web`, deployed on Vercel)
> - `services/api` → now `apps/api` (`@workspace/api`, waitlist removed; health/version endpoints added)
> - `services/ingestion-service` → ported into `apps/worker/src/ingestion`
> - `packages/schemas` + `packages/events` → merged into `packages/contracts`
> - shadcn UI components → extracted to `packages/ui`
> - `lib/*` → root `lib/`; `attached_assets/` → root `attached_assets/`
> - `apps/product` (product dashboard), `services/document-service` (Python pipeline), `services/api` engine, `intelligence/` → **not yet ported**; this backup is their only copy
>
> `DEPLOYMENT.md` in this directory is outdated — use the root [DEPLOYMENT.md](../DEPLOYMENT.md).
> Do not edit files here expecting them to affect the running app.

Orgni is Olyxee's operating-context platform. The repository is organized by product apps, backend services, shared contracts, and intelligence modules.

## Repository Map

```text
apps/
  frontend/              Public website and documentation
  product/               Product app: Lucy, Sources, Operating Model

services/
  api/                   Node/Express API and current Orgni engine
  document-service/      Python/FastAPI Orgni Docs integrity pipeline
  ingestion-service/     Signal envelope and raw-evidence ingestion boundary

intelligence/
  organizational-tokenizer/
                          Converts canonical events into organizational tokens

packages/
  schemas/               Shared canonical TypeScript contracts
  events/                Canonical event names and builders

tools/
  mockup-sandbox/        Isolated UI/mockup preview workspace

lib/
  api-client-react/      Generated React API client
  api-spec/              OpenAPI source
  api-zod/               Generated Zod API helpers
  db/                    Shared DB library

docs/
  architecture/          Audit, gap analysis, migration plan
  adr/                   Architecture decision records
  planning/              Assignable migration tasks
```

## Common Commands

```bash
pnpm --filter @workspace/frontend run dev
pnpm --filter @workspace/product run dev
pnpm --filter @workspace/api run dev
pnpm run typecheck
pnpm run build
```

## Current Runtime Flow

The product app still uploads through `services/api`:

```http
POST /api/orgs/:orgId/documents
```

Multipart field:

```text
files
```

`services/document-service` is the promoted Orgni Docs pipeline. It is ready to be wired behind the document-processing adapter in `services/api/engine/document-processing`.
