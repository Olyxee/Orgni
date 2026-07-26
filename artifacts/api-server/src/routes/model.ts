/**
 * Organisational-model read endpoints for the console.
 *
 * The pipeline stores one OntologyResult per source (entities, relationships,
 * facts, conflicts). These routes aggregate those results across a tenant into
 * the views the console presents: the organisation's entities, relationships,
 * facts, exceptions, and activity — each item carrying provenance back to the
 * source it came from. Read-only; nothing here mutates the model.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { createDb } from "@workspace/db/connect";
import { config } from "../lib/config";

const router: IRouter = Router();

const store = config.DATABASE_URL ? createDb(config.DATABASE_URL) : null;

function tenantOf(req: Request): string | null {
  return req.principal?.tenantId ?? null;
}

interface Provenance {
  sourceId: string;
  filename: string;
  documentType: string | null;
  uploadedAt: Date;
}

type Obj = Record<string, unknown>;
const asObj = (v: unknown): Obj =>
  v && typeof v === "object" ? (v as Obj) : {};
const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v : null;

/** Stable key for de-duplicating an entity across sources. */
function entityKey(e: Obj): string {
  const name = str(e["name"]) ?? str(e["entity_name"]) ?? "unknown";
  const kind =
    str(e["entity_type"]) ?? str(e["type"]) ?? str(e["kind"]) ?? "ENTITY";
  return `${kind.toLowerCase()}::${name.toLowerCase()}`;
}

interface TenantModel {
  entities: Map<
    string,
    { key: string; entity: Obj; occurrences: number; sources: Provenance[] }
  >;
  relationships: Array<{ relationship: Obj; source: Provenance }>;
  facts: Array<{ fact: Obj; source: Provenance }>;
  conflicts: Array<{ conflict: unknown; source: Provenance }>;
  rejected: Array<{ reason: string; source: Provenance }>;
  warnings: Array<{ warning: string; source: Provenance }>;
}

/** Fold every stored OntologyResult into one tenant-wide model. */
async function loadModel(tenantId: string): Promise<TenantModel> {
  const model: TenantModel = {
    entities: new Map(),
    relationships: [],
    facts: [],
    conflicts: [],
    rejected: [],
    warnings: [],
  };
  if (!store) return model;
  const rows = await store.repository.listFactRows(tenantId);
  for (const { fact, source } of rows) {
    const prov: Provenance = {
      sourceId: source.sourceId,
      filename: source.filename,
      documentType: source.documentType,
      uploadedAt: source.uploadedAt,
    };
    const result = asObj(fact.result);
    const arr = (k: string): unknown[] =>
      Array.isArray(result[k]) ? (result[k] as unknown[]) : [];
    for (const raw of arr("entities")) {
      const e = asObj(raw);
      const key = entityKey(e);
      const existing = model.entities.get(key);
      if (existing) {
        existing.occurrences += 1;
        existing.sources.push(prov);
      } else {
        model.entities.set(key, {
          key,
          entity: e,
          occurrences: 1,
          sources: [prov],
        });
      }
    }
    for (const raw of arr("relationships")) {
      model.relationships.push({ relationship: asObj(raw), source: prov });
    }
    for (const raw of arr("facts")) {
      model.facts.push({ fact: asObj(raw), source: prov });
    }
    for (const raw of arr("conflicts")) {
      model.conflicts.push({ conflict: raw, source: prov });
    }
    for (const raw of arr("rejected")) {
      if (typeof raw === "string")
        model.rejected.push({ reason: raw, source: prov });
    }
    for (const raw of arr("warnings")) {
      if (typeof raw === "string")
        model.warnings.push({ warning: raw, source: prov });
    }
  }
  return model;
}

const unavailable = (res: Response) =>
  res.status(503).json({ error: "persistence_unavailable" });

/** GET /api/model/overview — the organisation at a glance. */
router.get("/model/overview", async (req: Request, res: Response) => {
  if (!store) return void unavailable(res);
  const tenantId = tenantOf(req);
  if (!tenantId) return void res.status(400).json({ error: "missing_tenant" });

  const [sources, model, reviews] = await Promise.all([
    store.repository.listSources(tenantId, 500),
    loadModel(tenantId),
    store.repository.listReviewRows(tenantId, 50),
  ]);

  const byState: Record<string, number> = {};
  for (const s of sources) byState[s.state] = (byState[s.state] ?? 0) + 1;
  const factsByStatus: Record<string, number> = {};
  for (const { fact } of model.facts) {
    const k = str(fact["epistemic_status"]) ?? "UNSPECIFIED";
    factsByStatus[k] = (factsByStatus[k] ?? 0) + 1;
  }

  res.json({
    sources: { total: sources.length, byState },
    entities: model.entities.size,
    relationships: model.relationships.length,
    facts: { total: model.facts.length, byStatus: factsByStatus },
    exceptions:
      model.conflicts.length +
      model.rejected.length +
      sources.filter((s) => s.state === "FAILED").length,
    reviews: reviews.length,
    latestSources: sources.slice(0, 5).map((s) => ({
      sourceId: s.sourceId,
      filename: s.filename,
      documentType: s.documentType,
      state: s.state,
      uploadedAt: s.uploadedAt,
    })),
  });
});

