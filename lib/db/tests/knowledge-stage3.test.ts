/**
 * Stage 3 integration tests: cross-document knowledge linking, conflict
 * classification, reporting dates, and batched processing.
 *
 * Run against a real PostgreSQL database:
 *
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orgni_test \
 *     pnpm --filter @workspace/db test
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb, type DbHandle } from "../src/connect";
import { assertTestDatabaseUrl } from "../src/test-guard";
import { sources } from "../src/schema/documents";
import { knowledgeFacts, knowledgeConflicts } from "../src/schema/knowledge";
import { inferReportingDate } from "../src/reporting-date";

const DATABASE_URL = process.env["DATABASE_URL"];

let handle: DbHandle;

const TENANT_A = "s3_tenant_a";
const TENANT_B = "s3_tenant_b";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeSource(sourceId: string, tenantId: string, filename = "report.xlsx") {
  return {
    sourceId,
    tenantId,
    filename,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    checksum: `chk_s3_${sourceId}`,
    byteSize: 1024,
    state: "COMPLETED" as const,
    documentType: null,
    confidence: 0.82,
    sourceAcl: [],
    warnings: [],
    errors: [],
    uploadedAt: new Date("2026-11-01T00:00:00Z"),
  };
}

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
      ...(opts.numericValue !== undefined ? { numericValue: opts.numericValue } : {}),
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
    actionScope: [],
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
  await handle.db.delete(knowledgeConflicts);
  await handle.db.delete(knowledgeFacts);
  await handle.db.delete(sources);
});

// ── Reporting-date inference (unit tests — no DB) ─────────────────────────────

describe("inferReportingDate — reporting date extraction", () => {
  it("extracts an explicit ISO date from the worksheet name", () => {
    expect(inferReportingDate("2026-07-01 Actuals")).toBe("2026-07-01");
    expect(inferReportingDate("Pricing 2025-01-01")).toBe("2025-01-01");
  });

  it("infers FY year with quarter", () => {
    expect(inferReportingDate("FY2026 Q1 Revenue")).toBe("2026-01-01");
    expect(inferReportingDate("FY2026 Q2")).toBe("2026-04-01");
    expect(inferReportingDate("FY2026 Q3")).toBe("2026-07-01");
    expect(inferReportingDate("FY2026 Q4")).toBe("2026-10-01");
  });

  it("infers FY year without quarter to January 1", () => {
    expect(inferReportingDate("FY2025 Actual")).toBe("2025-01-01");
    expect(inferReportingDate("FY2026 Budget")).toBe("2026-01-01");
  });

  it("handles two-digit fiscal year", () => {
    expect(inferReportingDate("FY25 Q2")).toBe("2025-04-01");
    expect(inferReportingDate("FY26")).toBe("2026-01-01");
  });

  it("infers calendar year with quarter", () => {
    expect(inferReportingDate("2026 Q2")).toBe("2026-04-01");
    expect(inferReportingDate("Q3 2025")).toBe("2025-07-01");
  });

  it("infers month and year", () => {
    expect(inferReportingDate("July 2026")).toBe("2026-07-01");
    expect(inferReportingDate("2026 July")).toBe("2026-07-01");
    expect(inferReportingDate("Jan 2026")).toBe("2026-01-01");
  });

  it("infers bare year to January 1", () => {
    expect(inferReportingDate("2026 Budget")).toBe("2026-01-01");
    expect(inferReportingDate("Revenue 2025")).toBe("2025-01-01");
  });

  it("returns null for names with no date signal", () => {
    expect(inferReportingDate("Sales Data")).toBeNull();
    expect(inferReportingDate("Sheet1")).toBeNull();
    expect(inferReportingDate("Revenue Summary")).toBeNull();
    expect(inferReportingDate("")).toBeNull();
    expect(inferReportingDate(null)).toBeNull();
  });

  it("returns null for dates before 1900 or after 2100", () => {
    // These should not produce a year outside the valid range.
    expect(inferReportingDate("1850 Budget")).toBeNull();
  });
});

// ── Integration tests ────────────────────────────────────────────────────────

describe.skipIf(!DATABASE_URL)(
  "Stage 3 — cross-document linking and conflict classification",
  () => {
    // ── Test 1: Duplicate evidence ─────────────────────────────────────────

    it("T1. same fact from two documents is recognised as DUPLICATE_VALUE", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s3_t1a", TENANT_A, "docA.xlsx"),
        tokens: [],
        facts: null,
      });
      await handle.repository.persistDocument({
        source: makeSource("s3_t1b", TENANT_A, "docB.xlsx"),
        tokens: [],
        facts: null,
      });

      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "s3_t1a", [
        makeFactToken("tk1a", TENANT_A, {
          entityName: "Medium Duty Truck",
          attribute: "Revenue",
          rawValue: "4850000",
          numericValue: 4850000,
          worksheetName: "Sales",
          rowNumber: 2,
          cellRef: "B2",
          entityCellRef: "A2",
        }),
      ]);
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "s3_t1b", [
        makeFactToken("tk1b", TENANT_A, {
          entityName: "Medium Duty Truck",
          attribute: "Revenue",
          rawValue: "4850000",   // same value
          numericValue: 4850000,
          worksheetName: "Sales",
          rowNumber: 2,
          cellRef: "B2",
          entityCellRef: "A2",
        }),
      ]);

      const group = await handle.repository.getLinkedFacts(
        TENANT_A, "Medium Duty Truck", "Revenue",
      );

      expect(group.facts).toHaveLength(2);
      expect(group.facts.every((f) => f.relationship === "DUPLICATE_VALUE")).toBe(true);
      expect(group.conflicts).toHaveLength(1);
      expect(group.conflicts[0]!.conflictType).toBe("DUPLICATE_VALUE");

      // Both original facts and their source info are preserved.
      const sourceIds = group.facts.map((f) => f.fact.sourceId).sort();
      expect(sourceIds).toEqual(["s3_t1a", "s3_t1b"]);
    });

    // ── Test 2: Contradictory evidence ────────────────────────────────────

    it("T2. different values for same entity+attribute are CONTRADICTORY_VALUE when no dates", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s3_t2a", TENANT_A, "fileA.xlsx"),
        tokens: [],
        facts: null,
      });
      await handle.repository.persistDocument({
        source: makeSource("s3_t2b", TENANT_A, "fileB.xlsx"),
        tokens: [],
        facts: null,
      });

      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "s3_t2a", [
        makeFactToken("tk2a", TENANT_A, {
          entityName: "Medium Duty Truck",
          attribute: "Actual Revenue",
          rawValue: "4850000",
          numericValue: 4850000,
          worksheetName: "Sales Data",   // no date in name
        }),
      ]);
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "s3_t2b", [
        makeFactToken("tk2b", TENANT_A, {
          entityName: "Medium Duty Truck",
          attribute: "Actual Revenue",
          rawValue: "5100000",
          numericValue: 5100000,
          worksheetName: "Sales Data",   // no date in name
        }),
      ]);

      const group = await handle.repository.getLinkedFacts(
        TENANT_A, "Medium Duty Truck", "Actual Revenue",
      );

      expect(group.facts).toHaveLength(2);
      expect(group.facts.every((f) => f.relationship === "CONTRADICTORY_VALUE")).toBe(true);
      expect(group.conflicts[0]!.conflictType).toBe("CONTRADICTORY_VALUE");

      // Neither fact is deleted or overwritten.
      const values = group.facts.map((f) => f.fact.rawValue).sort();
      expect(values).toEqual(["4850000", "5100000"]);
    });

    // ── Test 3: Reporting period ordering ─────────────────────────────────

    it("T3. older value is POTENTIALLY_OUTDATED when reporting dates differ", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s3_t3a", TENANT_A, "fy25.xlsx"),
        tokens: [],
        facts: null,
      });
      await handle.repository.persistDocument({
        source: makeSource("s3_t3b", TENANT_A, "fy26.xlsx"),
        tokens: [],
        facts: null,
      });

      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "s3_t3a", [
        makeFactToken("tk3a", TENANT_A, {
          entityName: "Medium Duty Truck",
          attribute: "Revenue",
          rawValue: "4200000",
          numericValue: 4200000,
          worksheetName: "FY2025 Actual",   // → 2025-01-01
        }),
      ]);
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "s3_t3b", [
        makeFactToken("tk3b", TENANT_A, {
          entityName: "Medium Duty Truck",
          attribute: "Revenue",
          rawValue: "4850000",
          numericValue: 4850000,
          worksheetName: "FY2026 Actual",   // → 2026-01-01
        }),
      ]);

      // Verify reporting dates were inferred and stored.
      const all = await handle.repository.getKnowledgeFacts(
        TENANT_A, "Medium Duty Truck", "Revenue",
      );
      const dateMap = Object.fromEntries(
        all.map((r) => [r.fact.rawValue, r.fact.reportingDate]),
      );
      expect(dateMap["4200000"]).toBe("2025-01-01");
      expect(dateMap["4850000"]).toBe("2026-01-01");

      // Check linked-facts classification.
      const group = await handle.repository.getLinkedFacts(
        TENANT_A, "Medium Duty Truck", "Revenue",
      );
      expect(group.facts).toHaveLength(2);

      const fy25 = group.facts.find((f) => f.fact.rawValue === "4200000")!;
      const fy26 = group.facts.find((f) => f.fact.rawValue === "4850000")!;
      expect(fy25.relationship).toBe("POTENTIALLY_OUTDATED");
      expect(fy26.relationship).toBe("CURRENT_VALUE");

      // The conflict record carries both reporting dates.
      expect(group.conflicts).toHaveLength(1);
      const conflict = group.conflicts[0]!;
      expect(conflict.conflictType).toBe("POTENTIALLY_OUTDATED");
      const conflictDates = [conflict.reportingDateA, conflict.reportingDateB].sort();
      expect(conflictDates).toEqual(["2025-01-01", "2026-01-01"]);
    });

    // ── Test 4: Missing reporting dates ───────────────────────────────────

    it("T4. missing reporting dates do not produce invented chronology", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s3_t4a", TENANT_A, "a.xlsx"),
        tokens: [],
        facts: null,
      });
      await handle.repository.persistDocument({
        source: makeSource("s3_t4b", TENANT_A, "b.xlsx"),
        tokens: [],
        facts: null,
      });

      // Source A has a date; source B does not.
      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_A,
        sourceId: "s3_t4a",
        entityName: "Widget",
        attribute: "Price",
        rawValue: "100",
        numericValue: 100,
        worksheetName: "FY2026 Budget",
      });
      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_A,
        sourceId: "s3_t4b",
        entityName: "Widget",
        attribute: "Price",
        rawValue: "150",
        numericValue: 150,
        worksheetName: "Sales Data",   // no date
      });

      const all = await handle.repository.getKnowledgeFacts(TENANT_A, "Widget", "Price");
      const noDate = all.find((r) => r.fact.rawValue === "150")!;
      expect(noDate.fact.reportingDate).toBeNull();

      // Because one fact has no date, we cannot establish chronological order.
      const group = await handle.repository.getLinkedFacts(TENANT_A, "Widget", "Price");
      // Both facts are classified without assuming temporal ordering.
      const relationships = group.facts.map((f) => f.relationship);
      expect(relationships).not.toContain("POTENTIALLY_OUTDATED");
      expect(relationships).not.toContain("CURRENT_VALUE");
      // Both should be CONTRADICTORY_VALUE since only one has a date.
      expect(relationships.every((r) => r === "CONTRADICTORY_VALUE")).toBe(true);
      // The conflict record is CONTRADICTORY_VALUE (not POTENTIALLY_OUTDATED).
      expect(group.conflicts[0]!.conflictType).toBe("CONTRADICTORY_VALUE");
    });

    // ── Test 5: Source references remain available ─────────────────────────

    it("T5. all original source references remain available after linking", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s3_t5a", TENANT_A, "Concatenate And Filter.xlsx"),
        tokens: [],
        facts: null,
      });
      await handle.repository.persistDocument({
        source: makeSource("s3_t5b", TENANT_A, "Revenue Report FY2026.xlsx"),
        tokens: [],
        facts: null,
      });

      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_A,
        sourceId: "s3_t5a",
        entityName: "Medium Duty Truck",
        attribute: "Revenue",
        rawValue: "4850000",
        numericValue: 4850000,
        worksheetName: "Sales",
        rowNumber: 5,
        cellRef: "D5",
        entityCellRef: "A5",
      });
      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_A,
        sourceId: "s3_t5b",
        entityName: "Medium Duty Truck",
        attribute: "Revenue",
        rawValue: "5100000",
        numericValue: 5100000,
        worksheetName: "FY2026 Revenue",
        rowNumber: 3,
        cellRef: "C3",
        entityCellRef: "A3",
      });

      const group = await handle.repository.getLinkedFacts(
        TENANT_A, "Medium Duty Truck", "Revenue",
      );

      // Both filenames are present.
      const filenames = group.facts.map((f) => f.filename).sort();
      expect(filenames).toContain("Concatenate And Filter.xlsx");
      expect(filenames).toContain("Revenue Report FY2026.xlsx");

      // All provenance fields are intact.
      const factA = group.facts.find((f) => f.fact.sourceId === "s3_t5a")!.fact;
      expect(factA.worksheetName).toBe("Sales");
      expect(factA.rowNumber).toBe(5);
      expect(factA.cellRef).toBe("D5");
      expect(factA.entityCellRef).toBe("A5");

      const factB = group.facts.find((f) => f.fact.sourceId === "s3_t5b")!.fact;
      expect(factB.worksheetName).toBe("FY2026 Revenue");
      expect(factB.rowNumber).toBe(3);
      expect(factB.cellRef).toBe("C3");
      expect(factB.entityCellRef).toBe("A3");
    });

    // ── Test 6: Tenant isolation ───────────────────────────────────────────

    it("T6. facts from different tenants never become related", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s3_t6a", TENANT_A),
        tokens: [],
        facts: null,
      });
      await handle.repository.persistDocument({
        source: makeSource("s3_t6b", TENANT_B),
        tokens: [],
        facts: null,
      });

      // Both tenants have the same entity+attribute but different values.
      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_A,
        sourceId: "s3_t6a",
        entityName: "Shared Entity",
        attribute: "Revenue",
        rawValue: "111",
        worksheetName: "FY2026",
      });
      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_B,
        sourceId: "s3_t6b",
        entityName: "Shared Entity",
        attribute: "Revenue",
        rawValue: "222",
        worksheetName: "FY2026",
      });

      // Tenant A's linked facts should contain only their own fact.
      const groupA = await handle.repository.getLinkedFacts(
        TENANT_A, "Shared Entity", "Revenue",
      );
      expect(groupA.facts).toHaveLength(1);
      expect(groupA.facts[0]!.fact.rawValue).toBe("111");
      expect(groupA.facts[0]!.relationship).toBe("SOLE_SOURCE");
      expect(groupA.conflicts).toHaveLength(0);

      // Tenant B's linked facts should contain only their own fact.
      const groupB = await handle.repository.getLinkedFacts(
        TENANT_B, "Shared Entity", "Revenue",
      );
      expect(groupB.facts).toHaveLength(1);
      expect(groupB.facts[0]!.fact.rawValue).toBe("222");
      expect(groupB.facts[0]!.relationship).toBe("SOLE_SOURCE");
      expect(groupB.conflicts).toHaveLength(0);
    });

    // ── Test 7: Reprocessing idempotency ──────────────────────────────────

    it("T7. reprocessing does not create duplicate conflict records", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s3_t7a", TENANT_A, "a.xlsx"),
        tokens: [],
        facts: null,
      });
      await handle.repository.persistDocument({
        source: makeSource("s3_t7b", TENANT_A, "b.xlsx"),
        tokens: [],
        facts: null,
      });

      const tokenListA = [
        makeFactToken("tk_t7a", TENANT_A, {
          entityName: "Gamma",
          attribute: "Cost",
          rawValue: "50",
          worksheetName: "FY2026",
        }),
      ];
      const tokenListB = [
        makeFactToken("tk_t7b", TENANT_A, {
          entityName: "Gamma",
          attribute: "Cost",
          rawValue: "60",
          worksheetName: "FY2026",
        }),
      ];

      // First ingest of both documents.
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "s3_t7a", tokenListA);
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "s3_t7b", tokenListB);

      let conflicts = await handle.repository.getKnowledgeConflicts(TENANT_A);
      const beforeCount = conflicts.filter((c) => c.conflict.entityName === "Gamma").length;
      expect(beforeCount).toBe(1);

      // Reprocess source A with the same tokens.
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "s3_t7a", tokenListA);

      conflicts = await handle.repository.getKnowledgeConflicts(TENANT_A);
      const afterCount = conflicts.filter((c) => c.conflict.entityName === "Gamma").length;
      expect(afterCount).toBe(1);   // still exactly one
    });

    // ── Test 8: Batched processing correctness ────────────────────────────

    it("T8. batched conflict detection correctly handles multiple entities in one call", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s3_t8a", TENANT_A, "a.xlsx"),
        tokens: [],
        facts: null,
      });
      await handle.repository.persistDocument({
        source: makeSource("s3_t8b", TENANT_A, "b.xlsx"),
        tokens: [],
        facts: null,
      });

      // Source B has facts for three entities.
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "s3_t8b", [
        makeFactToken("tk_t8b1", TENANT_A, {
          entityName: "Light Duty Truck",
          attribute: "Revenue",
          rawValue: "50000",
          worksheetName: "FY2026",
        }),
        makeFactToken("tk_t8b2", TENANT_A, {
          entityName: "Medium Duty Truck",
          attribute: "Revenue",
          rawValue: "75000",
          worksheetName: "FY2026",
        }),
        makeFactToken("tk_t8b3", TENANT_A, {
          entityName: "Heavy Duty Truck",
          attribute: "Revenue",
          rawValue: "120000",
          worksheetName: "FY2026",
        }),
      ]);

      // Source A — batched call with three entities, conflicting values.
      await handle.repository.replaceKnowledgeFactsFromTokens(TENANT_A, "s3_t8a", [
        makeFactToken("tk_t8a1", TENANT_A, {
          entityName: "Light Duty Truck",
          attribute: "Revenue",
          rawValue: "52000",   // different from B
          worksheetName: "FY2025",
        }),
        makeFactToken("tk_t8a2", TENANT_A, {
          entityName: "Medium Duty Truck",
          attribute: "Revenue",
          rawValue: "75000",   // same as B
          worksheetName: "FY2025",
        }),
        makeFactToken("tk_t8a3", TENANT_A, {
          entityName: "Heavy Duty Truck",
          attribute: "Revenue",
          rawValue: "130000",  // different from B
          worksheetName: "FY2025",
        }),
      ]);

      const conflicts = await handle.repository.getKnowledgeConflicts(TENANT_A);

      // Light Duty Truck: different values, FY2025 < FY2026 → POTENTIALLY_OUTDATED
      const ldtConflict = conflicts.find(
        (c) => c.conflict.entityName === "Light Duty Truck",
      );
      expect(ldtConflict).toBeDefined();
      expect(ldtConflict!.conflict.conflictType).toBe("POTENTIALLY_OUTDATED");

      // Medium Duty Truck: same value → DUPLICATE_VALUE
      const mdtConflict = conflicts.find(
        (c) => c.conflict.entityName === "Medium Duty Truck",
      );
      expect(mdtConflict).toBeDefined();
      expect(mdtConflict!.conflict.conflictType).toBe("DUPLICATE_VALUE");

      // Heavy Duty Truck: different values, FY2025 < FY2026 → POTENTIALLY_OUTDATED
      const hdtConflict = conflicts.find(
        (c) => c.conflict.entityName === "Heavy Duty Truck",
      );
      expect(hdtConflict).toBeDefined();
      expect(hdtConflict!.conflict.conflictType).toBe("POTENTIALLY_OUTDATED");

      // All three entities produced exactly one conflict record each.
      expect(conflicts).toHaveLength(3);

      // Check provenance is complete for each conflict.
      for (const { conflict, factA, factB } of conflicts) {
        expect(conflict.tenantId).toBe(TENANT_A);
        expect(factA.tenantId).toBe(TENANT_A);
        expect(factB.tenantId).toBe(TENANT_A);
        expect(factA.sourceId).not.toBe(factB.sourceId);
      }
    });

    // ── Test 9: Same reporting period, different values ───────────────────

    it("T9. same reporting period with different values is CONTRADICTORY_VALUE", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s3_t9a", TENANT_A, "version1.xlsx"),
        tokens: [],
        facts: null,
      });
      await handle.repository.persistDocument({
        source: makeSource("s3_t9b", TENANT_A, "version2.xlsx"),
        tokens: [],
        facts: null,
      });

      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_A,
        sourceId: "s3_t9a",
        entityName: "Alpha",
        attribute: "Cost",
        rawValue: "100",
        worksheetName: "FY2026 Q1",   // → 2026-01-01
      });
      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_A,
        sourceId: "s3_t9b",
        entityName: "Alpha",
        attribute: "Cost",
        rawValue: "120",
        worksheetName: "FY2026 Q1",   // → 2026-01-01 (same period)
      });

      const group = await handle.repository.getLinkedFacts(TENANT_A, "Alpha", "Cost");
      // Equal reporting dates + different values → CONTRADICTORY_VALUE.
      expect(group.conflicts[0]!.conflictType).toBe("CONTRADICTORY_VALUE");
      expect(group.facts.every((f) => f.relationship === "CONTRADICTORY_VALUE")).toBe(true);
    });

    // ── Test 10: SOLE_SOURCE when only one fact exists ─────────────────────

    it("T10. single fact is classified SOLE_SOURCE with no conflicts", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s3_t10", TENANT_A),
        tokens: [],
        facts: null,
      });
      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_A,
        sourceId: "s3_t10",
        entityName: "Unique Entity",
        attribute: "Revenue",
        rawValue: "999",
        worksheetName: "FY2026",
      });

      const group = await handle.repository.getLinkedFacts(
        TENANT_A, "Unique Entity", "Revenue",
      );
      expect(group.facts).toHaveLength(1);
      expect(group.facts[0]!.relationship).toBe("SOLE_SOURCE");
      expect(group.conflicts).toHaveLength(0);
    });

    // ── Test 11: Conflict record stores reporting dates ──────────────────

    it("T11. conflict record stores both reporting dates for reviewer context", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s3_t11a", TENANT_A),
        tokens: [],
        facts: null,
      });
      await handle.repository.persistDocument({
        source: makeSource("s3_t11b", TENANT_A),
        tokens: [],
        facts: null,
      });

      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_A,
        sourceId: "s3_t11a",
        entityName: "Beta",
        attribute: "Qty",
        rawValue: "10",
        worksheetName: "FY2025 Q4",
        reportingDate: "2025-10-01",  // explicit override
      });
      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_A,
        sourceId: "s3_t11b",
        entityName: "Beta",
        attribute: "Qty",
        rawValue: "15",
        worksheetName: "FY2026 Q1",
        reportingDate: "2026-01-01",
      });

      const conflicts = await handle.repository.getKnowledgeConflicts(TENANT_A);
      const betaConflict = conflicts.find((c) => c.conflict.entityName === "Beta")!;
      expect(betaConflict.conflict.conflictType).toBe("POTENTIALLY_OUTDATED");

      const dates = [
        betaConflict.conflict.reportingDateA,
        betaConflict.conflict.reportingDateB,
      ].sort();
      expect(dates).toEqual(["2025-10-01", "2026-01-01"]);
    });
  },
);
