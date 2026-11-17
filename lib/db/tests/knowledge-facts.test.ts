/**
 * Integration tests for knowledge_facts and knowledge_conflicts persistence.
 *
 * Run against a REAL PostgreSQL database.  Set DATABASE_URL to a test
 * database (name must contain "test") before running:
 *
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orgni_test \
 *     pnpm --filter @workspace/db test
 *
 * When DATABASE_URL is unset the suite is skipped, not failed, so CI without
 * a database still passes (the guard test proves the guard works; the DB tests
 * prove the queries work when a database is present).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb, type DbHandle } from "../src/connect";
import { assertTestDatabaseUrl } from "../src/test-guard";
import { sources } from "../src/schema/documents";
import { knowledgeFacts, knowledgeConflicts } from "../src/schema/knowledge";
import { and, eq } from "drizzle-orm";

const DATABASE_URL = process.env["DATABASE_URL"];

let handle: DbHandle;

const TENANT_A = "kf_tenant_a";
const TENANT_B = "kf_tenant_b";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeSource(sourceId: string, tenantId: string, filename = "report.xlsx") {
  return {
    sourceId,
    tenantId,
    filename,
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    checksum: `chk_${sourceId}`,
    byteSize: 2048,
    state: "COMPLETED" as const,
    documentType: null,
    confidence: 0.82,
    sourceAcl: [],
    warnings: [],
    errors: [],
    uploadedAt: new Date("2026-11-01T00:00:00Z"),
  };
}

/** Build a minimal SPREADSHEET_FACT token payload (matches the structure
 *  produced by generic-tokenizer.ts). */
