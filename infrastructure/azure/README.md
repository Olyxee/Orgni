# Azure infrastructure

Target architecture (no AKS/Kubernetes — Azure Container Apps only):

| Component  | Azure service                        |
| ---------- | ------------------------------------ |
| API        | Azure Container Apps (`orgni-api`)   |
| Worker     | Azure Container Apps (`orgni-worker`)|
| Database   | Azure Database for PostgreSQL (Flexible Server) |
| Queue/cache| Azure Cache for Redis                |
| Images     | Azure Container Registry (ACR)       |
| Frontend   | **Not on Azure** — deployed to Vercel |

Both containers are stateless; scale rules can be added per app. Secrets
(`DATABASE_URL`, `REDIS_URL`) are injected as Container App secrets — never
baked into images or committed.

## One-time setup (Azure CLI)

```bash
az group create -n orgni-rg -l westeurope
az acr create -n orgniacr -g orgni-rg --sku Basic
az containerapp env create -n orgni-env -g orgni-rg -l westeurope
```

## Build & push images

```bash
az acr login -n orgniacr
docker build -f infrastructure/docker/api.Dockerfile -t orgniacr.azurecr.io/orgni-api:$(git rev-parse --short HEAD) .
docker build -f infrastructure/docker/worker.Dockerfile -t orgniacr.azurecr.io/orgni-worker:$(git rev-parse --short HEAD) .
docker push orgniacr.azurecr.io/orgni-api --all-tags
docker push orgniacr.azurecr.io/orgni-worker --all-tags
```

## Deploy

```bash
az containerapp create -n orgni-api -g orgni-rg --environment orgni-env \
  --image orgniacr.azurecr.io/orgni-api:<tag> \
  --target-port 8080 --ingress external \
  --secrets database-url=<postgres-connection-string> \
  --env-vars PORT=8080 NODE_ENV=production DATABASE_URL=secretref:database-url GIT_SHA=<tag>

az containerapp create -n orgni-worker -g orgni-rg --environment orgni-env \
  --image orgniacr.azurecr.io/orgni-worker:<tag> \
  --secrets database-url=<postgres-connection-string> redis-url=<redis-connection-string> \
  --env-vars NODE_ENV=production DATABASE_URL=secretref:database-url REDIS_URL=secretref:redis-url GIT_SHA=<tag>
```

Health probes for the API: liveness `GET /api/health`, readiness
`GET /api/health/ready`, deploy verification `GET /api/version`.