/** GET /api/model/entities — de-duplicated entities with provenance. */
router.get("/model/entities", async (req: Request, res: Response) => {
  if (!store) return void unavailable(res);
  const tenantId = tenantOf(req);
  if (!tenantId) return void res.status(400).json({ error: "missing_tenant" });
  const model = await loadModel(tenantId);
  res.json({
    entities: [...model.entities.values()].sort(
      (a, b) => b.occurrences - a.occurrences,
    ),
  });
});

/** GET /api/model/entities/:key — one entity with its facts and evidence. */
router.get("/model/entities/:key", async (req: Request, res: Response) => {
  if (!store) return void unavailable(res);
  const tenantId = tenantOf(req);
  if (!tenantId) return void res.status(400).json({ error: "missing_tenant" });
  const key = decodeURIComponent(req.params["key"] as string);
  const model = await loadModel(tenantId);
  const entry = model.entities.get(key);
  if (!entry) return void res.status(404).json({ error: "not_found" });

  const name = (
    str(entry.entity["name"]) ??
    str(entry.entity["entity_name"]) ??
    ""
  ).toLowerCase();
  const mentions = (o: Obj): boolean =>
    JSON.stringify(o).toLowerCase().includes(name);

  res.json({
    ...entry,
    facts: name ? model.facts.filter((f) => mentions(f.fact)) : [],
    relationships: name
      ? model.relationships.filter((r) => mentions(r.relationship))
      : [],
  });
});

/** GET /api/model/relationships */
router.get("/model/relationships", async (req: Request, res: Response) => {
  if (!store) return void unavailable(res);
  const tenantId = tenantOf(req);
  if (!tenantId) return void res.status(400).json({ error: "missing_tenant" });
  const model = await loadModel(tenantId);
  res.json({ relationships: model.relationships });
});

/** GET /api/model/facts */
router.get("/model/facts", async (req: Request, res: Response) => {
  if (!store) return void unavailable(res);
  const tenantId = tenantOf(req);
  if (!tenantId) return void res.status(400).json({ error: "missing_tenant" });
  const model = await loadModel(tenantId);
  res.json({ facts: model.facts });
});

/** GET /api/model/exceptions — conflicts, refusals, failed sources. */
router.get("/model/exceptions", async (req: Request, res: Response) => {
  if (!store) return void unavailable(res);
  const tenantId = tenantOf(req);
  if (!tenantId) return void res.status(400).json({ error: "missing_tenant" });
  const [model, sources] = await Promise.all([
    loadModel(tenantId),
    store.repository.listSources(tenantId, 500),
  ]);
  res.json({
    conflicts: model.conflicts,
    rejected: model.rejected,
    warnings: model.warnings,
    failedSources: sources
      .filter((s) => s.state === "FAILED")
      .map((s) => ({
        sourceId: s.sourceId,
        filename: s.filename,
        errors: s.errors,
        uploadedAt: s.uploadedAt,
      })),
  });
});

/** GET /api/model/activity — chronological record of what happened. */
router.get("/model/activity", async (req: Request, res: Response) => {
  if (!store) return void unavailable(res);
  const tenantId = tenantOf(req);
  if (!tenantId) return void res.status(400).json({ error: "missing_tenant" });
  const [sources, reviews] = await Promise.all([
    store.repository.listSources(tenantId, 200),
    store.repository.listReviewRows(tenantId, 200),
  ]);
  const events = [
    ...sources.map((s) => ({
      type: "SOURCE_PROCESSED" as const,
      at: s.uploadedAt,
      sourceId: s.sourceId,
      filename: s.filename,
      state: s.state,
      documentType: s.documentType,
    })),
    ...reviews.map((r) => ({
      type: "REVIEW" as const,
      at: r.createdAt,
      sourceId: r.sourceId,
      fieldPath: r.fieldPath,
      action: r.action,
      reviewer: r.reviewer,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  res.json({ events });
});

export default router;
