# Orgni

Orgni is Olyxee's AI business-intelligence platform — it turns an
organization's documents into structured, queryable business context.

This repository is a production-oriented modular monorepo (pnpm + Turborepo).

## Structure

```text
apps/
  web/       Marketing site (React + Vite)         → Vercel
  api/       Main backend API (Express)            → Azure Container Apps
  worker/    Background & async processing         → Azure Container Apps
             (ingestion pipeline + Phase 1 orchestration)
intelligence/
  document-intelligence/     OCR, classification, field extraction (Python/FastAPI)
  organizational-tokenizer/  Extractions → OrganizationalToken[] (TypeScript)
packages/
  contracts/                 Canonical contracts — the only OrganizationalToken
  ui/                        Shared frontend components (shadcn-based)
  auth/                      Shared auth types & permission logic
  config/                    Validated environment configuration (zod)
  observability/             Structured logging (pino)
  testing/                   Shared test utilities
lib/
  api-spec/            OpenAPI contract (source of truth)
  api-client-react/    Generated React Query client
  api-zod/             Generated zod validators
  db/                  Drizzle ORM + PostgreSQL
infrastructure/
  docker/    Dockerfiles + docker-compose (API, worker, Postgres, Redis)
  azure/     Azure Container Apps deployment guide
  scripts/   Build & deploy scripts
docs/        Architecture, API, deployment and Phase 1 documentation
.migration-backup/   Archived original repo (unported product app & services)
```

The authoritative baseline is [`ORGNI_TECHNOLOGY_STACK.md`](ORGNI_TECHNOLOGY_STACK.md)
(TypeScript control plane, Python intelligence plane, one canonical contract).
Current conformance and gaps are tracked in
[`docs/architecture/stack-compliance.md`](docs/architecture/stack-compliance.md).

> Replit note: `artifacts/web` and `artifacts/api` contain only Replit
> platform config (`.replit-artifact/`) so the dev preview keeps working;
> all application code lives in `apps/`.

## Document pipeline (Phase 1)

An uploaded Invoice, Proof of Payment or Contract becomes evidence-backed
organizational tokens:

```
upload → ingestion → Document Intelligence → normalized envelope v0.1.0
       → validation → tokenizer → OrganizationalToken[]
```

Full documentation, the ontology handoff interface and sample output per
document type: [`docs/phase1/README.md`](docs/phase1/README.md).

## Getting started

```bash
corepack enable          # pnpm 10
pnpm install

pnpm --filter @workspace/web run dev      # marketing site
pnpm --filter @workspace/api run dev      # API on :8080
pnpm --filter @workspace/worker run dev   # background worker
```

## Root scripts

| Command                 | Purpose                                    |
| ----------------------- | ------------------------------------------ |
| `pnpm run dev`          | Run dev tasks via Turborepo                |
| `pnpm run build`        | Typecheck + build all packages             |
| `pnpm run typecheck`    | TypeScript across the workspace            |
| `pnpm run lint`         | Prettier check                             |
| `pnpm run test`         | All package tests                          |
| `pnpm run docker:build` | Build API + worker production images       |

## Full local platform (Docker)

```bash
docker compose -f infrastructure/docker/docker-compose.yml up --build
```

Runs API (:8080), worker, PostgreSQL (:5432) and Redis (:6379).

## Deployment

| App         | Target                | How                                             |
| ----------- | --------------------- | ----------------------------------------------- |
| `apps/web`  | Vercel                | `vercel.json` at repo root (static build)       |
| `apps/api`  | Azure Container Apps  | `infrastructure/docker/api.Dockerfile` — see `infrastructure/azure/README.md` |
| `apps/worker` | Azure Container Apps | `infrastructure/docker/worker.Dockerfile`      |

Health endpoints: `GET /api/health`, `GET /api/health/ready`, `GET /api/version`.

## Docs

- [Deployment guide](DEPLOYMENT.md)
- [Architecture overview](docs/architecture/overview.md)
- [Local development](docs/development/local-setup.md)
- [API & codegen](docs/api/README.md)