function makeFactToken(
  tokenId: string,
  tenantId: string,
  opts: {
    entityName: string;
    attribute: string;
    rawValue: string;
    numericValue?: number;
    worksheetName?: string;
    rowNumber?: number;
    cellRef?: string;
    entityCellRef?: string;
  },
): Record<string, unknown> {
  return {
    tokenId,
    tenantId,
    tokenKind: "STATE",
    eventType: "SPREADSHEET_FACT",
    subjectId: opts.entityName,
    scalarValue: {
      attribute: opts.attribute,
      rawValue: opts.rawValue,
      ...(opts.numericValue !== undefined
        ? { numericValue: opts.numericValue }
        : {}),
      worksheetName: opts.worksheetName ?? "Sheet1",
      rowNumber: opts.rowNumber ?? 2,
      cellRef: opts.cellRef ?? "B2",
      entityCellRef: opts.entityCellRef ?? "A2",
      columnName: opts.attribute,
      entityColumn: "Product",
      entityValue: opts.entityName,
      sourceDocument: "report.xlsx",
    },
    confidence: 0.82,
    epistemicStatus: "OBSERVED",
    visibility: [],
    actionScope: ["context-model", "knowledge-extraction"],
    retentionClass: "organizational-evidence",
    transactionTime: new Date().toISOString(),
    sourceRefs: [],
    payloadRef: "deadbeef",
  };
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeAll(() => {
  if (!DATABASE_URL) return;
  assertTestDatabaseUrl(DATABASE_URL);
  handle = createDb(DATABASE_URL);
});

afterAll(async () => {
  await handle?.close();
});

beforeEach(async () => {
  if (!handle) return;
  // Delete knowledge tables first (FK order), then sources (cascades tokens/facts/reviews).
  await handle.db.delete(knowledgeConflicts);
  await handle.db.delete(knowledgeFacts);
  await handle.db.delete(sources);
});

// ── Test suites ───────────────────────────────────────────────────────────────

describe.skipIf(!DATABASE_URL)("knowledge facts — basic persistence", () => {
  it("1. inserts a structured spreadsheet fact and returns the row", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_basic", TENANT_A),
      tokens: [],
      facts: null,
    });

    const saved = await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_basic",
      entityName: "Medium Duty Truck",
      attribute: "Revenue",
      rawValue: "4850000",
      numericValue: 4850000,
      worksheetName: "Sales Data",
      rowNumber: 2,
      cellRef: "D2",
      entityCellRef: "A2",
      confidence: 0.82,
      epistemicStatus: "OBSERVED",
    });

    expect(saved.id).toBeTruthy();
    expect(saved.tenantId).toBe(TENANT_A);
    expect(saved.entityName).toBe("Medium Duty Truck");
    expect(saved.attribute).toBe("Revenue");
    expect(saved.rawValue).toBe("4850000");
    expect(saved.numericValue).toBe(4850000);
    expect(saved.worksheetName).toBe("Sales Data");
    expect(saved.rowNumber).toBe(2);
    expect(saved.cellRef).toBe("D2");
    expect(saved.entityCellRef).toBe("A2");
    expect(saved.confidence).toBe(0.82);
    expect(saved.epistemicStatus).toBe("OBSERVED");
  });

  it("2. retrieves a fact by entity and attribute", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_retrieve", TENANT_A),
      tokens: [],
      facts: null,
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_retrieve",
      entityName: "Light Duty Truck",
      attribute: "Revenue",
      rawValue: "50000",
      numericValue: 50000,
      worksheetName: "Annual Summary",
      rowNumber: 3,
      cellRef: "B3",
      entityCellRef: "A3",
    });

    const results = await handle.repository.getKnowledgeFacts(
      TENANT_A,
      "Light Duty Truck",
      "Revenue",
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.fact.rawValue).toBe("50000");
    expect(results[0]!.fact.worksheetName).toBe("Annual Summary");
  });

  it("3. retrieves the original source information via getKnowledgeFacts", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_provenance", TENANT_A, "Concatenate And Filter.xlsx"),
      tokens: [],
      facts: null,
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_provenance",
      entityName: "Medium Duty Truck",
      attribute: "Revenue",
      rawValue: "4850000",
      numericValue: 4850000,
    });

    const results = await handle.repository.getKnowledgeFacts(
      TENANT_A,
      "Medium Duty Truck",
      "Revenue",
    );
    expect(results[0]!.filename).toBe("Concatenate And Filter.xlsx");
    expect(results[0]!.fact.sourceId).toBe("src_provenance");
  });

  it("4. verifies exact worksheet, row and cell references persist and round-trip", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_cell", TENANT_A),
      tokens: [],
      facts: null,
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_cell",
      entityName: "Heavy Duty Truck",
      attribute: "Quantity",
      rawValue: "12",
      numericValue: 12,
      worksheetName: "Revenue Summary",
      rowNumber: 5,
      cellRef: "C5",
      entityCellRef: "A5",
    });

    // Fresh query — not reading from in-memory state.
    const rows = await handle.repository.getKnowledgeFactsBySource(
      TENANT_A,
      "src_cell",
    );
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.worksheetName).toBe("Revenue Summary");
    expect(row.rowNumber).toBe(5);
    expect(row.cellRef).toBe("C5");
    expect(row.entityCellRef).toBe("A5");
  });

  it("5. verifies persistence after a fresh database connection", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_fresh", TENANT_A),
      tokens: [],
      facts: null,
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_fresh",
      entityName: "Widget",
      attribute: "Price",
      rawValue: "1234.56",
      numericValue: 1234.56,
      worksheetName: "Pricing",
      rowNumber: 7,
      cellRef: "B7",
    });

    // Open a second connection to the same database.
    const handle2 = createDb(DATABASE_URL!);
    try {
      const rows = await handle2.repository.getKnowledgeFactsBySource(
        TENANT_A,
        "src_fresh",
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.numericValue).toBeCloseTo(1234.56, 5);
    } finally {
      await handle2.close();
    }
  });
});

