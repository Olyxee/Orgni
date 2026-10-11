# Orgni Production Audit — Live Evidence Record

**Date**: 2026-10-11  
**Environment**: Production Live API & Codebase (`Olyxee/Orgni`)  
**Production Endpoint**: `https://orgni-api.happyrock-65c5dcaf.southafricanorth.azurecontainerapps.io/api`  

---

## 1. Route Mounting & Endpoint Definition Evidence

### `artifacts/api-server/src/routes/index.ts`
```typescript
// lines 19-25: Central authentication guard applied globally to routes
router.use(authenticate, documentsRouter);
router.use(authenticate, modelRouter);
router.use(authenticate, keysRouter);
router.use(authenticate, productRouter);
router.use(authenticate, teamsRouter);
```

### `artifacts/api-server/src/routes/documents.ts`
```typescript
// lines 270-291: GET /api/documents list endpoint
router.get("/documents", async (req: Request, res: Response) => {
  if (!store) {
    res.status(503).json({ error: "persistence_unavailable" });
    return;
  }
  const tenantId = resolveTenantId(req);
  if (!tenantId) {
    res.status(400).json({ error: "missing_tenant" });
    return;
  }
  const rows = await store.repository.listSources(tenantId);
  res.json({
    documents: rows.map((r) => ({
      sourceId: r.sourceId,
      filename: r.filename,
      documentType: r.documentType,
      state: r.state,
      confidence: r.confidence,
      uploadedAt: r.uploadedAt,
    })),
  });
});
```

---

## 2. Authentication Middleware Evidence

### `artifacts/api-server/src/lib/authenticate.ts`
```typescript
// lines 92-106: Dev shortcut disabled in production
if (!isProd) {
  const tenant = req.header("x-tenant-id");
  if (tenant?.trim()) {
    req.principal = {
      sub: "dev@local",
      tenantId: tenant.trim(),
      roles: ["Owner"],
      iat: 0,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    next();
    return;
  }
}

res.status(401).json({ error: "unauthenticated" });
```

---

## 3. Database Schema Uniform Primary Key Evidence

### `lib/db/src/schema/product.ts`
```typescript
// lines 101-128: Uniform primary key and tenant scoping
export const orgniActions = pgTable(
  "orgni_actions",
  {
    id: text("id").notNull(),
    tenantId: text("tenant_id").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("in_progress"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    // ...
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.id] }),
    index("orgni_actions_tenant_idx").on(t.tenantId),
  ],
);
```

### `lib/db/src/schema/documents.ts`
```typescript
// lines 28-50: Content-addressed sources table with stable primary keys
export const sources = pgTable(
  "sources",
  {
    sourceId: text("source_id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    checksum: text("checksum").notNull(),
    byteSize: integer("byte_size").notNull(),
    state: text("state").$type<IngestionState>().notNull(),
    // ...
  },
  // ...
);
```

---

## 4. Live Production Terminal Probe Output

Recorded 2026-10-11 11:42 UTC:

```text
Probe 1: GET /api/health
HTTP/1.1 200 OK
{"status":"ok"}

Probe 2: GET /api/documents (Unauthenticated)
HTTP/1.1 401 Unauthorized
x-powered-by: Express
{"error":"unauthenticated"}

Probe 3: GET /api/documents/ (Trailing slash)
HTTP/1.1 401 Unauthorized
x-powered-by: Express
{"error":"unauthenticated"}

Probe 4: GET /api/documents with X-Tenant-Id: test-tenant
HTTP/1.1 401 Unauthorized
{"error":"unauthenticated"}
```
