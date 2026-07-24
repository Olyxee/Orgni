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

Run the whole pipeline locally with Docker:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up --build
```

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

Boots Postgres + Redis + a one-shot migration + Document Intelligence +
Ontology + API + worker + the web dev server — the full Phase 1 pipeline, with
the same env wiring as production. Then:

```bash
curl -X POST http://localhost:8080/api/documents \
  -H "X-Tenant-Id: tenant_demo" -F "file=@invoice.pdf"
curl http://localhost:8080/api/documents -H "X-Tenant-Id: tenant_demo"
```

## Deployment (Azure)

Everything except the web app runs on **Azure Container Apps**; the web app is
static (Vercel or Azure Static Web Apps).

| Component | Target | Ingress |
| --------- | ------ | ------- |
| `apps/api` | Azure Container Apps | external |
| `apps/worker` | Azure Container Apps | none |
| `intelligence/document-intelligence` | Azure Container Apps | internal |
| `intelligence/organizational-ontology` | Azure Container Apps | internal |
| PostgreSQL | Azure Database for PostgreSQL (Flexible Server) | — |
| Redis | Azure Cache for Redis | — |
| `apps/web` | Vercel / Azure Static Web Apps | — |

Full guide with `az` commands: **[DEPLOYMENT.md](DEPLOYMENT.md)** and
[`infrastructure/azure/README.md`](infrastructure/azure/README.md).
Health endpoints: `GET /api/health`, `/api/health/ready`, `/api/version`;
Python services expose `GET /health`.

## Docs

- [Deployment guide](DEPLOYMENT.md)
- [Architecture overview](docs/architecture/overview.md)
- [Local development](docs/development/local-setup.md)
- [API & codegen](docs/api/README.md)
