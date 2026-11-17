/**
 * Tests for SPREADSHEET_FACT token extraction.
 *
 * These tests cover:
 *  1  Worksheet name parsed from text prefix
 *  2  Row number parsed from text prefix
 *  3  Cell reference construction from column position
 *  4  Entity column identification
 *  5  Attribute column identification
 *  6  Multiple entities (multiple data rows)
 *  7  Multiple attributes (multiple value columns)
 *  8  Multiple worksheets
 *  9  Numeric value preservation
 * 10  Empty / missing values — no fact emitted
 * 11  Backward compatibility — SPREADSHEET_ROW tokens still produced
 * 12  Non-XLSX files do not produce SPREADSHEET_FACT tokens
 * 13  Token persistence fields — verify every structured field survives
 *     round-trip through JSON serialisation (the same path as PostgreSQL JSONB)
 */

import { describe, expect, it } from "vitest";

import { tokenizeEnvelope } from "../src/phase1/index.js";
import type { NormalizedEnvelope } from "../src/envelope/types.js";
import type { OrganizationalToken } from "@workspace/contracts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal NormalizedEnvelope for an XLSX file from plain text that
 * simulates the output of the Python _extract_xlsx function.
 *
 * The Python function now prefixes each data row with:
 *   [<worksheet_name> | row <N>] <column-labelled detail>
 *
 * This helper constructs that format directly so the TypeScript tests do not
 * depend on the Python service being available.
 */
function xlsxEnvelope(
  textLines: string[],
  filename = "Report.xlsx",
): NormalizedEnvelope {
  return {
    source_id: "src_test_xlsx",
    source_type: "UPLOAD",
    document_type: "UNKNOWN",
    content: { text: textLines.join("\n"), language: "en" },
    extracted_fields: {},
    tables: [],
    metadata: {
      filename,
      mime_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      checksum: "deadbeef",
      tenant_id: "tenant_a",
    },
    evidence_locations: [],
    confidence: 0.65,
    warnings: ["document_type_unknown"],
    schema_version: "0.1.0",
    extraction_status: "LOW_CONFIDENCE",
  };
}

/** Extract only SPREADSHEET_FACT tokens from a tokenization result. */
function factTokens(result: ReturnType<typeof tokenizeEnvelope>): OrganizationalToken[] {
  return result.tokens.filter((t) => t.eventType === "SPREADSHEET_FACT");
}

/** Extract only SPREADSHEET_ROW tokens. */
function rowTokens(result: ReturnType<typeof tokenizeEnvelope>): OrganizationalToken[] {
  return result.tokens.filter((t) => t.eventType === "SPREADSHEET_ROW");
}