describe.skipIf(!DATABASE_URL)("knowledge facts — reprocessing and upsert", () => {
  it("6. reprocessing the same source does not create duplicate facts", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_reprocess", TENANT_A),
      tokens: [],
      facts: null,
    });

    // First ingest.
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_reprocess",
      entityName: "Truck A",
      attribute: "Revenue",
      rawValue: "100000",
      numericValue: 100000,
      worksheetName: "Sheet1",
      rowNumber: 2,
      cellRef: "B2",
    });

    // Second ingest of the same source (reprocess) with updated value.
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_reprocess",
      entityName: "Truck A",
      attribute: "Revenue",
      rawValue: "105000",
      numericValue: 105000,
      worksheetName: "Sheet1",
      rowNumber: 2,
      cellRef: "B2",
    });

    // Only one row for this (source, entity, attribute).
    const rows = await handle.repository.getKnowledgeFactsBySource(
      TENANT_A,
      "src_reprocess",
    );
    expect(rows).toHaveLength(1);
    // Value was updated.
    expect(rows[0]!.rawValue).toBe("105000");
    expect(rows[0]!.numericValue).toBe(105000);
  });

  it("saves all SPREADSHEET_FACT tokens in one call via saveKnowledgeFactsFromTokens", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_bulk", TENANT_A),
      tokens: [],
      facts: null,
    });

    const tokenList = [
      makeFactToken("tok_1", TENANT_A, {
        entityName: "Light Duty Truck",
        attribute: "Revenue",
        rawValue: "50000",
        numericValue: 50000,
        worksheetName: "Sales",
        rowNumber: 2,
        cellRef: "B2",
        entityCellRef: "A2",
      }),
      makeFactToken("tok_2", TENANT_A, {
        entityName: "Medium Duty Truck",
        attribute: "Revenue",
        rawValue: "75000",
        numericValue: 75000,
        worksheetName: "Sales",
        rowNumber: 3,
        cellRef: "B3",
        entityCellRef: "A3",
      }),
      makeFactToken("tok_3", TENANT_A, {
        entityName: "Heavy Duty Truck",
        attribute: "Revenue",
        rawValue: "120000",
        numericValue: 120000,
        worksheetName: "Sales",
        rowNumber: 4,
        cellRef: "B4",
        entityCellRef: "A4",
      }),
      // Non-SPREADSHEET_FACT token — must be silently ignored.
      {
        tokenId: "tok_4",
        tenantId: TENANT_A,
        tokenKind: "STATE",
        eventType: "SPREADSHEET_ROW",
        scalarValue: { row: "some row text", rowNumber: 2 },
        confidence: 0.72,
        epistemicStatus: "OBSERVED",
        visibility: [],
        actionScope: [],
        retentionClass: "organizational-evidence",
        transactionTime: new Date().toISOString(),
        sourceRefs: [],
        payloadRef: "deadbeef",
      },
    ];

    const saved = await handle.repository.saveKnowledgeFactsFromTokens(
      TENANT_A,
      "src_bulk",
      tokenList,
    );

    // Only the 3 SPREADSHEET_FACT tokens should produce rows.
    expect(saved).toHaveLength(3);
    const entities = saved.map((r) => r.entityName).sort();
    expect(entities).toEqual([
      "Heavy Duty Truck",
      "Light Duty Truck",
      "Medium Duty Truck",
    ]);
  });
});

