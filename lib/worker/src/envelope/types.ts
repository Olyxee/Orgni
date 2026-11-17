/**
 * Normalized extraction envelope — schema_version 0.1.0.
 *
 * This is the contract Document Intelligence produces and the ingestion
 * pipeline consumes. It mirrors `intelligence/document-intelligence/envelope/builder.py`
 * exactly; the two must be changed together.
 *
 * Field names are snake_case because the envelope crosses a service boundary
 * and is emitted by the Python service. The tokenizer's own extraction types
 * are camelCase — `adapter.ts` is the single place that translates.
 */

export const ENVELOPE_SCHEMA_VERSION = "0.1.0" as const;

export type EnvelopeDocumentType =
  "INVOICE" | "PROOF_OF_PAYMENT" | "CONTRACT" | "UNKNOWN";

export type EnvelopeExtractionStatus =
  "COMPLETE" | "PARTIAL" | "LOW_CONFIDENCE";

export type ConfidenceMethod =
  "OCR_EXTRACTION" | "RULE_MATCH" | "ML_MODEL" | "MANUAL" | "INFERRED";

/** A single extracted value with its confidence and provenance. */
export interface EnvelopeField<T = unknown> {
  value: T;
  confidence: number;
  method: ConfidenceMethod;
  page?: number;
  section?: string;
  raw?: string;
}

export interface EnvelopeEvidenceLocation {
  field: string;
  type: "TEXT_SPAN" | "BBOX" | "TABLE_CELL" | "IMAGE_REGION";
  page?: number;
  start?: number;
  end?: number;
  excerpt?: string;
  bbox?: [number, number, number, number];
}

export interface EnvelopeTable {
  name: string;
  rowCount: number;
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface EnvelopeMetadata {
  filename: string;
  mime_type: string;
  checksum: string;
  tenant_id: string;
}

export interface EnvelopeSpreadsheetCell {
  /** Column header label as detected from the header row, e.g. "Revenue". */
  columnLabel: string;
  /** Raw cell value string exactly as extracted from OOXML, e.g. "4850000". */
  value: string;
  /** Excel cell reference, e.g. "D2". Derived from actual cell r attribute. */
  cellRef: string;
}

/**
 * One structured data row from an XLSX worksheet, carrying authoritative
 * worksheet name, row number, and per-cell column-label → cell reference
 * mappings produced by the Python _extract_xlsx_rows function.
 *
 * Present only on envelopes produced from .xlsx files; absent for all other
 * document types.  Consumers must treat the field as optional.
 */
export interface EnvelopeSpreadsheetRow {
  /** Display name of the worksheet tab, e.g. "Revenue Summary". */
  worksheetName: string;
  /** 1-based spreadsheet row number from the XML r attribute. */
  rowNumber: number;
  /** Column label → raw value for every non-empty cell in this data row. */
  cells: Record<string, string>;
  /** Column label → Excel cell reference (e.g. "D2") for every non-empty cell. */
  columnRefs: Record<string, string>;
  /** The labelled text representation of this row, same as content.text line. */
  text: string;
}

export interface NormalizedEnvelope {
  source_id: string;
  source_type: "UPLOAD";
  document_type: EnvelopeDocumentType;
  content: {
    text: string;
    language: string;
  };
  extracted_fields: Record<string, unknown>;
  tables: EnvelopeTable[];
  metadata: EnvelopeMetadata;
  evidence_locations: EnvelopeEvidenceLocation[];
  confidence: number;
  warnings: string[];
  schema_version: typeof ENVELOPE_SCHEMA_VERSION;
  /** Completeness signal; absent on older producers, defaulted on validation. */
  extraction_status?: EnvelopeExtractionStatus;
  /**
   * Structured row data from XLSX files.  Present only when the document is
   * an .xlsx file processed by the Python DI service.  Each entry carries the
   * authoritative worksheet display name, 1-based row number, and per-cell
   * column-label → cell-reference mappings, so the tokenizer can use exact
   * addresses without reconstructing them from text positions.
   *
   * Absent for all other document types; always absent on older DI producers.
   */
  spreadsheet_rows?: EnvelopeSpreadsheetRow[];
}
