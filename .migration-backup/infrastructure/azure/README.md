# Azure infrastructure

Concrete `az` commands to host Orgni on **Azure Container Apps** (no AKS). See
[`../../DEPLOYMENT.md`](../../DEPLOYMENT.md) for the overview.

| Component | Azure service | Ingress |
|-----------|---------------|---------|
| API | Container App `orgni-api` | **external** |
| Worker | Container App `orgni-worker` | none |
| Document Intelligence | Container App `orgni-document-intelligence` | **internal** |
| Ontology | Container App `orgni-ontology` | **internal** |
| Database | Azure Database for PostgreSQL (Flexible Server) | — |
| Queue/cache | Azure Cache for Redis | — |
| Images | Azure Container Registry (ACR) | — |
| Frontend | Vercel (or Azure Static Web Apps) | — |

Secrets (`DATABASE_URL`, `REDIS_URL`) are injected as Container App secrets —
never baked into images or committed.

## 1. One-time setup

```bash
az group create -n orgni-rg -l westeurope
az acr create -n orgniacr -g orgni-rg --sku Basic
az containerapp env create -n orgni-env -g orgni-rg -l westeurope

# Data stores
az postgres flexible-server create -g orgni-rg -n orgni-pg \
  --admin-user orgni --admin-password '<strong-password>' \
  --tier Burstable --sku-name Standard_B1ms --version 16 --yes
az redis create -g orgni-rg -n orgni-redis --sku Basic --vm-size c0
```

Connection strings:
- `DATABASE_URL=postgres://orgni:<password>@orgni-pg.postgres.database.azure.com:5432/orgni?sslmode=require`
- `REDIS_URL=rediss://:<primary-key>@orgni-redis.redis.cache.windows.net:6380`

## 2. Build & push images (from the repo root)

```bash
az acr login -n orgniacr
TAG=$(git rev-parse --short HEAD)
for f in api worker document-intelligence organizational-ontology; do
  name=$([ "$f" = organizational-ontology ] && echo ontology || echo "$f")
  docker build -f infrastructure/docker/$f.Dockerfile \
    -t orgniacr.azurecr.io/orgni-$name:$TAG .
  docker push orgniacr.azurecr.io/orgni-$name:$TAG
done
```

## 3. Run the database migration

```bash
DATABASE_URL='postgres://orgni:<password>@orgni-pg.postgres.database.azure.com:5432/orgni?sslmode=require' \
  pnpm --filter @workspace/db run push-force
```

## 4. Deploy the internal Python services first

```bash
az containerapp create -n orgni-document-intelligence -g orgni-rg --environment orgni-env \
  --image orgniacr.azurecr.io/orgni-document-intelligence:<tag> \
  --target-port 8000 --ingress internal \
  --env-vars PORT=8000

az containerapp create -n orgni-ontology -g orgni-rg --environment orgni-env \
  --image orgniacr.azurecr.io/orgni-ontology:<tag> \
  --target-port 8100 --ingress internal \
  --env-vars PORT=8100
```

Capture their internal FQDNs (used by the API):

```bash
DI_URL=https://$(az containerapp show -n orgni-document-intelligence -g orgni-rg --query properties.configuration.ingress.fqdn -o tsv)
ONTO_URL=https://$(az containerapp show -n orgni-ontology -g orgni-rg --query properties.configuration.ingress.fqdn -o tsv)
```

## 5. Deploy the API (external) and worker

```bash
az containerapp create -n orgni-api -g orgni-rg --environment orgni-env \
  --image orgniacr.azurecr.io/orgni-api:<tag> \
  --target-port 8080 --ingress external \
  --secrets database-url=<postgres-connection-string> \
  --env-vars PORT=8080 NODE_ENV=production \
             DATABASE_URL=secretref:database-url \
             DOCUMENT_INTELLIGENCE_URL=$DI_URL ONTOLOGY_URL=$ONTO_URL \
             GIT_SHA=<tag>

az containerapp create -n orgni-worker -g orgni-rg --environment orgni-env \
  --image orgniacr.azurecr.io/orgni-worker:<tag> \
  --secrets database-url=<postgres-connection-string> redis-url=<redis-connection-string> \
  --env-vars NODE_ENV=production DATABASE_URL=secretref:database-url \
             REDIS_URL=secretref:redis-url GIT_SHA=<tag>
```

## 6. Health probes

- API: liveness `GET /api/health`, readiness `GET /api/health/ready`, deploy check `GET /api/version`
- Document Intelligence: `GET /health`
- Ontology: `GET /health`, `GET /health/ready`

## 7. Verify

```bash
API=https://$(az containerapp show -n orgni-api -g orgni-rg --query properties.configuration.ingress.fqdn -o tsv)
curl $API/api/health
curl -X POST $API/api/documents -H "X-Tenant-Id: tenant_demo" -F "file=@invoice.pdf"
curl $API/api/documents -H "X-Tenant-Id: tenant_demo"
```

## 8. Update / rollback

Ship a new image tag and update in place; roll back by pointing at the previous tag:

```bash
az containerapp update -n orgni-api -g orgni-rg --image orgniacr.azurecr.io/orgni-api:<tag>
```
