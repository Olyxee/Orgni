/**
 * Stage 4 — PostgreSQL integration tests for knowledge-aware retrieval.
 *
 * Tests that the retrieval path works end-to-end against a real database:
 *   - listTenantKnowledgeFacts returns the correct rows.
 *   - getLinkedFacts returns the full group with relationships.
 *   - gatherKnowledgeFacts finds the right facts for a question.
 *   - Facts from other tenants are never returned.
 *
 * Run with:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orgni_test \
 *     pnpm --filter @workspace/db test
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb, type DbHandle } from "../src/connect";
import { assertTestDatabaseUrl } from "../src/test-guard";
import { sources } from "../src/schema/documents";
import { knowledgeFacts, knowledgeConflicts } from "../src/schema/knowledge";

const DATABASE_URL = process.env["DATABASE_URL"];

let handle: DbHandle;

const TENANT_A = "s4_int_tenant_a";
const TENANT_B = "s4_int_tenant_b";

function makeSource(sourceId: string, tenantId: string, filename = "report.xlsx") {
  return {
    sourceId,
    tenantId,
    filename,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    checksum: `chk_s4_${sourceId}`,
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

describe.skipIf(!DATABASE_URL)(
  "Stage 4 — knowledge retrieval integration",
  () => {
    it("I1. listTenantKnowledgeFacts returns facts with filenames", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s4_i1", TENANT_A, "Concatenate And Filter.xlsx"),
        tokens: [],
        facts: null,
      });
      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_A,
        sourceId: "s4_i1",
        entityName: "Medium Duty Truck",
        attribute: "Revenue",
        rawValue: "4850000",
        numericValue: 4850000,
        worksheetName: "Sales Data",
        rowNumber: 2,
        cellRef: "D2",
        entityCellRef: "A2",
      });

      const rows = await handle.repository.listTenantKnowledgeFacts(TENANT_A, 100);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.fact.entityName).toBe("Medium Duty Truck");
      expect(rows[0]!.fact.rawValue).toBe("4850000");
      expect(rows[0]!.filename).toBe("Concatenate And Filter.xlsx");
    });

    it("I2. listTenantKnowledgeFacts is strictly tenant-scoped", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s4_i2a", TENANT_A),
        tokens: [],
        facts: null,
      });
      await handle.repository.persistDocument({
        source: makeSource("s4_i2b", TENANT_B),
        tokens: [],
        facts: null,
      });

      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_A,
        sourceId: "s4_i2a",
        entityName: "Entity A",
        attribute: "Revenue",
        rawValue: "111",
      });
      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_B,
        sourceId: "s4_i2b",
        entityName: "Entity B",
        attribute: "Revenue",
        rawValue: "222",
      });

      const rowsA = await handle.repository.listTenantKnowledgeFacts(TENANT_A, 100);
      expect(rowsA.every((r) => r.fact.tenantId === TENANT_A)).toBe(true);
      expect(rowsA.some((r) => r.fact.entityName === "Entity B")).toBe(false);

      const rowsB = await handle.repository.listTenantKnowledgeFacts(TENANT_B, 100);
      expect(rowsB.every((r) => r.fact.tenantId === TENANT_B)).toBe(true);
      expect(rowsB.some((r) => r.fact.entityName === "Entity A")).toBe(false);
    });

    it("I3. getLinkedFacts returns full provenance for a known entity+attribute", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s4_i3", TENANT_A, "Revenue Report FY2026.xlsx"),
        tokens: [],
        facts: null,
      });
      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_A,
        sourceId: "s4_i3",
        entityName: "Heavy Duty Truck",
        attribute: "Revenue",
        rawValue: "120000",
        numericValue: 120000,
        worksheetName: "FY2026 Actual",
        rowNumber: 4,
        cellRef: "B4",
        entityCellRef: "A4",
      });

      const group = await handle.repository.getLinkedFacts(
        TENANT_A, "Heavy Duty Truck", "Revenue",
      );
      expect(group.facts).toHaveLength(1);
      const fact = group.facts[0]!.fact;
      expect(fact.worksheetName).toBe("FY2026 Actual");
      expect(fact.rowNumber).toBe(4);
      expect(fact.cellRef).toBe("B4");
      expect(fact.entityCellRef).toBe("A4");
      expect(fact.reportingDate).toBe("2026-01-01"); // inferred from "FY2026 Actual"
      expect(group.facts[0]!.filename).toBe("Revenue Report FY2026.xlsx");
    });

    it("I4. retrieval finds facts matching entity+attribute question", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s4_i4", TENANT_A, "Concatenate And Filter.xlsx"),
        tokens: [],
        facts: null,
      });
      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_A,
        sourceId: "s4_i4",
        entityName: "Medium Duty Truck",
        attribute: "Revenue",
        rawValue: "4850000",
        numericValue: 4850000,
        worksheetName: "Sales",
        rowNumber: 2,
        cellRef: "D2",
        entityCellRef: "A2",
      });

      // Import the retrieval function here — it uses the repository pattern.
      const { gatherKnowledgeFacts } = await import(
        "../../artifacts/api-server/src/product/knowledge-retrieval.js"
      );

      const evidence = await gatherKnowledgeFacts(
        handle.repository,
        TENANT_A,
        "What is the revenue for Medium Duty Truck?",
      );

      expect(evidence.hasEvidence).toBe(true);
      expect(evidence.items).toHaveLength(1);
      expect(evidence.items[0]!.entityName).toBe("Medium Duty Truck");
      expect(evidence.items[0]!.numericValue).toBe(4850000);
      expect(evidence.items[0]!.sourceDocument).toBe("Concatenate And Filter.xlsx");
      expect(evidence.items[0]!.cellRef).toBe("D2");
      expect(evidence.items[0]!.citation).toContain("Concatenate And Filter.xlsx");
      expect(evidence.items[0]!.citation).toContain("Sales");
      expect(evidence.items[0]!.citation).toContain("Row 2");
      expect(evidence.items[0]!.citation).toContain("D2");
    });

    it("I5. retrieval returns no evidence when tenant has no facts", async () => {
      const { gatherKnowledgeFacts } = await import(
        "../../artifacts/api-server/src/product/knowledge-retrieval.js"
      );

      const evidence = await gatherKnowledgeFacts(
        handle.repository,
        TENANT_A,
        "What is the revenue for Medium Duty Truck?",
      );

      expect(evidence.hasEvidence).toBe(false);
      expect(evidence.items).toHaveLength(0);
    });

    it("I6. retrieval never returns another tenant's facts", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s4_i6b", TENANT_B),
        tokens: [],
        facts: null,
      });
      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_B,
        sourceId: "s4_i6b",
        entityName: "Medium Duty Truck",
        attribute: "Revenue",
        rawValue: "9999999",
        numericValue: 9999999,
      });

      const { gatherKnowledgeFacts } = await import(
        "../../artifacts/api-server/src/product/knowledge-retrieval.js"
      );

      // TENANT_A has no facts; TENANT_B's facts must not appear.
      const evidence = await gatherKnowledgeFacts(
        handle.repository,
        TENANT_A,
        "What is the revenue for Medium Duty Truck?",
      );

      expect(evidence.hasEvidence).toBe(false);
      expect(evidence.items.some((i) => i.rawValue === "9999999")).toBe(false);
    });

    it("I7. conflict is detected and surfaced in evidence", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s4_i7a", TENANT_A, "docA.xlsx"),
        tokens: [],
        facts: null,
      });
      await handle.repository.persistDocument({
        source: makeSource("s4_i7b", TENANT_A, "docB.xlsx"),
        tokens: [],
        facts: null,
      });

      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_A,
        sourceId: "s4_i7a",
        entityName: "Medium Duty Truck",
        attribute: "Revenue",
        rawValue: "4850000",
        numericValue: 4850000,
        worksheetName: "Sales",
      });
      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_A,
        sourceId: "s4_i7b",
        entityName: "Medium Duty Truck",
        attribute: "Revenue",
        rawValue: "5100000",
        numericValue: 5100000,
        worksheetName: "Sales",
      });

      const { gatherKnowledgeFacts } = await import(
        "../../artifacts/api-server/src/product/knowledge-retrieval.js"
      );

      const evidence = await gatherKnowledgeFacts(
        handle.repository,
        TENANT_A,
        "What is the revenue for Medium Duty Truck?",
      );

      expect(evidence.hasEvidence).toBe(true);
      expect(evidence.hasConflicts).toBe(true);
      expect(evidence.items).toHaveLength(2);

      // Both values present — neither silently dropped.
      const values = evidence.items.map((i) => i.rawValue).sort();
      expect(values).toEqual(["4850000", "5100000"]);
    });

    it("I8. reporting date is preserved and surfaced in context lines", async () => {
      await handle.repository.persistDocument({
        source: makeSource("s4_i8", TENANT_A, "FY2026 Revenue.xlsx"),
        tokens: [],
        facts: null,
      });
      await handle.repository.saveKnowledgeFact({
        tenantId: TENANT_A,
        sourceId: "s4_i8",
        entityName: "Light Duty Truck",
        attribute: "Revenue",
        rawValue: "50000",
        numericValue: 50000,
        worksheetName: "FY2026 Q1",
      });

      const { gatherKnowledgeFacts } = await import(
        "../../artifacts/api-server/src/product/knowledge-retrieval.js"
      );

      const evidence = await gatherKnowledgeFacts(
        handle.repository,
        TENANT_A,
        "Light Duty Truck Revenue",
      );

      expect(evidence.items[0]!.reportingDate).toBe("2026-01-01");
      expect(evidence.contextLines[0]).toContain("2026-01-01");
    });
  },
);