describe.skipIf(!DATABASE_URL)("knowledge facts — conflict detection", () => {
  it("7a. preserves conflicting facts from two different documents", async () => {
    // Source A says revenue = 4850000.
    await handle.repository.persistDocument({
      source: makeSource("src_conflict_a", TENANT_A, "fileA.xlsx"),
      tokens: [],
      facts: null,
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_conflict_a",
      entityName: "Medium Duty Truck",
      attribute: "Revenue",
      rawValue: "4850000",
      numericValue: 4850000,
    });

    // Source B says revenue = 4900000 — different value, same entity.
    await handle.repository.persistDocument({
      source: makeSource("src_conflict_b", TENANT_A, "fileB.xlsx"),
      tokens: [],
      facts: null,
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_conflict_b",
      entityName: "Medium Duty Truck",
      attribute: "Revenue",
      rawValue: "4900000",
      numericValue: 4900000,
    });

    // Both facts must be retained.
    const all = await handle.repository.getKnowledgeFacts(
      TENANT_A,
      "Medium Duty Truck",
      "Revenue",
    );
    expect(all).toHaveLength(2);
    const values = all.map((r) => r.fact.rawValue).sort();
    expect(values).toEqual(["4850000", "4900000"]);
  });

  it("7b. records a CONTRADICTORY_VALUE conflict when values differ", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_c1", TENANT_A, "file1.xlsx"),
      tokens: [],
      facts: null,
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_c1",
      entityName: "Widget",
      attribute: "Price",
      rawValue: "100",
      numericValue: 100,
    });

    await handle.repository.persistDocument({
      source: makeSource("src_c2", TENANT_A, "file2.xlsx"),
      tokens: [],
      facts: null,
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_c2",
      entityName: "Widget",
      attribute: "Price",
      rawValue: "150",
      numericValue: 150,
    });

    const conflicts = await handle.repository.getKnowledgeConflicts(TENANT_A);
    const widgetConflicts = conflicts.filter(
      (c) => c.conflict.entityName === "Widget" && c.conflict.attribute === "Price",
    );
    expect(widgetConflicts).toHaveLength(1);
    expect(widgetConflicts[0]!.conflict.conflictType).toBe("CONTRADICTORY_VALUE");
    expect(widgetConflicts[0]!.conflict.status).toBe("OPEN");
    // Both facts are present in the conflict record.
    const conflictValues = [
      widgetConflicts[0]!.factA.rawValue,
      widgetConflicts[0]!.factB.rawValue,
    ].sort();
    expect(conflictValues).toEqual(["100", "150"]);
  });

  it("7c. records a DUPLICATE_VALUE conflict when same value appears in two sources", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_dup1", TENANT_A, "dup1.xlsx"),
      tokens: [],
      facts: null,
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_dup1",
      entityName: "Alpha",
      attribute: "Cost",
      rawValue: "500",
      numericValue: 500,
    });

    await handle.repository.persistDocument({
      source: makeSource("src_dup2", TENANT_A, "dup2.xlsx"),
      tokens: [],
      facts: null,
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_dup2",
      entityName: "Alpha",
      attribute: "Cost",
      rawValue: "500",  // same value
      numericValue: 500,
    });

    const conflicts = await handle.repository.getKnowledgeConflicts(TENANT_A);
    const alphaConflicts = conflicts.filter(
      (c) => c.conflict.entityName === "Alpha",
    );
    expect(alphaConflicts).toHaveLength(1);
    expect(alphaConflicts[0]!.conflict.conflictType).toBe("DUPLICATE_VALUE");
  });

  it("7d. reprocessing the same source does not create a self-conflict", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_self", TENANT_A),
      tokens: [],
      facts: null,
    });

    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_self",
      entityName: "Beta",
      attribute: "Revenue",
      rawValue: "200",
    });
    // Reprocess with same source, different value → upsert, no conflict.
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_self",
      entityName: "Beta",
      attribute: "Revenue",
      rawValue: "250",
    });

    const conflicts = await handle.repository.getKnowledgeConflicts(TENANT_A);
    const betaConflicts = conflicts.filter(
      (c) => c.conflict.entityName === "Beta",
    );
    expect(betaConflicts).toHaveLength(0);
  });

  it("7e. inserting the same conflict pair twice does not duplicate the record", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_pair1", TENANT_A, "p1.xlsx"),
      tokens: [],
      facts: null,
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_pair1",
      entityName: "Gamma",
      attribute: "Qty",
      rawValue: "10",
    });

    await handle.repository.persistDocument({
      source: makeSource("src_pair2", TENANT_A, "p2.xlsx"),
      tokens: [],
      facts: null,
    });
    // Insert twice — second call must be a no-op via ON CONFLICT DO NOTHING.
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_pair2",
      entityName: "Gamma",
      attribute: "Qty",
      rawValue: "20",
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_pair2",
      entityName: "Gamma",
      attribute: "Qty",
      rawValue: "20",
    });

    const conflicts = await handle.repository.getKnowledgeConflicts(TENANT_A);
    const gammaConflicts = conflicts.filter(
      (c) => c.conflict.entityName === "Gamma",
    );
    expect(gammaConflicts).toHaveLength(1);
  });
});