/** Access scalarValue as a typed record. */
function sv(token: OrganizationalToken): Record<string, unknown> {
  return token.scalarValue as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 1. Worksheet name parsed from text prefix
// ---------------------------------------------------------------------------

describe("SPREADSHEET_FACT — worksheet name", () => {
  it("extracts worksheet name from the [name | row N] prefix", () => {
    const env = xlsxEnvelope([
      "[Revenue Summary | row 2] Product: Medium Duty Truck; Revenue: 4850000",
    ]);
    const result = tokenizeEnvelope(env);
    const facts = factTokens(result);
    expect(facts.length).toBeGreaterThan(0);
    for (const fact of facts) {
      expect(sv(fact).worksheetName).toBe("Revenue Summary");
    }
  });

  it("handles worksheet names with spaces and mixed case", () => {
    const env = xlsxEnvelope([
      "[Cost Breakdown Q1 2026 | row 3] Name: Alpha Corp; Amount: 12000",
    ]);
    const result = tokenizeEnvelope(env);
    const facts = factTokens(result);
    expect(facts.length).toBeGreaterThan(0);
    expect(sv(facts[0]!).worksheetName).toBe("Cost Breakdown Q1 2026");
  });

  it("produces empty string for worksheet name when prefix is absent", () => {
    // Rows without the prefix (e.g. CSV-like text) should still extract if
    // possible, but worksheet name will be empty.
    const env = xlsxEnvelope(["Product: Widget; Revenue: 1000"]);
    const result = tokenizeEnvelope(env);
    const facts = factTokens(result);
    for (const fact of facts) {
      expect(typeof sv(fact).worksheetName).toBe("string");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Row number
// ---------------------------------------------------------------------------

describe("SPREADSHEET_FACT — row number", () => {
  it("extracts the spreadsheet row number from the prefix", () => {
    const env = xlsxEnvelope([
      "[Sales | row 7] Product: Heavy Duty Truck; Revenue: 120000",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    for (const fact of facts) {
      expect(sv(fact).rowNumber).toBe(7);
    }
  });

  it("rowNumber is 0 when no prefix is present", () => {
    const env = xlsxEnvelope(["Product: Widget; Revenue: 500"]);
    const facts = factTokens(tokenizeEnvelope(env));
    for (const fact of facts) {
      expect(sv(fact).rowNumber).toBe(0);
    }
  });

  it("different rows carry their own row numbers", () => {
    const env = xlsxEnvelope([
      "[Sheet | row 2] Product: Truck A; Revenue: 1000",
      "[Sheet | row 3] Product: Truck B; Revenue: 2000",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    const rowNumbers = [...new Set(facts.map((f) => sv(f).rowNumber))].sort();
    expect(rowNumbers).toContain(2);
    expect(rowNumbers).toContain(3);
  });
});

// ---------------------------------------------------------------------------
// 3. Cell reference
// ---------------------------------------------------------------------------

describe("SPREADSHEET_FACT — cell reference", () => {
  it("constructs cellRef from column position and row number", () => {
    // Product is column index 0 → A; Revenue is column index 1 → B.
    // Row number is 4.
    const env = xlsxEnvelope([
      "[Sales | row 4] Product: Truck; Revenue: 9000",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    // The Revenue fact should have cellRef B4 (column index 1, row 4).
    const revenueFact = facts.find((f) => sv(f).attribute === "Revenue");
    expect(revenueFact).toBeDefined();
    expect(sv(revenueFact!).cellRef).toBe("B4");
  });

  it("cellRef is undefined when row number is 0", () => {
    const env = xlsxEnvelope(["Product: Widget; Revenue: 500"]);
    const facts = factTokens(tokenizeEnvelope(env));
    for (const fact of facts) {
      expect(sv(fact).cellRef).toBeUndefined();
    }
  });

  it("produces correct multi-letter column refs (column index 26 → AA)", () => {
    // Build a row with 27 columns: Product + 26 value columns.
    const cols = Array.from({ length: 26 }, (_, i) => `Col${i + 1}`);
    const headerParts = ["Product", ...cols].map((c, i) => `${c}: ${i === 0 ? "Widget" : String(100 + i)}`).join("; ");
    const env = xlsxEnvelope([`[Sheet | row 2] ${headerParts}`]);
    const facts = factTokens(tokenizeEnvelope(env));
    // Col26 is at column index 26 → "AA"
    const col26Fact = facts.find((f) => sv(f).attribute === "Col26");
    expect(col26Fact).toBeDefined();
    expect(sv(col26Fact!).cellRef).toBe("AA2");
  });
});

// ---------------------------------------------------------------------------
// 4 & 5. Entity and attribute identification
// ---------------------------------------------------------------------------

describe("SPREADSHEET_FACT — entity and attribute identification", () => {
  it("uses the Product column as the entity (subjectId)", () => {
    const env = xlsxEnvelope([
      "[Sales | row 2] Product: Medium Duty Truck; Revenue: 4850000",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    expect(facts.length).toBeGreaterThan(0);
    for (const fact of facts) {
      expect(fact.subjectId).toBe("Medium Duty Truck");
    }
  });

  it("uses the Name column as the entity when Product is absent", () => {
    const env = xlsxEnvelope([
      "[Accounts | row 3] Name: Apex Retail; Amount: 95000",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    for (const fact of facts) {
      expect(fact.subjectId).toBe("Apex Retail");
    }
  });

  it("sets attribute from the value column label", () => {
    const env = xlsxEnvelope([
      "[Sales | row 2] Product: Truck; Revenue: 1000; Quantity: 5",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    const attributes = facts.map((f) => sv(f).attribute as string);
    expect(attributes).toContain("Revenue");
    expect(attributes).toContain("Quantity");
  });

  it("does not emit a fact for the entity column itself", () => {
    const env = xlsxEnvelope([
      "[Sales | row 2] Product: Truck; Revenue: 1000",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    // "Product" is the entity column — it must not appear as an attribute.
    const productFacts = facts.filter((f) => sv(f).attribute === "Product");
    expect(productFacts).toHaveLength(0);
  });

  it("does not emit facts when no entity column is recognizable", () => {
    // All columns are value-like; there is no entity to anchor facts to.
    const env = xlsxEnvelope([
      "[Summary | row 2] Revenue: 1000; Cost: 600; Profit: 400",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    expect(facts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Multiple entities
// ---------------------------------------------------------------------------

describe("SPREADSHEET_FACT — multiple data rows (multiple entities)", () => {
  it("produces separate facts for each row", () => {
    const env = xlsxEnvelope([
      "[Sales | row 2] Product: Light Duty Truck; Revenue: 50000",
      "[Sales | row 3] Product: Medium Duty Truck; Revenue: 75000",
      "[Sales | row 4] Product: Heavy Duty Truck; Revenue: 120000",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    const entities = new Set(facts.map((f) => f.subjectId as string));
    expect(entities).toContain("Light Duty Truck");
    expect(entities).toContain("Medium Duty Truck");
    expect(entities).toContain("Heavy Duty Truck");
  });
});

// ---------------------------------------------------------------------------
// 7. Multiple attributes
// ---------------------------------------------------------------------------

describe("SPREADSHEET_FACT — multiple attribute columns", () => {
  it("emits one fact per (entity, attribute) pair", () => {
    const env = xlsxEnvelope([
      "[Report | row 2] Name: Widget; Revenue: 9000; Quantity: 10; Cost: 4500",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    const attrs = new Set(facts.map((f) => sv(f).attribute as string));
    expect(attrs).toContain("Revenue");
    expect(attrs).toContain("Quantity");
    expect(attrs).toContain("Cost");
    // Name is the entity column — not an attribute.
    expect(attrs).not.toContain("Name");
  });
});

// ---------------------------------------------------------------------------
// 8. Multiple worksheets
// ---------------------------------------------------------------------------

describe("SPREADSHEET_FACT — multiple worksheets", () => {
  it("facts from different worksheets carry their respective worksheet names", () => {
    const env = xlsxEnvelope([
      "[Revenue | row 2] Product: Truck; Revenue: 100000",
      "[Costs | row 2] Product: Truck; Cost: 60000",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    const revFact = facts.find((f) => sv(f).attribute === "Revenue");
    const costFact = facts.find((f) => sv(f).attribute === "Cost");
    expect(sv(revFact!).worksheetName).toBe("Revenue");
    expect(sv(costFact!).worksheetName).toBe("Costs");
  });
});

// ---------------------------------------------------------------------------
// 9. Numeric value preservation
// ---------------------------------------------------------------------------

describe("SPREADSHEET_FACT — numeric value preservation", () => {
  it("preserves rawValue exactly as a string", () => {
    const env = xlsxEnvelope([
      "[Sales | row 2] Product: Truck; Revenue: 4850000",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    const rev = facts.find((f) => sv(f).attribute === "Revenue");
    expect(sv(rev!).rawValue).toBe("4850000");
  });

  it("parses numericValue as a JavaScript number", () => {
    const env = xlsxEnvelope([
      "[Sales | row 2] Product: Truck; Revenue: 4850000",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    const rev = facts.find((f) => sv(f).attribute === "Revenue");
    expect(sv(rev!).numericValue).toBe(4850000);
  });

  it("preserves decimal values without truncation", () => {
    const env = xlsxEnvelope([
      "[Prices | row 3] Item: Bearing; Price: 1234.56",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    const price = facts.find((f) => sv(f).attribute === "Price");
    expect(sv(price!).rawValue).toBe("1234.56");
    expect(sv(price!).numericValue).toBe(1234.56);
  });

  it("does not set numericValue for non-numeric strings", () => {
    const env = xlsxEnvelope([
      "[Report | row 2] Product: Truck; Status: Active",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    const status = facts.find((f) => sv(f).attribute === "Status");
    if (status) {
      expect(sv(status).numericValue).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 10. Empty / missing values
// ---------------------------------------------------------------------------

describe("SPREADSHEET_FACT — empty or missing values", () => {
  it("does not emit a fact for an empty value cell", () => {
    // An empty cell is simply absent in OOXML; the Python extractor omits it
    // from the labelled output.  So "Cost:" with no value should not appear.
    const env = xlsxEnvelope([
      "[Report | row 2] Product: Truck; Revenue: 5000",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    // Only Revenue fact — no Cost fact.
    const costFacts = facts.filter((f) => sv(f).attribute === "Cost");
    expect(costFacts).toHaveLength(0);
  });

  it("does not emit facts when entity column value is empty", () => {
    // A kv pair where the entity column has no value.
    const env = xlsxEnvelope([
      "[Report | row 2] Product: ; Revenue: 5000",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    // With empty entity there is nothing to anchor to.
    expect(facts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 11. Backward compatibility — SPREADSHEET_ROW tokens still produced
// ---------------------------------------------------------------------------

describe("SPREADSHEET_FACT — backward compatibility", () => {
  it("still produces SPREADSHEET_ROW tokens alongside SPREADSHEET_FACT tokens", () => {
    const env = xlsxEnvelope([
      "[Sales | row 2] Product: Truck; Revenue: 100000",
    ]);
    const result = tokenizeEnvelope(env);
    expect(rowTokens(result).length).toBeGreaterThan(0);
    expect(factTokens(result).length).toBeGreaterThan(0);
  });

  it("SPREADSHEET_ROW uses the actual row number from the prefix", () => {
    const env = xlsxEnvelope([
      "[Sheet | row 7] Product: Widget; Revenue: 500",
    ]);
    const rows = rowTokens(tokenizeEnvelope(env));
    expect(rows.length).toBeGreaterThan(0);
    const firstRow = rows[0]!;
    expect((firstRow.scalarValue as Record<string, unknown>)["rowNumber"]).toBe(7);
  });

  it("SPREADSHEET_ROW.scalarValue contains all existing fields", () => {
    const env = xlsxEnvelope([
      "[Sheet | row 2] Product: Widget; Revenue: 500",
    ]);
    const rows = rowTokens(tokenizeEnvelope(env));
    const row = rows[0]!;
    const scalar = row.scalarValue as Record<string, unknown>;
    expect(typeof scalar["row"]).toBe("string");
    expect(typeof scalar["rowNumber"]).toBe("number");
    expect(scalar["sourceDocument"]).toBe("Report.xlsx");
    expect(scalar["rowFormatVersion"]).toBe(2);
  });

  it("non-XLSX spreadsheets still produce SPREADSHEET_ROW tokens", () => {
    const env: NormalizedEnvelope = {
      source_id: "src_csv",
      source_type: "UPLOAD",
      document_type: "UNKNOWN",
      content: { text: "product,revenue\nTruck,50000", language: "en" },
      extracted_fields: {},
      tables: [],
      metadata: {
        filename: "data.csv",
        mime_type: "text/csv",
        checksum: "aabbcc",
        tenant_id: "tenant_a",
      },
      evidence_locations: [],
      confidence: 0.65,
      warnings: [],
      schema_version: "0.1.0",
    };
    const result = tokenizeEnvelope(env);
    expect(rowTokens(result).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 12. Non-XLSX files do not produce SPREADSHEET_FACT tokens
// ---------------------------------------------------------------------------

describe("SPREADSHEET_FACT — only XLSX", () => {
  it("does not produce SPREADSHEET_FACT tokens for a CSV file", () => {
    const env: NormalizedEnvelope = {
      source_id: "src_csv",
      source_type: "UPLOAD",
      document_type: "UNKNOWN",
      content: { text: "Product: Truck; Revenue: 50000", language: "en" },
      extracted_fields: {},
      tables: [],
      metadata: {
        filename: "report.csv",
        mime_type: "text/csv",
        checksum: "112233",
        tenant_id: "tenant_a",
      },
      evidence_locations: [],
      confidence: 0.65,
      warnings: [],
      schema_version: "0.1.0",
    };
    expect(factTokens(tokenizeEnvelope(env))).toHaveLength(0);
  });

  it("does not produce SPREADSHEET_FACT tokens for a plain text file", () => {
    const env: NormalizedEnvelope = {
      source_id: "src_txt",
      source_type: "UPLOAD",
      document_type: "UNKNOWN",
      content: { text: "Product: Truck; Revenue: 50000", language: "en" },
      extracted_fields: {},
      tables: [],
      metadata: {
        filename: "report.txt",
        mime_type: "text/plain",
        checksum: "aabb11",
        tenant_id: "tenant_a",
      },
      evidence_locations: [],
      confidence: 0.65,
      warnings: [],
      schema_version: "0.1.0",
    };
    expect(factTokens(tokenizeEnvelope(env))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 13. Persistence compatibility — JSON round-trip
// ---------------------------------------------------------------------------

describe("SPREADSHEET_FACT — persistence round-trip (JSON / PostgreSQL JSONB)", () => {
  /**
   * The tokens table stores each OrganizationalToken as a JSONB column via
   *   token: jsonb("token").$type<Record<string, unknown>>()
   * and inserts the full token object verbatim (see repository.ts).
   *
   * JSONB serialisation is JSON.stringify / JSON.parse.  This test verifies
   * that every field in scalarValue survives a full JSON round-trip with the
   * same type and value — confirming no migration is needed to persist these
   * tokens.
   */
  it("all scalarValue fields survive JSON.stringify → JSON.parse", () => {
    const env = xlsxEnvelope([
      "[Revenue Summary | row 5] Product: Medium Duty Truck; Revenue: 4850000; Quantity: 12",
    ]);
    const result = tokenizeEnvelope(env);
    const facts = factTokens(result);
    expect(facts.length).toBeGreaterThan(0);

    for (const token of facts) {
      const serialised = JSON.parse(JSON.stringify(token)) as OrganizationalToken;
      const original = sv(token);
      const restored = serialised.scalarValue as Record<string, unknown>;

      expect(restored.attribute).toBe(original.attribute);
      expect(restored.rawValue).toBe(original.rawValue);
      expect(restored.worksheetName).toBe(original.worksheetName);
      expect(restored.rowNumber).toBe(original.rowNumber);
      expect(restored.columnName).toBe(original.columnName);
      expect(restored.entityColumn).toBe(original.entityColumn);
      expect(restored.entityValue).toBe(original.entityValue);
      expect(restored.sourceDocument).toBe(original.sourceDocument);

      if (original.numericValue !== undefined) {
        expect(typeof restored.numericValue).toBe("number");
        expect(restored.numericValue).toBe(original.numericValue);
      }
      if (original.cellRef !== undefined) {
        expect(restored.cellRef).toBe(original.cellRef);
      }
      if (original.entityCellRef !== undefined) {
        expect(restored.entityCellRef).toBe(original.entityCellRef);
      }
    }
  });

  it("all top-level token fields survive JSON round-trip", () => {
    const env = xlsxEnvelope([
      "[Sales | row 3] Name: Apex Retail; Amount: 75000",
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    expect(facts.length).toBeGreaterThan(0);

    for (const token of facts) {
      const restored = JSON.parse(JSON.stringify(token)) as OrganizationalToken;
      expect(restored.tokenId).toBe(token.tokenId);
      expect(restored.tenantId).toBe(token.tenantId);
      expect(restored.tokenKind).toBe("STATE");
      expect(restored.eventType).toBe("SPREADSHEET_FACT");
      expect(restored.subjectId).toBe(token.subjectId);
      expect(restored.confidence).toBe(token.confidence);
      expect(restored.epistemicStatus).toBe("OBSERVED");
      expect(restored.retentionClass).toBe("organizational-evidence");
      expect(Array.isArray(restored.sourceRefs)).toBe(true);
      expect(restored.sourceRefs.length).toBeGreaterThan(0);

      const ref = restored.sourceRefs[0]!;
      expect(typeof ref.locator?.section).toBe("string");
    }
  });
});

// ---------------------------------------------------------------------------
// 14. Exact cell provenance via envelope.spreadsheet_rows
//     (the fix for Stage 1.1 — authoritative path)
// ---------------------------------------------------------------------------

/**
 * Build a NormalizedEnvelope that carries a `spreadsheet_rows` payload,
 * simulating what the Python DI service now produces for XLSX files.
 *
 * This is the authoritative path: cell references come from the Python
 * extractor's columnRefs map, not from sequential text positions.
 */
function xlsxEnvelopeWithRows(
  rows: Array<{
    worksheetName: string;
    rowNumber: number;
    cells: Record<string, string>;
    columnRefs: Record<string, string>;
    text: string;
  }>,
  filename = "Report.xlsx",
): NormalizedEnvelope {
  // Build a content.text that mirrors what the Python extractor emits so
  // that SPREADSHEET_ROW tokens are still produced correctly.
  const textLines = rows.map(
    (r) => `[${r.worksheetName} | row ${r.rowNumber}] ${r.text}`,
  );
  return {
    source_id: "src_provenance_test",
    source_type: "UPLOAD",
    document_type: "UNKNOWN",
    content: { text: textLines.join("\n"), language: "en" },
    extracted_fields: {},
    tables: [],
    spreadsheet_rows: rows,
    metadata: {
      filename,
      mime_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      checksum: "cafebabe",
      tenant_id: "tenant_a",
    },
    evidence_locations: [],
    confidence: 0.65,
    warnings: ["document_type_unknown"],
    schema_version: "0.1.0",
    extraction_status: "LOW_CONFIDENCE",
  };
}

describe("SPREADSHEET_FACT — exact cell provenance (authoritative path)", () => {
  /**
   * Required fixture from Stage 1.1:
   *
   *   | A       | B        | C     | D       |
   *   |---------|----------|-------|---------|
   *   | Product | Quantity | Empty | Revenue |
   *   | Medium  | 10       |       | 4850000 |
   *     Duty Truck
   *
   * Column C is entirely empty in row 2.
   * Expected: entity A2, Revenue cell D2.
   */
  it("sparse row: Revenue is D2 not C2 when column C is empty", () => {
    const env = xlsxEnvelopeWithRows([
      {
        worksheetName: "Sales Data",
        rowNumber: 2,
        // cells dict only contains non-empty cells — C is omitted
        cells: {
          "Product": "Medium Duty Truck",
          "Quantity": "10",
          "Revenue": "4850000",
        },
        // columnRefs carries authoritative addresses from OOXML cell r attrs
        columnRefs: {
          "Product":  "A2",
          "Quantity": "B2",
          "Revenue":  "D2",   // ← D, not C (column C was empty and skipped)
        },
        text: "Product: Medium Duty Truck; Quantity: 10; Revenue: 4850000",
      },
    ]);

    const facts = factTokens(tokenizeEnvelope(env));
    const revFact = facts.find((f) => sv(f).attribute === "Revenue");

    expect(revFact).toBeDefined();
    expect(revFact!.subjectId).toBe("Medium Duty Truck");
    expect(sv(revFact!).rawValue).toBe("4850000");
    expect(sv(revFact!).numericValue).toBe(4850000);
    expect(sv(revFact!).cellRef).toBe("D2");          // exact, not approximated
    expect(sv(revFact!).entityCellRef).toBe("A2");    // entity column
    expect(sv(revFact!).worksheetName).toBe("Sales Data");
    expect(sv(revFact!).rowNumber).toBe(2);

    // Quantity is B2 (also non-C, confirms the resolver used columnRefs)
    const qtyFact = facts.find((f) => sv(f).attribute === "Quantity");
    expect(qtyFact).toBeDefined();
    expect(sv(qtyFact!).cellRef).toBe("B2");
  });

  it("authoritative path produces no cell-reference approximation warning", () => {
    const env = xlsxEnvelopeWithRows([
      {
        worksheetName: "Report",
        rowNumber: 3,
        cells: { "Product": "Widget", "Revenue": "999" },
        columnRefs: { "Product": "A3", "Revenue": "F3" },
        text: "Product: Widget; Revenue: 999",
      },
    ]);
    const result = tokenizeEnvelope(env);
    // The authoritative path should not add any cell-ref warning.
    expect(result.warnings.some((w) => w.includes("approximate"))).toBe(false);
  });

  it("entity cell reference comes from columnRefs, not position", () => {
    // Product is in column C (index 2), not A.
    const env = xlsxEnvelopeWithRows([
      {
        worksheetName: "Catalogue",
        rowNumber: 5,
        cells: { "Product": "Sprocket", "Revenue": "3200" },
        columnRefs: { "Product": "C5", "Revenue": "E5" },
        text: "Product: Sprocket; Revenue: 3200",
      },
    ]);
    const facts = factTokens(tokenizeEnvelope(env));
    const f = facts.find((f) => sv(f).attribute === "Revenue");
    expect(sv(f!).entityCellRef).toBe("C5");   // not A5
    expect(sv(f!).cellRef).toBe("E5");          // not B5
  });

  it("multiple sparse rows each get their own exact references", () => {
    const env = xlsxEnvelopeWithRows([
      {
        worksheetName: "Revenue",
        rowNumber: 2,
        cells: { "Product": "Light Duty Truck", "Revenue": "50000" },
        columnRefs: { "Product": "A2", "Revenue": "D2" },
        text: "Product: Light Duty Truck; Revenue: 50000",
      },
      {
        worksheetName: "Revenue",
        rowNumber: 3,
        cells: { "Product": "Medium Duty Truck", "Revenue": "75000" },
        columnRefs: { "Product": "A3", "Revenue": "D3" },
        text: "Product: Medium Duty Truck; Revenue: 75000",
      },
      {
        worksheetName: "Revenue",
        rowNumber: 4,
        cells: { "Product": "Heavy Duty Truck", "Revenue": "120000" },
        columnRefs: { "Product": "A4", "Revenue": "D4" },
        text: "Product: Heavy Duty Truck; Revenue: 120000",
      },
    ]);

    const facts = factTokens(tokenizeEnvelope(env));
    const refsByEntity = Object.fromEntries(
      facts
        .filter((f) => sv(f).attribute === "Revenue")
        .map((f) => [f.subjectId as string, sv(f).cellRef as string]),
    );

    expect(refsByEntity["Light Duty Truck"]).toBe("D2");
    expect(refsByEntity["Medium Duty Truck"]).toBe("D3");
    expect(refsByEntity["Heavy Duty Truck"]).toBe("D4");
  });

  it("multiple worksheets each carry their own display name", () => {
    const env = xlsxEnvelopeWithRows([
      {
        worksheetName: "FY2025 Revenue",
        rowNumber: 2,
        cells: { "Product": "Truck", "Revenue": "100000" },
        columnRefs: { "Product": "A2", "Revenue": "B2" },
        text: "Product: Truck; Revenue: 100000",
      },
      {
        worksheetName: "FY2026 Budget",
        rowNumber: 2,
        cells: { "Product": "Truck", "Revenue": "120000" },
        columnRefs: { "Product": "A2", "Revenue": "B2" },
        text: "Product: Truck; Revenue: 120000",
      },
    ]);

    const facts = factTokens(tokenizeEnvelope(env)).filter(
      (f) => sv(f).attribute === "Revenue",
    );
    const sheetNames = facts.map((f) => sv(f).worksheetName as string);
    expect(sheetNames).toContain("FY2025 Revenue");
    expect(sheetNames).toContain("FY2026 Budget");
  });

  it("falls back to text-parsed path when spreadsheet_rows is absent", () => {
    // This envelope has NO spreadsheet_rows — uses the old text-only path.
    const env = xlsxEnvelope([
      "[Sales | row 2] Product: Truck; Revenue: 9000",
    ]);
    // The fallback path is active; cell references are position-approximated.
    // Revenue is at index 1 → "B", row 2 → "B2".
    const facts = factTokens(tokenizeEnvelope(env));
    const f = facts.find((f) => sv(f).attribute === "Revenue");
    expect(f).toBeDefined();
    expect(sv(f!).cellRef).toBe("B2");   // position-based fallback
  });

  it("falls back gracefully when spreadsheet_rows is an empty array", () => {
    const env: NormalizedEnvelope = {
      ...xlsxEnvelope(["[Sheet | row 2] Product: Widget; Revenue: 100"]),
      spreadsheet_rows: [],   // explicitly empty
    };
    // Empty array → text fallback
    const facts = factTokens(tokenizeEnvelope(env));
    expect(facts.length).toBeGreaterThan(0);
  });

  it("all scalarValue fields survive JSON round-trip (authoritative path)", () => {
    const env = xlsxEnvelopeWithRows([
      {
        worksheetName: "Revenue Summary",
        rowNumber: 5,
        cells: { "Product": "Medium Duty Truck", "Revenue": "4850000", "Quantity": "12" },
        columnRefs: { "Product": "A5", "Revenue": "D5", "Quantity": "B5" },
        text: "Product: Medium Duty Truck; Revenue: 4850000; Quantity: 12",
      },
    ]);

    const facts = factTokens(tokenizeEnvelope(env));
    expect(facts.length).toBeGreaterThan(0);

    for (const token of facts) {
      const restored = JSON.parse(JSON.stringify(token)) as OrganizationalToken;
      const original = sv(token);
      const r = restored.scalarValue as Record<string, unknown>;

      expect(r.attribute).toBe(original.attribute);
      expect(r.rawValue).toBe(original.rawValue);
      expect(r.worksheetName).toBe(original.worksheetName);
      expect(r.rowNumber).toBe(original.rowNumber);
      expect(r.entityColumn).toBe(original.entityColumn);
      expect(r.entityValue).toBe(original.entityValue);
      expect(r.sourceDocument).toBe(original.sourceDocument);
      if (original.cellRef !== undefined)       expect(r.cellRef).toBe(original.cellRef);
      if (original.entityCellRef !== undefined) expect(r.entityCellRef).toBe(original.entityCellRef);
      if (original.numericValue !== undefined)  expect(r.numericValue).toBe(original.numericValue);
    }
  });
});
