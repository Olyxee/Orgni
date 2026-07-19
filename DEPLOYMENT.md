# Orgni — Deployment Guide

How to deploy each component of the monorepo. Summary:

| Component | Package | Type | Target |
|-----------|---------|------|--------|
| Marketing + docs site | `@workspace/web` (`apps/web`) | Static SPA (Vite) | **Vercel** |
| Backend API | `@workspace/api` (`apps/api`) | Node/Express (bundled) | **Azure Container Apps** |
| Background worker | `@workspace/worker` (`apps/worker`) | Node service (bundled) | **Azure Container Apps** |
| Component sandbox | `@workspace/mockup-sandbox` | Dev tool | Not deployed |

Legacy note: the archived pre-restructure repo (with the product app and Python
document-service) lives in `.migration-backup/` and is not deployed. Its old
guide (`.migration-backup/DEPLOYMENT.md`) is outdated — use this one.

---

## 1. Prerequisites

- **Node.js 24 LTS** (`engines.node >=24 <25` — deliberate LTS pin)
- **pnpm 10** (`corepack enable && corepack prepare pnpm@10 --activate`)
- Docker (for the API/worker images)
- Vercel account (frontend) and Azure subscription (backend)

> The repo enforces a 1-day npm `minimumReleaseAge` for supply-chain safety and
> a `preinstall` guard that blocks npm/yarn. Build agents must use pnpm.

---

## 2. Frontend → Vercel

Configured by `vercel.json` at the repo root:

- install: `pnpm install`
- build: `pnpm --filter @workspace/web run build`
- output: `apps/web/dist/public`
- SPA rewrites to `/index.html`

Deploy = push to the connected git branch. No environment variables or secrets
are required; the site is fully static and all CTAs link to
`https://www.olyxee.com/signup?tool=api`.

CI parity check: `.github/workflows/frontend-deploy-prep.yml` builds the exact
same output on every frontend PR.

---

## 3. Backend (API + worker) → Azure Container Apps

Both services are **stateless** single-file esbuild bundles; images contain only
`dist/` (no node_modules). Full Azure commands: [`infrastructure/azure/README.md`](infrastructure/azure/README.md).

### Build images

```bash
pnpm run docker:build            # builds orgni-api + orgni-worker locally
# or individually:
docker build -f infrastructure/docker/api.Dockerfile -t orgni-api .
docker build -f infrastructure/docker/worker.Dockerfile -t orgni-worker .
```

CI validates and smoke-runs both images on every backend PR
(`.github/workflows/docker-validation.yml`).

### Environment variables

Validated at boot by `@workspace/config` — services fail fast with a readable
error on bad config. Never commit secrets; use Container Apps secrets.

**API** (`apps/api/.env.example`):

| Variable | Required | Notes |
|----------|----------|-------|
| `PORT` | yes | Container Apps does **not** inject it — set it explicitly and match the ingress `targetPort`. |
| `NODE_ENV` | yes | `production` |
| `DATABASE_URL` | when persistence lands | Azure Database for PostgreSQL connection string |
| `CORS_ORIGINS` | for browser access | Comma list, wildcards ok (`https://*.vercel.app`); unset = same-origin only. |
| `LOG_LEVEL` | no | pino level, default `info` |
| `GIT_SHA` | recommended | surfaced by `GET /api/version` |

**Worker** (`apps/worker/.env.example`): `NODE_ENV`, optional `DATABASE_URL`,
`REDIS_URL` (job queues), `WORKER_POLL_INTERVAL_MS`, `GIT_SHA`.

### Health & verification

- Liveness: `GET /api/health` → `{"status":"ok"}`
- Readiness: `GET /api/health/ready`
- Deploy check: `GET /api/version` (name, version, gitSha)
- Worker: logs `worker started` (structured JSON via pino)

---

## 4. Local full-platform run

```bash
docker compose -f infrastructure/docker/docker-compose.yml up --build
```

Starts API (:8080), worker, PostgreSQL (:5432) and Redis (:6379) with wired-up
connection strings (local-only credentials).

---

## 5. Detailed guides

- [Vercel (frontend)](docs/deployment/vercel.md) — exact project settings, previews, custom domain
- [Azure (API + worker)](docs/deployment/azure.md) — ACR, Container Apps, probes, migrations, rollback
- [Environment-variable matrix](docs/deployment/environment-variables.md)
- [Local setup](docs/development/local-setup.md)

## 6. Gotchas

- **`PORT` on Container Apps** must be set manually (the server exits without it).
- **Static frontend ≠ Azure**: `vercel.json` is Vercel-specific; Azure ignores it.
- **Stateless services**: never write to local disk in API/worker; all state
  belongs in PostgreSQL/Redis.
- Restart services after changing env vars — config is read once at boot.