describe.skipIf(!DATABASE_URL)("knowledge facts — tenant isolation", () => {
  it("8a. tenant B cannot see tenant A's facts by entity+attribute", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_iso_a", TENANT_A),
      tokens: [],
      facts: null,
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_iso_a",
      entityName: "Secret Entity",
      attribute: "Revenue",
      rawValue: "9999",
    });

    const resultsB = await handle.repository.getKnowledgeFacts(
      TENANT_B,
      "Secret Entity",
      "Revenue",
    );
    expect(resultsB).toHaveLength(0);
  });

  it("8b. tenant B cannot see tenant A's facts by source", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_iso_a2", TENANT_A),
      tokens: [],
      facts: null,
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_iso_a2",
      entityName: "Alpha",
      attribute: "Revenue",
      rawValue: "1000",
    });

    const resultsB = await handle.repository.getKnowledgeFactsBySource(
      TENANT_B,
      "src_iso_a2",
    );
    expect(resultsB).toHaveLength(0);
  });

  it("8c. two tenants can have identical entity names without interference", async () => {
    // Both tenants have a document with the same entity+attribute.
    await handle.repository.persistDocument({
      source: makeSource("src_iso_b1", TENANT_A),
      tokens: [],
      facts: null,
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_iso_b1",
      entityName: "Shared Entity",
      attribute: "Revenue",
      rawValue: "111",
    });

    await handle.repository.persistDocument({
      source: makeSource("src_iso_b2", TENANT_B),
      tokens: [],
      facts: null,
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_B,
      sourceId: "src_iso_b2",
      entityName: "Shared Entity",
      attribute: "Revenue",
      rawValue: "222",
    });

    // Each tenant sees only their own value.
    const aFacts = await handle.repository.getKnowledgeFacts(
      TENANT_A,
      "Shared Entity",
      "Revenue",
    );
    const bFacts = await handle.repository.getKnowledgeFacts(
      TENANT_B,
      "Shared Entity",
      "Revenue",
    );
    expect(aFacts).toHaveLength(1);
    expect(aFacts[0]!.fact.rawValue).toBe("111");
    expect(bFacts).toHaveLength(1);
    expect(bFacts[0]!.fact.rawValue).toBe("222");
  });

  it("8d. conflicts for tenant A are not visible to tenant B", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_iso_c1", TENANT_A, "a1.xlsx"),
      tokens: [],
      facts: null,
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_iso_c1",
      entityName: "Delta",
      attribute: "Cost",
      rawValue: "50",
    });
    await handle.repository.persistDocument({
      source: makeSource("src_iso_c2", TENANT_A, "a2.xlsx"),
      tokens: [],
      facts: null,
    });
    await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_iso_c2",
      entityName: "Delta",
      attribute: "Cost",
      rawValue: "60",
    });

    const bConflicts = await handle.repository.getKnowledgeConflicts(TENANT_B);
    expect(bConflicts).toHaveLength(0);
  });

  it("8e. saveKnowledgeFact rejects a source that belongs to a different tenant", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_iso_d", TENANT_A),
      tokens: [],
      facts: null,
    });

    await expect(
      handle.repository.saveKnowledgeFact({
        tenantId: TENANT_B,          // wrong tenant
        sourceId: "src_iso_d",       // source owned by TENANT_A
        entityName: "Foo",
        attribute: "Bar",
        rawValue: "baz",
      }),
    ).rejects.toThrow("source not found for tenant");
  });
});

describe.skipIf(!DATABASE_URL)("knowledge facts — edge cases", () => {
  it("9a. handles a null numericValue (non-numeric raw value)", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_edge1", TENANT_A),
      tokens: [],
      facts: null,
    });
    const saved = await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_edge1",
      entityName: "Status Entity",
      attribute: "Status",
      rawValue: "Active",
      numericValue: null,
      valueType: "text",
    });

    expect(saved.numericValue).toBeNull();
    expect(saved.rawValue).toBe("Active");
    expect(saved.valueType).toBe("text");
  });

  it("9b. handles null worksheet, row, and cell references", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_edge2", TENANT_A),
      tokens: [],
      facts: null,
    });
    const saved = await handle.repository.saveKnowledgeFact({
      tenantId: TENANT_A,
      sourceId: "src_edge2",
      entityName: "Some Entity",
      attribute: "Value",
      rawValue: "42",
      numericValue: 42,
      worksheetName: null,
      rowNumber: null,
      cellRef: null,
      entityCellRef: null,
    });

    expect(saved.worksheetName).toBeNull();
    expect(saved.rowNumber).toBeNull();
    expect(saved.cellRef).toBeNull();
    expect(saved.entityCellRef).toBeNull();
  });

  it("9c. saveKnowledgeFactsFromTokens silently skips tokens with missing entity or attribute", async () => {
    await handle.repository.persistDocument({
      source: makeSource("src_edge3", TENANT_A),
      tokens: [],
      facts: null,
    });

    const badTokens = [
      // Missing subjectId — should be skipped.
      {
        tokenId: "bad_1",
        tenantId: TENANT_A,
        tokenKind: "STATE",
        eventType: "SPREADSHEET_FACT",
        scalarValue: { attribute: "Revenue", rawValue: "100" },
        confidence: 0.82,
        epistemicStatus: "OBSERVED",
        visibility: [],
        actionScope: [],
        retentionClass: "organizational-evidence",
        transactionTime: new Date().toISOString(),
        sourceRefs: [],
        payloadRef: "x",
      },
      // Valid token.
      makeFactToken("good_1", TENANT_A, {
        entityName: "Valid Entity",
        attribute: "Revenue",
        rawValue: "999",
        numericValue: 999,
      }),
    ];

    const saved = await handle.repository.saveKnowledgeFactsFromTokens(
      TENANT_A,
      "src_edge3",
      badTokens,
    );
    // Only the valid token persisted.
    expect(saved).toHaveLength(1);
    expect(saved[0]!.entityName).toBe("Valid Entity");
  });
});

