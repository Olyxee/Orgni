import { describe, expect, it } from "vitest";

import { tokenizeEnvelope } from "../src/phase1/index.js";
import type { NormalizedEnvelope } from "../src/envelope/types.js";

function envelope(text: string): NormalizedEnvelope {
  return {
    source_id: "src_generic",
    source_type: "UPLOAD",
    document_type: "UNKNOWN",
    content: { text, language: "en" },
    extracted_fields: {},
    tables: [],
    metadata: {
      filename: "policy.txt",
      mime_type: "text/plain",
      checksum: "abc123",
      tenant_id: "tenant_test",
    },
    evidence_locations: [],
    confidence: 0.6,
    warnings: ["document_type_unknown"],
    schema_version: "0.1.0",
    extraction_status: "LOW_CONFIDENCE",
  };
}

describe("generic evidence tokenization", () => {
  it("preserves explicit entities, relationships and policy clauses", () => {
    const result = tokenizeEnvelope(
      envelope(
        [
          "Meridian Industrial Group Pty Ltd",
          "PROCUREMENT POLICY Meridian Industrial Group Pty Ltd",
          "Apex Supply Company Ltd supplies Meridian Industrial Group Pty Ltd.",
          "Purchases above R50,000 must receive CFO approval.",
        ].join("\n"),
      ),
    );

    expect(result.errors).toEqual([]);
    expect(
      result.tokens.filter((token) => token.eventType === "DOCUMENT_ASSERTION"),
    ).toHaveLength(2);
    expect(
      result.tokens.find((token) => token.predicate === "SUPPLIES"),
    ).toMatchObject({
      subjectId: "Apex Supply Company Ltd",
      objectId: "Meridian Industrial Group Pty Ltd",
    });
    expect(
      result.tokens.find(
        (token) => token.eventType === "ORGANIZATIONAL_POLICY",
      ),
    ).toBeDefined();
  });

  it("does not invent context when no explicit signal exists", () => {
    const result = tokenizeEnvelope(envelope("A short general note."));
    expect(result.tokens).toEqual([]);
  });

  it("preserves spreadsheet rows as source-attributed evidence", () => {
    const workbook = envelope(
      [
        "SKU\tProduct\tUnit price",
        "SKU-104\tSteel pump housing\t11060.00",
      ].join("\n"),
    );
    workbook.metadata.filename = "Sales Price List.xlsx";

    const result = tokenizeEnvelope(workbook);
    expect(result.tokens).toContainEqual(
      expect.objectContaining({
        tokenKind: "STATE",
        eventType: "SPREADSHEET_ROW",
        scalarValue: expect.objectContaining({
          row: "SKU-104 Steel pump housing 11060.00",
          rowNumber: 2,
          sourceDocument: "Sales Price List.xlsx",
          rowFormatVersion: 2,
        }),
      }),
    );
  });

  it("does not treat a standalone legal suffix as an entity", () => {
    const result = tokenizeEnvelope(envelope("Pty) Limited"));
    expect(result.tokens.filter((token) => token.tokenKind === "ENTITY")).toEqual(
      [],
    );
  });
});