// ── Stage 2.1 hardening tests ─────────────────────────────────────────────────

describe.skipIf(!DATABASE_URL)(
  "knowledge facts — replaceKnowledgeFactsFromTokens (safe reprocessing)",
  () => {
    it("R1. reprocessing with fewer rows removes stale facts", async () => {
      await handle.repository.persistDocument({
        source: makeSource("src_r1", TENANT_A),
        tokens: [],
        facts: null,
      });

      // First ingest: three entities.
      const firstTokens = [
        makeFactToken("t1", TENANT_A, {
          entityName: "Light Duty Truck",
          attribute: "Revenue",
          rawValue: "50000",
          numericValue: 50000,
          worksheetName: "Sales",
          rowNumber: 2,
          cellRef: "B2",
          entityCellRef: "A2",
        }),
        makeFactToken("t2", TENANT_A, {
          entityName: "Medium Duty Truck",
          attribute: "Revenue",
          rawValue: "75000",
          numericValue: 75000,
          worksheetName: "Sales",
          rowNumber: 3,
          cellRef: "B3",
          entityCellRef: "A3",
        }),
        makeFactToken("t3", TENANT_A, {
          entityName: "Heavy Duty Truck",
          attribute: "Revenue",
          rawValue: "120000",
          numericValue: 120000,
          worksheetName: "Sales",
          rowNumber: 4,
          cellRef: "B4",
          entityCellRef: "A4",
        }),
      ];
      await handle.repository.replaceKnowledgeFactsFromTokens(
        TENANT_A,
        "src_r1",
        firstTokens,
      );

      let rows = await handle.repository.getKnowledgeFactsBySource(
        TENANT_A,
        "src_r1",
      );
      expect(rows).toHaveLength(3);

      // Reprocess: Heavy Duty Truck row was deleted from the spreadsheet.
      const secondTokens = [
        makeFactToken("t4", TENANT_A, {
          entityName: "Light Duty Truck",
          attribute: "Revenue",
          rawValue: "52000",
          numericValue: 52000,
          worksheetName: "Sales",
          rowNumber: 2,
          cellRef: "B2",
          entityCellRef: "A2",
        }),
        makeFactToken("t5", TENANT_A, {
          entityName: "Medium Duty Truck",
          attribute: "Revenue",
          rawValue: "77000",
          numericValue: 77000,
          worksheetName: "Sales",
          rowNumber: 3,
          cellRef: "B3",
          entityCellRef: "A3",
        }),
      ];
      await handle.repository.replaceKnowledgeFactsFromTokens(
        TENANT_A,
        "src_r1",
        secondTokens,
      );

      rows = await handle.repository.getKnowledgeFactsBySource(TENANT_A, "src_r1");
      expect(rows).toHaveLength(2);
      const entities = rows.map((r) => r.entityName).sort();
      expect(entities).toEqual(["Light Duty Truck", "Medium Duty Truck"]);
      // "Heavy Duty Truck" is gone.
      expect(rows.find((r) => r.entityName === "Heavy Duty Truck")).toBeUndefined();
    });

    it("R2. reprocessing with changed values updates the correct source facts", async () => {
      await handle.repository.persistDocument({
        source: makeSource("src_r2", TENANT_A),
        tokens: [],
        facts: null,
      });

      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "src_r2", [
        makeFactToken("t_r2a", TENANT_A, {
          entityName: "Truck X",
          attribute: "Revenue",
          rawValue: "100000",
          numericValue: 100000,
          worksheetName: "Sheet1",
          rowNumber: 2,
          cellRef: "B2",
          entityCellRef: "A2",
        }),
      ]);

      // Reprocess with updated value and updated cell reference.
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "src_r2", [
        makeFactToken("t_r2b", TENANT_A, {
          entityName: "Truck X",
          attribute: "Revenue",
          rawValue: "110000",
          numericValue: 110000,
          worksheetName: "Sheet1",
          rowNumber: 2,
          cellRef: "C2",   // column changed
          entityCellRef: "A2",
        }),
      ]);

      const rows = await handle.repository.getKnowledgeFactsBySource(TENANT_A, "src_r2");
      expect(rows).toHaveLength(1);
      expect(rows[0]!.rawValue).toBe("110000");
      expect(rows[0]!.numericValue).toBe(110000);
      expect(rows[0]!.cellRef).toBe("C2");
    });

    it("R3. facts from another source document remain intact after reprocessing", async () => {
      // Source A and Source B both have facts.
      await handle.repository.persistDocument({
        source: makeSource("src_r3a", TENANT_A, "fileA.xlsx"),
        tokens: [],
        facts: null,
      });
      await handle.repository.persistDocument({
        source: makeSource("src_r3b", TENANT_A, "fileB.xlsx"),
        tokens: [],
        facts: null,
      });

      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "src_r3a", [
        makeFactToken("t_r3a", TENANT_A, {
          entityName: "EntityA",
          attribute: "Revenue",
          rawValue: "1000",
          numericValue: 1000,
        }),
      ]);
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "src_r3b", [
        makeFactToken("t_r3b", TENANT_A, {
          entityName: "EntityB",
          attribute: "Revenue",
          rawValue: "2000",
          numericValue: 2000,
        }),
      ]);

      // Reprocess source A — source B's facts must survive untouched.
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "src_r3a", [
        makeFactToken("t_r3c", TENANT_A, {
          entityName: "EntityA",
          attribute: "Revenue",
          rawValue: "1500",
          numericValue: 1500,
        }),
      ]);

      const bFacts = await handle.repository.getKnowledgeFactsBySource(TENANT_A, "src_r3b");
      expect(bFacts).toHaveLength(1);
      expect(bFacts[0]!.rawValue).toBe("2000");
    });

    it("R4. facts belonging to another tenant remain intact after reprocessing", async () => {
      // TENANT_A and TENANT_B each have a source with facts.
      await handle.repository.persistDocument({
        source: makeSource("src_r4a", TENANT_A),
        tokens: [],
        facts: null,
      });
      await handle.repository.persistDocument({
        source: makeSource("src_r4b", TENANT_B),
        tokens: [],
        facts: null,
      });

      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "src_r4a", [
        makeFactToken("t_r4a", TENANT_A, {
          entityName: "Shared",
          attribute: "Cost",
          rawValue: "50",
          numericValue: 50,
        }),
      ]);
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_B, "src_r4b", [
        makeFactToken("t_r4b", TENANT_B, {
          entityName: "Shared",
          attribute: "Cost",
          rawValue: "60",
          numericValue: 60,
        }),
      ]);

      // Reprocess TENANT_A's source with new content.
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "src_r4a", [
        makeFactToken("t_r4c", TENANT_A, {
          entityName: "Shared",
          attribute: "Cost",
          rawValue: "55",
          numericValue: 55,
        }),
      ]);

      // TENANT_B's fact must be untouched.
      const bFacts = await handle.repository.getKnowledgeFacts(TENANT_B, "Shared", "Cost");
      expect(bFacts).toHaveLength(1);
      expect(bFacts[0]!.fact.rawValue).toBe("60");
    });

    it("R5. failed reprocessing does not leave partially deleted facts", async () => {
      await handle.repository.persistDocument({
        source: makeSource("src_r5", TENANT_A),
        tokens: [],
        facts: null,
      });

      // Initial ingest.
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "src_r5", [
        makeFactToken("t_r5a", TENANT_A, {
          entityName: "SafeEntity",
          attribute: "Revenue",
          rawValue: "9999",
          numericValue: 9999,
          worksheetName: "Sheet",
          rowNumber: 2,
          cellRef: "B2",
          entityCellRef: "A2",
        }),
      ]);

      let rows = await handle.repository.getKnowledgeFactsBySource(TENANT_A, "src_r5");
      expect(rows).toHaveLength(1);

      // Simulate a failed reprocess: a token with an attribute value that is a
      // very long string (triggers no DB error here, but we test atomicity by
      // attempting to call replaceKnowledgeFactsFromTokens on a source that
      // doesn't belong to the tenant — it must throw and leave facts intact).
      await expect(
        handle.repository.replaceKnowledgeFactsFromTokens(
          TENANT_B,         // wrong tenant
          "src_r5",         // source owned by TENANT_A
          [makeFactToken("t_r5b", TENANT_A, {
            entityName: "SafeEntity",
            attribute: "Revenue",
            rawValue: "0",
          })],
        ),
      ).rejects.toThrow("source not found for tenant");

      // Facts for the correct tenant must still be present.
      rows = await handle.repository.getKnowledgeFactsBySource(TENANT_A, "src_r5");
      expect(rows).toHaveLength(1);
      expect(rows[0]!.rawValue).toBe("9999");
    });

    it("R6. repeated processing is idempotent (no unnecessary duplicates)", async () => {
      await handle.repository.persistDocument({
        source: makeSource("src_r6", TENANT_A),
        tokens: [],
        facts: null,
      });

      const tokenList = [
        makeFactToken("t_r6a", TENANT_A, {
          entityName: "Idempotent",
          attribute: "Revenue",
          rawValue: "5000",
          numericValue: 5000,
          worksheetName: "Sheet",
          rowNumber: 2,
          cellRef: "B2",
          entityCellRef: "A2",
        }),
      ];

      // Run three times with identical tokens.
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "src_r6", tokenList);
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "src_r6", tokenList);
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "src_r6", tokenList);

      const rows = await handle.repository.getKnowledgeFactsBySource(TENANT_A, "src_r6");
      expect(rows).toHaveLength(1);
      expect(rows[0]!.rawValue).toBe("5000");
      // No self-conflicts.
      const conflicts = await handle.repository.getKnowledgeConflicts(TENANT_A);
      expect(conflicts.filter((c) => c.conflict.entityName === "Idempotent")).toHaveLength(0);
    });

    it("R7. conflict detection still works correctly after parameterisation fix", async () => {
      // Create two sources with contradictory values — this exercises
      // getKnowledgeConflicts with the inArray parameterised query.
      await handle.repository.persistDocument({
        source: makeSource("src_r7a", TENANT_A, "docA.xlsx"),
        tokens: [],
        facts: null,
      });
      await handle.repository.persistDocument({
        source: makeSource("src_r7b", TENANT_A, "docB.xlsx"),
        tokens: [],
        facts: null,
      });

      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "src_r7a", [
        makeFactToken("t_r7a", TENANT_A, {
          entityName: "Gamma Truck",
          attribute: "Revenue",
          rawValue: "300000",
          numericValue: 300000,
        }),
      ]);
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "src_r7b", [
        makeFactToken("t_r7b", TENANT_A, {
          entityName: "Gamma Truck",
          attribute: "Revenue",
          rawValue: "350000",
          numericValue: 350000,
        }),
      ]);

      // getKnowledgeConflicts now uses inArray — verify it still returns results.
      const conflicts = await handle.repository.getKnowledgeConflicts(TENANT_A);
      const gammaConflicts = conflicts.filter(
        (c) => c.conflict.entityName === "Gamma Truck",
      );
      expect(gammaConflicts).toHaveLength(1);
      expect(gammaConflicts[0]!.conflict.conflictType).toBe("CONTRADICTORY_VALUE");

      // Both fact rows must be hydrated correctly via inArray.
      const values = [
        gammaConflicts[0]!.factA.rawValue,
        gammaConflicts[0]!.factB.rawValue,
      ].sort();
      expect(values).toEqual(["300000", "350000"]);

      // Verify both facts carry exact source document provenance.
      const sourceIds = [
        gammaConflicts[0]!.factA.sourceId,
        gammaConflicts[0]!.factB.sourceId,
      ].sort();
      expect(sourceIds).toEqual(["src_r7a", "src_r7b"]);
    });

    it("R-extra. empty token list removes all facts for a source without touching others", async () => {
      await handle.repository.persistDocument({
        source: makeSource("src_re_a", TENANT_A, "a.xlsx"),
        tokens: [],
        facts: null,
      });
      await handle.repository.persistDocument({
        source: makeSource("src_re_b", TENANT_A, "b.xlsx"),
        tokens: [],
        facts: null,
      });

      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "src_re_a", [
        makeFactToken("t_re_a", TENANT_A, {
          entityName: "Entity A",
          attribute: "Cost",
          rawValue: "100",
        }),
      ]);
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "src_re_b", [
        makeFactToken("t_re_b", TENANT_A, {
          entityName: "Entity B",
          attribute: "Cost",
          rawValue: "200",
        }),
      ]);

      // Reprocess source A with no tokens (the spreadsheet is now empty).
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "src_re_a", []);

      const aFacts = await handle.repository.getKnowledgeFactsBySource(TENANT_A, "src_re_a");
      expect(aFacts).toHaveLength(0);

      // Source B untouched.
      const bFacts = await handle.repository.getKnowledgeFactsBySource(TENANT_A, "src_re_b");
      expect(bFacts).toHaveLength(1);
      expect(bFacts[0]!.rawValue).toBe("200");
    });
  },
);
