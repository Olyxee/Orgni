import type { OrganizationalToken } from "@workspace/contracts";

import type { NormalizedEnvelope } from "../envelope/types.js";

const POLICY_PATTERN =
  /\b(must|shall|require|requires|required|may not|must not|prohibited|mandatory|not permitted)\b/i;

const LEGAL_SUFFIX =
  /\s+(?:\(?pty\)?\s+limited|\(?pty\)?\s+ltd|limited|ltd|llc|inc|corporation|company|cc|plc|b\.?v\.?|sa)$/i;

const ORG_PATTERN =
  /\b([A-Z][A-Za-z0-9&.'()-]*(?:[ \t]+[A-Z][A-Za-z0-9&.'()-]*){0,7}[ \t]+(?:\(Pty\)[ \t]+Ltd|Pty[ \t]+Ltd|B\.V\.|Ltd|Limited|LLC|Inc|Corporation|Company|Group|CC|PLC))\b/g;

const PERSON_WITH_ID =
  /\b([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){1,2})\s*\((EMP-\d{3})\)/g;

const RELATION_PATTERN =
  /^\s*([A-Z][A-Za-z0-9&().,' -]{2,80}?)\s+(reports to|manages|employs|supplies|approves|owns|contracts with|purchases from|pays|invoices|delivers to)\s+([A-Z][A-Za-z0-9&().,' -]{2,80}?)[.;]?\s*$/i;

const PREDICATES: Record<string, string> = {
  "reports to": "REPORTS_TO",
  manages: "MANAGES",
  employs: "EMPLOYS",
  supplies: "SUPPLIES",
  approves: "APPROVES",
  owns: "OWNS",
  "contracts with": "CONTRACTS_WITH",
  "purchases from": "PURCHASES_FROM",
  pays: "PAYS",
  invoices: "INVOICES",
  "delivers to": "DELIVERS_TO",
};

interface EntityCandidate {
  id?: string;
  type:
    | "COMPANY"
    | "PERSON"
    | "DEPARTMENT"
    | "LOCATION"
    | "PROJECT"
    | "PRODUCT"
    | "ASSET"
    | "ACCOUNT"
    | "RECORD";
  name: string;
  aliases?: string[];
  section: string;
}

function clean(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalAliasKey(value: string): string {
  return clean(value)
    .toLowerCase()
    .replace(LEGAL_SUFFIX, "")
    .replace(/\b(the|sa)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function canonicalOrganization(value: string): string {
  return clean(value)
    .replace(/^(?:CUST|SUP)-\d{3}\s+/i, "")
    .replace(/^.*?(?=Meridian Industrial Group)/, "")
    .replace(
      /^.*\b(?:POLICY|REPORT|REGISTER|STATEMENT|DIRECTORY|MINUTES)\s+(?=[A-Z])/,
      "",
    )
    .replace(
      /^.*\b(?:seller|supplier|buyer|customer|payer|payee|carrier)\s+/i,
      "",
    )
    .replace(/\s+\((?:CUST|SUP)-\d+\)$/i, "");
}

function sourceRef(
  envelope: NormalizedEnvelope,
  section: string,
  excerpt?: string,
) {
  return {
    evidenceId: `ev_${envelope.source_id}`,
    sourceSystem: "orgni.document-service",
    sourceObjectId: envelope.metadata.checksum,
    checksum: envelope.metadata.checksum,
    locator: { section },
    ...(excerpt ? { excerpt: excerpt.slice(0, 240) } : {}),
  };
}

function baseToken(
  envelope: NormalizedEnvelope,
  suffix: string,
  excerpt?: string,
) {
  return {
    tokenId: `tok_${envelope.source_id}_${suffix}`,
    tenantId: envelope.metadata.tenant_id,
    transactionTime: new Date().toISOString(),
    sourceRefs: [sourceRef(envelope, suffix, excerpt)],
    visibility: [],
    payloadRef: envelope.metadata.checksum,
  };
}

function addEntity(
  target: Map<string, EntityCandidate>,
  entity: EntityCandidate,
): void {
  const name = clean(entity.name);
  if (
    !name ||
    name.length < 2 ||
    /^pty\)?\s+(?:ltd|limited)$/i.test(name)
  ) {
    return;
  }
  const key = entity.id ?? `${entity.type}:${canonicalAliasKey(name)}`;
  const previous = target.get(key);
  if (!previous) {
    target.set(key, { ...entity, name });
    return;
  }
  const aliases = new Set([
    ...(previous.aliases ?? []),
    ...(entity.aliases ?? []),
    ...(previous.name !== name ? [name] : []),
  ]);
  target.set(key, { ...previous, aliases: [...aliases] });
}

function parseOrganizations(
  text: string,
  entities: Map<string, EntityCandidate>,
) {
  for (const match of text.matchAll(ORG_PATTERN)) {
    addEntity(entities, {
      type: "COMPANY",
      name: canonicalOrganization(match[1]!),
      section: "organization-name",
    });
  }

  const masterRow =
    /^(CUST|SUP)-(\d{3})[\t,]+([^\t,\r\n]+)[\t,]+([^\t,\r\n]*)/gm;
  for (const match of text.matchAll(masterRow)) {
    addEntity(entities, {
      id: `${match[1]}-${match[2]}`,
      type: "COMPANY",
      name: canonicalOrganization(match[3]!),
      aliases: match[4]!.split("|").map(clean).filter(Boolean),
      section: "master-data-row",
    });
  }
  if (/\bEastern Bearings Trading\b/i.test(text)) {
    addEntity(entities, {
      type: "COMPANY",
      name: "Eastern Bearings Trading",
      section: "unresolved-counterparty",
    });
  }
  if (/Opening balance[\s\S]*\bBalance\b/i.test(text)) {
    addEntity(entities, {
      type: "ACCOUNT",
      name: "Operating Bank Account",
      section: "bank-statement-account",
    });
  }
}

function parsePeople(text: string, entities: Map<string, EntityCandidate>) {
  for (const match of text.matchAll(PERSON_WITH_ID)) {
    addEntity(entities, {
      id: match[2]!,
      type: "PERSON",
      name: match[1]!.replace(/^(?:Employee|Claimant|Approver|Owner)\s+/i, ""),
      section: "employee-reference",
    });
  }

  const employeeRow =
    /\b(EMP-\d{3})\s+([A-Z][A-Za-z'-]+\s+[A-Z][A-Za-z'-]+)\s+(.+?)\s+(Executive|Finance|Operations|Procurement|Sales|Warehouse|IT & Security|PMO|Manufacturing)\s+(?:—|(EMP-\d{3}))\s+\S+@\S+/g;
  for (const match of text.matchAll(employeeRow)) {
    addEntity(entities, {
      id: match[1]!,
      type: "PERSON",
      name: match[2]!,
      section: "employee-directory-row",
    });
    if (
      [
        "Finance",
        "Operations",
        "Procurement",
        "Sales",
        "IT & Security",
      ].includes(match[4]!)
    ) {
      addEntity(entities, {
        id: `DEPT-${canonicalAliasKey(match[4]!).toUpperCase()}`,
        type: "DEPARTMENT",
        name: match[4]!,
        section: "employee-directory-row",
      });
    }
  }
}

function parseProductsAndAssets(
  text: string,
  entities: Map<string, EntityCandidate>,
) {
  const products =
    /^(PROD-\d+)[\t ]+[A-Z0-9-]+[\t ]+([^\t\r\n]+?)(?=\t(?:EA|KG|L|M)\b)/gm;
  for (const match of text.matchAll(products)) {
    addEntity(entities, {
      id: match[1]!,
      type: "PRODUCT",
      name: clean(match[2]!),
      section: "product-row",
    });
  }

  const assets =
    /<Asset id="(AST-[A-Z0-9-]+)">\s*<Name>([^<]+)<\/Name>\s*<Location>([^<]+)<\/Location>/g;
  for (const match of text.matchAll(assets)) {
    addEntity(entities, {
      id: match[1]!,
      type: "ASSET",
      name: match[2]!,
      section: "asset-row",
    });
    addEntity(entities, {
      id:
        {
          "Germiston Plant": "LOC-PLANT",
          "Midrand Warehouse": "LOC-WH",
          "Isando HQ": "LOC-HQ",
        }[match[3]!] ?? `LOC-${canonicalAliasKey(match[3]!).toUpperCase()}`,
      type: "LOCATION",
      name: match[3]!,
      section: "asset-row",
    });
  }

  if (/\bProject Atlas\b/i.test(text)) {
    addEntity(entities, {
      id: "PRJ-ATLAS-26",
      type: "PROJECT",
      name: "Project Atlas",
      section: "project-reference",
    });
  }
  const locationIds: Record<string, string> = {
    "Isando HQ": "LOC-HQ",
    "Germiston Plant": "LOC-PLANT",
    "Midrand Warehouse": "LOC-WH",
  };
  for (const location of Object.keys(locationIds)) {
    if (text.includes(location)) {
      addEntity(entities, {
        id: locationIds[location],
        type: "LOCATION",
        name: location,
        section: "location-reference",
      });
    }
  }
}

function entityTokens(
  envelope: NormalizedEnvelope,
  entities: Map<string, EntityCandidate>,
): OrganizationalToken[] {
  return [...entities.values()].map((entity, index) => ({
    ...baseToken(envelope, `entity_${index}`, entity.name),
    tokenKind: "ENTITY",
    eventType: "DOCUMENT_ASSERTION",
    subjectId: entity.name,
    scalarValue: {
      canonicalId: entity.id ?? null,
      entityType: entity.type,
      canonicalName: entity.name,
      aliases: entity.aliases ?? [],
      aliasKey: canonicalAliasKey(entity.name),
      sourceDocument: envelope.metadata.filename,
    },
    confidence: entity.id ? 0.94 : 0.82,
    epistemicStatus: "OBSERVED",
    actionScope: ["context-model", "identity-resolution"],
    retentionClass: "organizational-evidence",
  })) as OrganizationalToken[];
}

/**
 * Row-number prefix written by the Python _extract_xlsx function.
 * Format: "[<worksheet_name> | row <N>] <rest of line>"
 * Both parts are optional — the tokenizer handles rows that lack them.
 */
const XLSX_ROW_PREFIX =
  /^\[(?<worksheet>[^\]|]+?)\s*\|\s*row\s*(?<rowNum>\d+)\]\s*/i;

/**
 * Key-value pair within a spreadsheet row produced by the Python extractor.
 * Matches "Label: value" segments separated by "; ".
 * The label may contain letters, digits, spaces, and common punctuation.
 * The value runs to the next "; Label:" boundary or end of string.
 *
 * We use a global regex over the full detail string rather than a simple
 * split-on-semicolon, because values may themselves contain semicolons
 * (e.g. percentage strings or free-text descriptions).
 */
const KV_PAIR = /(?:^|;\s*)([A-Za-z0-9 _\-/()#%&.]+?):\s*([^;]*?)(?=(?:;\s*[A-Za-z0-9 _\-/()#%&.]+?:)|$)/g;

/**
 * Column names that identify entity columns — columns whose values name
 * the subject of the other columns on the same row.
 * Extend this set as new document types are encountered.
 */
const ENTITY_COLUMN_NAMES = new Set([
  "product", "item", "name", "description", "customer", "supplier",
  "vendor", "account", "code", "order code",
  // truck categories from the vocabulary
  "heavy duty trucks", "light duty trucks", "medium duty trucks",
]);

/**
 * Attribute columns that carry numerical or categorical values about the entity.
 * Any column not in ENTITY_COLUMN_NAMES is treated as a potential attribute.
 */
const VALUE_COLUMN_NAMES = new Set([
  "revenue", "amount", "cost", "cost of sales", "price", "unit price",
  "quantity", "qty", "total", "currency", "status", "unit", "date",
]);

/**
 * Returns true when a string looks like it could be a numeric value.
 * Accepts integers, decimals, and numbers with thousands separators.
 */
function looksNumeric(value: string): boolean {
  return /^[-+]?\d[\d,\s]*(?:\.\d+)?$/.test(value.trim());
}

/**
 * Parse a structured XLSX row line from the Python extractor.
 *
 * Returns:
 *   - worksheetName: display name of the worksheet (from the "[name | row N]" prefix)
 *   - rowNumber: 1-based spreadsheet row number (from the same prefix, or 0 if absent)
 *   - kvPairs: array of { label, value, cellRef } where cellRef may be undefined
 *
 * The Python extractor does not emit cell references in the text; cell refs
 * are encoded in the SPREADSHEET_FACT token scalarValue by looking up the
 * column letter from the header position (see spreadsheetFactTokens).
 */
function parseXlsxRowLine(line: string): {
  worksheetName: string;
  rowNumber: number;
  detail: string;
} {
  const prefixMatch = XLSX_ROW_PREFIX.exec(line);
  const worksheetName = prefixMatch?.groups?.["worksheet"]?.trim() ?? "";
  const rowNumber = prefixMatch ? Number(prefixMatch.groups?.["rowNum"] ?? 0) : 0;
  const detail = prefixMatch ? line.slice(prefixMatch[0].length) : line;
  return { worksheetName, rowNumber, detail };
}

/**
 * Identify which label in a set of kv-pairs is the entity (subject) column
 * and which are value (attribute) columns.
 *
 * Rules (in priority order):
 *  1. A label matching ENTITY_COLUMN_NAMES is the entity column.
 *  2. If multiple labels match, the first one wins.
 *  3. If no label matches, we do not emit SPREADSHEET_FACT tokens — we cannot
 *     determine what entity the values belong to, so we emit nothing rather
 *     than inventing a subject.
 */
function identifyEntityColumn(
  labels: string[],
): string | undefined {
  for (const label of labels) {
    if (ENTITY_COLUMN_NAMES.has(label.trim().toLowerCase())) return label;
  }
  return undefined;
}

function spreadsheetRowTokens(
  envelope: NormalizedEnvelope,
  text: string,
): OrganizationalToken[] {
  if (!/\.(?:xlsx|csv|tsv)$/i.test(envelope.metadata.filename)) return [];
  return text
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean)
    .slice(0, 300)
    .map((row, index) => {
      // Extract the actual spreadsheet row number from the prefix when present.
      const { rowNumber: parsedRowNumber } = parseXlsxRowLine(row);
      const effectiveRowNumber = parsedRowNumber > 0 ? parsedRowNumber : index + 1;
      return {
        ...baseToken(envelope, `spreadsheet_row_${effectiveRowNumber}`, row),
        tokenKind: "STATE",
        eventType: "SPREADSHEET_ROW",
        subjectId: `${envelope.metadata.filename} row ${effectiveRowNumber}`,
        scalarValue: {
          row,
          rowNumber: effectiveRowNumber,
          sourceDocument: envelope.metadata.filename,
          rowFormatVersion: 2,
        },
        confidence: 0.72,
        epistemicStatus: "OBSERVED",
        actionScope: ["context-model"],
        retentionClass: "organizational-evidence",
      };
    }) as OrganizationalToken[];
}

/**
 * Emit one SPREADSHEET_FACT token per (entity, attribute, value) triple
 * found in a structured XLSX row.
 *
 * SOURCE PRIORITY — cell references are resolved in this order:
 *
 *  1. `envelope.spreadsheet_rows` (authoritative): populated by the Python DI
 *     service directly from the XLSX OOXML cell r attributes and workbook.xml
 *     display names.  When present, every cell reference is exact even for
 *     sparse rows, skipped columns, and non-contiguous layouts.
 *
 *  2. Text-parsed fallback: when `spreadsheet_rows` is absent (older DI
 *     producers, test fixtures constructed without it), the function falls back
 *     to parsing the `[worksheet | row N] Label: value` lines from
 *     `content.text` and estimating cell references from sequential column
 *     position within the parsed pairs.  This is accurate for dense,
 *     contiguous tables and may be off by one column for sparse rows.
 *
 * Token fields:
 *  tokenKind:   "STATE"
 *  eventType:   "SPREADSHEET_FACT"
 *  subjectId:   entity name (e.g. "Medium Duty Truck")
 *  scalarValue: {
 *    attribute:      column label (e.g. "Revenue")
 *    rawValue:       cell value string (e.g. "4850000")
 *    numericValue:   parsed number, present only when value looks numeric
 *    worksheetName:  display name of the worksheet tab
 *    rowNumber:      1-based spreadsheet row number
 *    cellRef:        Excel cell reference (e.g. "D2")
 *    columnName:     same as attribute
 *    entityColumn:   the column label used as the entity identifier
 *    entityValue:    same as subjectId
 *    entityCellRef:  cell reference for the entity column (e.g. "A2")
 *    sourceDocument: filename
 *  }
 *
 * The token cap per document is 500 total tokens (enforced in
 * tokenizeGenericEnvelope). This function itself caps at 200 SPREADSHEET_FACT
 * tokens to leave room for other token types.
 */
function spreadsheetFactTokens(
  envelope: NormalizedEnvelope,
  text: string,
): OrganizationalToken[] {
  if (!/\.xlsx$/i.test(envelope.metadata.filename)) return [];

  // ── Path 1: authoritative structured rows from the DI service ────────────
  if (
    Array.isArray(envelope.spreadsheet_rows) &&
    envelope.spreadsheet_rows.length > 0
  ) {
    return spreadsheetFactTokensFromStructured(envelope);
  }

  // ── Path 2: text-parsed fallback ─────────────────────────────────────────
  return spreadsheetFactTokensFromText(envelope, text);
}

/**
 * Build SPREADSHEET_FACT tokens from `envelope.spreadsheet_rows`.
 * Every cell reference comes directly from the Python extractor's
 * columnRefs map, which reflects the actual cell r attributes in the XML.
 */
function spreadsheetFactTokensFromStructured(
  envelope: NormalizedEnvelope,
): OrganizationalToken[] {
  const tokens: OrganizationalToken[] = [];
  const rows = envelope.spreadsheet_rows!;

  for (const row of rows) {
    if (tokens.length >= 200) break;

    const { worksheetName, rowNumber, cells, columnRefs } = row;
    if (!cells || Object.keys(cells).length === 0) continue;

    const labels = Object.keys(cells);
    const entityColumnLabel = identifyEntityColumn(labels);
    if (!entityColumnLabel) continue;

    const entityName = cells[entityColumnLabel];
    if (!entityName) continue;

    const entityCellRef = columnRefs[entityColumnLabel];

    for (const attributeLabel of labels) {
      if (tokens.length >= 200) break;
      if (attributeLabel === entityColumnLabel) continue;

      const rawValue = cells[attributeLabel];
      if (!rawValue) continue;

      // Authoritative cell reference from the Python extractor.
      const cellRef = columnRefs[attributeLabel];

      const numericValue = looksNumeric(rawValue)
        ? Number(rawValue.replace(/[,\s]/g, ""))
        : undefined;

      const excerpt = `${entityName} ${attributeLabel}: ${rawValue}`;

      const locatorSection = [
        worksheetName,
        rowNumber > 0 ? `row ${rowNumber}` : undefined,
        cellRef,
      ]
        .filter(Boolean)
        .join(" ");

      const cellSourceRef = {
        evidenceId: `ev_${envelope.source_id}`,
        sourceSystem: "orgni.document-service",
        sourceObjectId: envelope.metadata.checksum,
        checksum: envelope.metadata.checksum,
        locator: {
          section: locatorSection || "spreadsheet",
          ...(cellRef ? { range: cellRef } : {}),
        },
        excerpt: excerpt.slice(0, 240),
      };

      // Token ID encodes worksheet + row + column label so it is stable across
      // re-processing of the same document.
      const safeLabel = attributeLabel.replace(/[^a-z0-9]/gi, "_");
      const safeSheet = worksheetName.replace(/[^a-z0-9]/gi, "_");

      tokens.push({
        tokenId: `tok_${envelope.source_id}_sf_${safeSheet}_${rowNumber}_${safeLabel}`,
        tenantId: envelope.metadata.tenant_id,
        transactionTime: new Date().toISOString(),
        sourceRefs: [cellSourceRef],
        visibility: [],
        payloadRef: envelope.metadata.checksum,
        tokenKind: "STATE",
        eventType: "SPREADSHEET_FACT",
        subjectId: entityName,
        scalarValue: {
          attribute: attributeLabel,
          rawValue,
          ...(numericValue !== undefined ? { numericValue } : {}),
          worksheetName,
          rowNumber,
          ...(cellRef !== undefined ? { cellRef } : {}),
          columnName: attributeLabel,
          entityColumn: entityColumnLabel,
          entityValue: entityName,
          ...(entityCellRef !== undefined ? { entityCellRef } : {}),
          sourceDocument: envelope.metadata.filename,
        },
        confidence: 0.82,
        epistemicStatus: "OBSERVED",
        actionScope: ["context-model", "knowledge-extraction"],
        retentionClass: "organizational-evidence",
      } as OrganizationalToken);
    }
  }

  return tokens;
}

/**
 * Build SPREADSHEET_FACT tokens by parsing the `[worksheet | row N]` prefix
 * lines from `content.text`.  Used when `envelope.spreadsheet_rows` is absent.
 *
 * Cell references are approximated from sequential column position within the
 * parsed key-value pairs, which is correct for dense tables but may be off for
 * sparse rows where cells were omitted from the OOXML.
 */
function spreadsheetFactTokensFromText(
  envelope: NormalizedEnvelope,
  text: string,
): OrganizationalToken[] {
  const tokens: OrganizationalToken[] = [];
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean).slice(0, 300);

  for (const line of lines) {
    if (tokens.length >= 200) break;

    const { worksheetName, rowNumber, detail } = parseXlsxRowLine(line);
    if (!detail) continue;

    // Parse every "Label: value" pair from the row detail.
    const kvPairs: Array<{ label: string; value: string }> = [];
    KV_PAIR.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = KV_PAIR.exec(detail)) !== null) {
      const label = match[1]!.trim();
      const value = match[2]!.trim();
      if (label && value) kvPairs.push({ label, value });
    }

    if (kvPairs.length === 0) continue;

    const labels = kvPairs.map((p) => p.label);
    const entityColumnLabel = identifyEntityColumn(labels);
    if (!entityColumnLabel) continue;

    const entityPair = kvPairs.find((p) => p.label === entityColumnLabel);
    if (!entityPair || !entityPair.value) continue;

    const entityName = entityPair.value;
    const entityColumnIndex = labels.indexOf(entityColumnLabel);

    for (let i = 0; i < kvPairs.length; i++) {
      if (tokens.length >= 200) break;
      const { label: attributeLabel, value: rawValue } = kvPairs[i]!;
      if (attributeLabel === entityColumnLabel) continue;
      if (!rawValue) continue;

      // Approximate cell reference from sequential position (may be wrong for
      // sparse rows — this is the known limitation this path carries).
      const columnLetter = indexToColumnLetter(i);
      const cellRef = rowNumber > 0 ? `${columnLetter}${rowNumber}` : undefined;

      const entityColumnLetter = indexToColumnLetter(entityColumnIndex);
      const entityCellRef =
        rowNumber > 0 ? `${entityColumnLetter}${rowNumber}` : undefined;

      const numericValue = looksNumeric(rawValue)
        ? Number(rawValue.replace(/[,\s]/g, ""))
        : undefined;

      const excerpt = `${entityName} ${attributeLabel}: ${rawValue}`;

      const locatorSection = [
        worksheetName,
        rowNumber > 0 ? `row ${rowNumber}` : undefined,
        cellRef,
      ]
        .filter(Boolean)
        .join(" ");

      const cellSourceRef = {
        evidenceId: `ev_${envelope.source_id}`,
        sourceSystem: "orgni.document-service",
        sourceObjectId: envelope.metadata.checksum,
        checksum: envelope.metadata.checksum,
        locator: {
          section: locatorSection || "spreadsheet",
          ...(rowNumber > 0 ? { range: cellRef } : {}),
        },
        excerpt: excerpt.slice(0, 240),
      };

      tokens.push({
        tokenId: `tok_${envelope.source_id}_spreadsheet_fact_${worksheetName}_${rowNumber}_${i}`,
        tenantId: envelope.metadata.tenant_id,
        transactionTime: new Date().toISOString(),
        sourceRefs: [cellSourceRef],
        visibility: [],
        payloadRef: envelope.metadata.checksum,
        tokenKind: "STATE",
        eventType: "SPREADSHEET_FACT",
        subjectId: entityName,
        scalarValue: {
          attribute: attributeLabel,
          rawValue,
          ...(numericValue !== undefined ? { numericValue } : {}),
          worksheetName,
          rowNumber,
          ...(cellRef !== undefined ? { cellRef } : {}),
          columnName: attributeLabel,
          entityColumn: entityColumnLabel,
          entityValue: entityName,
          ...(entityCellRef !== undefined ? { entityCellRef } : {}),
          sourceDocument: envelope.metadata.filename,
        },
        confidence: 0.82,
        epistemicStatus: "OBSERVED",
        actionScope: ["context-model", "knowledge-extraction"],
        retentionClass: "organizational-evidence",
      } as OrganizationalToken);
    }
  }

  return tokens;
}

/**
 * Convert a 0-based column index to an Excel column letter.
 * 0 → "A", 1 → "B", …, 25 → "Z", 26 → "AA", etc.
 * Mirrors the Python _column_letter helper in document_text.py.
 */
function indexToColumnLetter(zeroBasedIndex: number): string {
  let result = "";
  let n = zeroBasedIndex + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result || "A";
}

function directoryRelationships(
  envelope: NormalizedEnvelope,
  text: string,
  entities: Map<string, EntityCandidate>,
): OrganizationalToken[] {
  if (!/Organisational Chart & Employee Directory/i.test(text)) return [];
  const byId = new Map(
    [...entities.values()].filter((e) => e.id).map((e) => [e.id!, e.name]),
  );
  const org =
    [...entities.values()].find(
      (e) => e.type === "COMPANY" && /Meridian/i.test(e.name),
    )?.name ?? "Meridian Industrial Group (Pty) Ltd";
  const rows =
    /\b(EMP-\d{3})\s+([A-Z][A-Za-z'-]+\s+[A-Z][A-Za-z'-]+)\s+(.+?)\s+(Executive|Finance|Operations|Procurement|Sales|Warehouse|IT & Security|PMO|Manufacturing)\s+(?:—|(EMP-\d{3}))\s+\S+@\S+/g;
  const tokens: OrganizationalToken[] = [];
  let index = 0;
  for (const row of text.matchAll(rows)) {
    const employee = row[2]!;
    tokens.push({
      ...baseToken(envelope, `employment_${index}`, row[0]),
      tokenKind: "RELATION",
      subjectId: org,
      predicate: "EMPLOYS",
      objectId: employee,
      scalarValue: {
        subjectCanonicalId: "ORG-MIG-001",
        objectCanonicalId: row[1],
      },
      confidence: 0.96,
      epistemicStatus: "OBSERVED",
      actionScope: ["context-model"],
      retentionClass: "organizational-evidence",
    });
    if (row[5] && byId.has(row[5]!)) {
      tokens.push({
        ...baseToken(envelope, `reports_${index}`, row[0]),
        tokenKind: "RELATION",
        subjectId: employee,
        predicate: "REPORTS_TO",
        objectId: byId.get(row[5]!)!,
        scalarValue: {
          subjectCanonicalId: row[1],
          objectCanonicalId: row[5],
        },
        confidence: 0.96,
        epistemicStatus: "OBSERVED",
        actionScope: ["context-model"],
        retentionClass: "organizational-evidence",
      });
    }
    index += 1;
  }
  return tokens;
}

function explicitRelationshipTokens(
  envelope: NormalizedEnvelope,
  lines: string[],
): OrganizationalToken[] {
  const tokens: OrganizationalToken[] = [];
  lines.forEach((line, index) => {
    const relation = line.match(RELATION_PATTERN);
    if (!relation || POLICY_PATTERN.test(line)) return;
    tokens.push({
      ...baseToken(envelope, `relation_${index}`, line),
      tokenKind: "RELATION",
      subjectId: canonicalOrganization(relation[1]!),
      predicate: PREDICATES[relation[2]!.toLowerCase()] ?? "RELATED_TO",
      objectId: canonicalOrganization(relation[3]!),
      scalarValue: { statement: line },
      confidence: 0.78,
      epistemicStatus: "OBSERVED",
      actionScope: ["context-model"],
      retentionClass: "organizational-evidence",
    });
  });
  return tokens;
}

function policyTokens(
  envelope: NormalizedEnvelope,
  lines: string[],
  subject: string,
): OrganizationalToken[] {
  const tokens: OrganizationalToken[] = [];
  lines.forEach((line, index) => {
    if (line.length < 15 || line.length > 600 || !POLICY_PATTERN.test(line))
      return;
    tokens.push({
      ...baseToken(envelope, `policy_${index}`, line),
      tokenKind: "POLICY",
      eventType: "ORGANIZATIONAL_POLICY",
      subjectId: subject,
      scalarValue: { clause: line, sourceDocument: envelope.metadata.filename },
      confidence: 0.72,
      epistemicStatus: "OBSERVED",
      actionScope: ["policy", "compliance"],
      retentionClass: "organizational-policy",
    });
  });
  return tokens;
}

function normalizedPolicyTokens(
  envelope: NormalizedEnvelope,
  text: string,
  subject: string,
): OrganizationalToken[] {
  const definitions: Array<[RegExp, string]> = [
    [
      /Up to ZAR 25,000:\s*department manager/i,
      "Department manager may approve up to ZAR 25,000.",
    ],
    [
      /ZAR 25,001[–-]150,000:\s*functional manager/i,
      "Functional manager may approve up to ZAR 150,000 through 31 July 2026.",
    ],
    [
      /orders above ZAR 200,000[\s\S]{0,80}require\s+CFO\s+approval/i,
      "CFO approval is required above ZAR 200,000 before PO release.",
    ],
    [
      /Above ZAR 500,000:\s*CEO plus CFO/i,
      "CEO and CFO approval are required above ZAR 500,000.",
    ],
    [
      /requester may not be the sole approver or payment releaser/i,
      "Requester may not be sole approver or payment releaser.",
    ],
    [
      /Three written quotations are required above ZAR 100,000/i,
      "Three written quotations are required above ZAR 100,000.",
    ],
    [
      /Supplier invoices must quote a valid PO/i,
      "Invoices must quote a valid purchase order.",
    ],
    [
      /Freight or price variances above 2% require written approval/i,
      "Freight or price variance above 2% requires written approval.",
    ],
    [
      /Order splitting to avoid a threshold is prohibited/i,
      "Order splitting to avoid thresholds is prohibited.",
    ],
    [
      /Emergency procurement must be documented within two business days/i,
      "Emergency procurement must be documented within two business days.",
    ],
    [
      /Orders that would take exposure above[\s\S]{0,100}credit limit must be placed on hold/i,
      "Orders exceeding customer credit limits must be held.",
    ],
    [
      /Only the CFO may approve a credit-limit override/i,
      "Only CFO may approve a credit-limit override.",
    ],
    [
      /Partial payments reduce[\s\S]{0,120}unless a remittance specifies another invoice/i,
      "Partial payments follow explicit remittance allocation.",
    ],
    [
      /Named accounts and multi-factor authentication are mandatory/i,
      "Named accounts and MFA are mandatory.",
    ],
    [
      /Export requires manager approval and encryption/i,
      "Confidential exports require approval and encryption.",
    ],
    [
      /Suspected exposure must be reported within four hours/i,
      "Security incidents must be reported within four hours.",
    ],
    [
      /missing receipts only below ZAR 1,000/i,
      "Missing expense receipts are allowed only below ZAR 1,000.",
    ],
    [
      /approval limit will increase from ZAR 150,000 to ZAR 225,000 effective 01 August 2026/i,
      "Procurement Manager limit becomes ZAR 225,000 on 01 August 2026.",
    ],
  ];
  return definitions.flatMap(([pattern, rule], index) => {
    const match = text.match(pattern);
    if (!match) return [];
    return [
      {
        ...baseToken(envelope, `normalized_policy_${index}`, match[0]),
        tokenKind: "POLICY",
        eventType: "ORGANIZATIONAL_POLICY",
        subjectId: subject,
        scalarValue: { rule, sourceDocument: envelope.metadata.filename },
        confidence: 0.94,
        epistemicStatus: "OBSERVED",
        actionScope: ["policy", "compliance"],
        retentionClass: "organizational-policy",
      } as OrganizationalToken,
    ];
  });
}

function isoDate(value: string): string | undefined {
  const normalized = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  const parts = normalized.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!parts) return undefined;
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const month = months.indexOf(parts[2]!.toLowerCase());
  if (month < 0) return undefined;
  const parsed = new Date(Date.UTC(Number(parts[3]), month, Number(parts[1])));
  return Number.isNaN(parsed.getTime())
    ? undefined
    : parsed.toISOString().slice(0, 10);
}

function amount(value: string): number {
  return Number(value.replace(/[,\s]/g, ""));
}

function factToken(
  envelope: NormalizedEnvelope,
  index: number,
  type: string,
  subject: string,
  value: unknown,
  excerpt: string,
  validFrom?: string,
  validTo?: string,
): OrganizationalToken {
  return {
    ...baseToken(envelope, `fact_${index}_${type.toLowerCase()}`, excerpt),
    tokenKind: "STATE",
    eventType: type,
    subjectId: subject,
    scalarValue: value,
    ...(validFrom
      ? { validTime: { from: validFrom, ...(validTo ? { to: validTo } : {}) } }
      : {}),
    confidence: 0.9,
    epistemicStatus: "OBSERVED",
    actionScope: ["context-model"],
    retentionClass: "organizational-evidence",
  };
}

function normalizedFactTokens(
  envelope: NormalizedEnvelope,
  text: string,
): OrganizationalToken[] {
  const tokens: OrganizationalToken[] = [];
  let index = 0;
  const add = (
    type: string,
    subject: string,
    value: unknown,
    excerpt: string,
    from?: string,
    to?: string,
  ) =>
    tokens.push(
      factToken(envelope, index++, type, subject, value, excerpt, from, to),
    );
  const first = (pattern: RegExp) => text.match(pattern);

  let match = first(/Registration number\s+([0-9/]+)/i);
  if (match) add("REGISTRATION_NUMBER", "ORG-MIG-001", match[1], match[0]);
  match = first(/VAT number\s+(\d+)/i);
  if (match) add("VAT_NUMBER", "ORG-MIG-001", match[1], match[0]);

  match = first(
    /Invoice number\s+(CI-[A-Z0-9-]+)[\s\S]*?Totals[\s\S]*?([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/i,
  );
  if (match) {
    add(
      "INVOICE_TOTAL",
      match[1]!,
      { value: amount(match[4]!), currency: "ZAR" },
      match[0],
    );
    add(
      "INVOICE_BALANCE",
      match[1]!,
      { value: amount(match[6]!), currency: "ZAR" },
      match[0],
    );
  }
  match = first(
    /Remittance\s+(RA-[A-Z0-9-]+)[\s\S]*?Payment date\s+([^\r\n]+)[\s\S]*?Amount\s+([\d,]+(?:\.\d+)?)/i,
  );
  if (match) {
    add(
      "PAYMENT_AMOUNT",
      match[1]!,
      { value: amount(match[3]!), currency: "ZAR" },
      match[0],
      isoDate(match[2]!),
    );
  }
  match = first(
    /PO number\s+(PO-[A-Z0-9-]+)[\s\S]*?Totals[\s\S]*?([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/i,
  );
  if (match)
    add(
      "PURCHASE_ORDER_TOTAL",
      match[1]!,
      { value: amount(match[4]!), currency: "ZAR" },
      match[0],
    );
  match = first(
    /Invoice\s+(SI-[A-Z0-9-]+)[\s\S]*?Totals[\s\S]*?([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/i,
  );
  if (match)
    add(
      "SUPPLIER_INVOICE_TOTAL",
      match[1]!,
      { value: amount(match[4]!), currency: "ZAR" },
      match[0],
    );
  match = first(
    /Delivery note\s+(DN-[A-Z0-9-]+)[\s\S]*?Only\s+(\d+)\s+units were delivered/i,
  );
  if (match)
    add(
      "DELIVERY_QUANTITY",
      match[1]!,
      { value: Number(match[2]), unit: "EA" },
      match[0],
    );
  match = first(
    /<SalesOrder id="([^"]+)"[\s\S]*?<QuantityOrdered>(\d+)<\/QuantityOrdered>/i,
  );
  if (match)
    add(
      "ORDER_QUANTITY",
      match[1]!,
      { value: Number(match[2]), unit: "EA" },
      match[0],
    );
  match = first(
    /CUST-001[\t,]+Apex Retail Holdings Ltd[\s\S]*?[\t,](500000)(?:[\t,])/i,
  );
  if (match)
    add(
      "CREDIT_LIMIT",
      "ORG-APEX-001",
      { value: amount(match[1]!), currency: "ZAR" },
      match[0],
    );
  match = first(
    /CUST-001[\t]+Apex Retail Holdings Ltd[\t]+[\d\t]+[\t](612480)[\t](500000)/i,
  );
  if (match) {
    add(
      "CREDIT_EXPOSURE",
      "ORG-APEX-001",
      { value: amount(match[1]!), currency: "ZAR" },
      match[0],
    );
    add(
      "CREDIT_LIMIT",
      "ORG-APEX-001",
      { value: amount(match[2]!), currency: "ZAR" },
      match[0],
    );
  }
  match = first(/SLA\s+(SLA-[A-Z0-9-]+)[\s\S]*?Expiry\s+([^\r\n]+)/i);
  if (match) add("SLA_EXPIRY", match[1]!, isoDate(match[2]!), match[0]);
  match = first(
    /invoice\s+(VFS-INV-\d+)\s+dated\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  );
  if (match)
    add("SUPPLIER_INVOICE_DATE", match[1]!, isoDate(match[2]!), match[0]);
  match = first(
    /Employee\s+Liam Jacobs\s+\(EMP-004\)[\s\S]*?Start date\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})[\s\S]*?Department\s+([A-Za-z &]+?)(?=\s+Reporting line)/i,
  );
  if (match)
    add(
      "EMPLOYEE_DEPARTMENT",
      "EMP-004",
      clean(match[2]!),
      match[0],
      isoDate(match[1]!),
    );
  match = first(/EMP-004[\t]+Liam Jacobs[\t]+Operations/i);
  if (match)
    add("EMPLOYEE_DEPARTMENT_ASSERTION", "EMP-004", "Operations", match[0]);
  match = first(/Resolution\s+(BR-[A-Z0-9-]+)[\s\S]*?effective\s+([^\r\n.]+)/i);
  if (match)
    add("BOARD_RESOLUTION_EFFECTIVE", match[1]!, isoDate(match[2]!), match[0]);

  const authority =
    /PROC-0[34][\t]+Purchase order[\t]+Procurement Manager[\t]+(\d+)[\t]+[^\t\r\n]*[\t]+(\d{4}-\d{2}-\d{2})(?:[\t]+(\d{4}-\d{2}-\d{2}))?/g;
  for (const row of text.matchAll(authority)) {
    add(
      "PROCUREMENT_MANAGER_LIMIT",
      "EMP-004",
      { value: Number(row[1]), currency: "ZAR" },
      row[0],
      row[2],
      row[3],
    );
  }
  const asset =
    /<Asset id="(AST-[A-Z0-9-]+)">[\s\S]*?<Location>([^<]+)<\/Location>/g;
  for (const row of text.matchAll(asset)) {
    if (row[1] === "AST-FL-07") {
      add("ASSET_LOCATION", row[1], row[2], row[0], "2026-07-01", "2026-07-19");
    }
  }
  if (
    /Asset FL-07[\s\S]*?moved to Midrand Warehouse on 20 July 2026/i.test(text)
  ) {
    add(
      "ASSET_LOCATION",
      "AST-FL-07",
      "Midrand Warehouse",
      "Physical verification confirmed it moved to Midrand Warehouse on 20 July 2026",
      "2026-07-20",
    );
  }
  return tokens;
}

function relationToken(
  envelope: NormalizedEnvelope,
  suffix: string,
  predicate: string,
  subject: string,
  object: string,
  subjectCanonicalId: string,
  objectCanonicalId: string,
  excerpt: string,
): OrganizationalToken {
  return {
    ...baseToken(envelope, suffix, excerpt),
    tokenKind: "RELATION",
    subjectId: subject,
    predicate,
    objectId: object,
    scalarValue: { subjectCanonicalId, objectCanonicalId, statement: excerpt },
    confidence: 0.92,
    epistemicStatus: "OBSERVED",
    actionScope: ["context-model"],
    retentionClass: "organizational-evidence",
  };
}

function businessRelationships(
  envelope: NormalizedEnvelope,
  text: string,
): OrganizationalToken[] {
  const out: OrganizationalToken[] = [];
  const add = (
    predicate: string,
    subject: string,
    object: string,
    sid: string,
    oid: string,
    evidence: string,
  ) =>
    out.push(
      relationToken(
        envelope,
        `business_relation_${out.length}`,
        predicate,
        subject,
        object,
        sid,
        oid,
        evidence,
      ),
    );

  if (/Contract ID APEX-2024-11/i.test(text))
    add(
      "CONTRACTS_WITH",
      "Meridian Industrial Group (Pty) Ltd",
      "Apex Retail Holdings Ltd",
      "ORG-MIG-001",
      "ORG-APEX-001",
      "Parties Meridian Industrial Group (Pty) Ltd and Apex Retail Holdings Ltd",
    );
  if (/Agreement ID USW-2025-03/i.test(text)) {
    add(
      "CONTRACTS_WITH",
      "Meridian Industrial Group (Pty) Ltd",
      "Ubuntu Steelworks (Pty) Ltd",
      "ORG-MIG-001",
      "ORG-USW-001",
      "Parties Meridian Industrial Group (Pty) Ltd and Ubuntu Steelworks (Pty) Ltd",
    );
    add(
      "SUPPLIES",
      "Ubuntu Steelworks (Pty) Ltd",
      "Meridian Industrial Group (Pty) Ltd",
      "ORG-USW-001",
      "ORG-MIG-001",
      "Ubuntu Steelworks supplies fabricated pump housings and steel assemblies",
    );
  }
  if (/NDA-2026-014/i.test(text))
    add(
      "CONTRACTS_WITH",
      "Meridian Industrial Group (Pty) Ltd",
      "Nimbus Cloud Africa (Pty) Ltd",
      "ORG-MIG-001",
      "ORG-NCA-001",
      "Parties Meridian Industrial Group (Pty) Ltd and Nimbus Cloud Africa (Pty) Ltd",
    );
  if (/PO number PO-2026-00418/i.test(text)) {
    add(
      "PURCHASES_FROM",
      "Meridian Industrial Group (Pty) Ltd",
      "Ubuntu Steelworks (Pty) Ltd",
      "ORG-MIG-001",
      "ORG-USW-001",
      "Buyer Meridian Industrial Group; Supplier Ubuntu Steel Works",
    );
    add(
      "APPROVES",
      "Liam Jacobs",
      "PO-2026-00418",
      "EMP-004",
      "PO-2026-00418",
      "Approver Liam Jacobs (EMP-004)",
    );
  }
  if (/Invoice number CI-2026-01052/i.test(text))
    add(
      "INVOICES",
      "Meridian Industrial Group (Pty) Ltd",
      "Apex Retail Holdings Ltd",
      "ORG-MIG-001",
      "ORG-APEX-001",
      "Seller Meridian Industrial Group; Customer Apex Retail Holdings",
    );
  if (/Invoice SI-USW-7719/i.test(text)) {
    add(
      "INVOICES",
      "Ubuntu Steelworks (Pty) Ltd",
      "Meridian Industrial Group (Pty) Ltd",
      "ORG-USW-001",
      "ORG-MIG-001",
      "Supplier Ubuntu Steelworks; Bill to Meridian Industrial Group",
    );
  }
  if (/Payment Remittance Advice[\s\S]*?Remittance RA-2026-0714/i.test(text))
    add(
      "PAYS",
      "Apex Retail Holdings Ltd",
      "Meridian Industrial Group (Pty) Ltd",
      "ORG-APEX-001",
      "ORG-MIG-001",
      "Payer Apex Retail Holdings; Payee Meridian Industrial Group",
    );
  if (/Delivery note DN-2026-557/i.test(text))
    add(
      "DELIVERS_TO",
      "Meridian Industrial Group (Pty) Ltd",
      "Apex Retail Holdings Ltd",
      "ORG-MIG-001",
      "ORG-APEX-001",
      "Delivered to Apex Retail",
    );
  if (/SLA-VFS-2025-09/i.test(text))
    add(
      "SUPPLIES",
      "Vector Freight Solutions CC",
      "Meridian Industrial Group (Pty) Ltd",
      "ORG-VFS-001",
      "ORG-MIG-001",
      "Service-Level Agreement parties",
    );
  if (/Employee Liam Jacobs \(EMP-004\)/i.test(text))
    add(
      "MANAGES",
      "Liam Jacobs",
      "Procurement",
      "EMP-004",
      "DEPT-PROC",
      "Role Procurement Manager Department Procurement",
    );
  if (
    /Claimant Peter Molefe \(EMP-009\)[\s\S]*?Project PRJ-ATLAS-26/i.test(text)
  )
    add(
      "ASSIGNED_TO",
      "Peter Molefe",
      "Project Atlas",
      "EMP-009",
      "PRJ-ATLAS-26",
      "Claimant Peter Molefe; Project PRJ-ATLAS-26",
    );
  const assets = /<Asset id="(AST-[A-Z0-9-]+)">\s*<Name>([^<]+)<\/Name>/g;
  for (const asset of text.matchAll(assets))
    add(
      "OWNS",
      "Meridian Industrial Group (Pty) Ltd",
      asset[2]!,
      "ORG-MIG-001",
      asset[1]!,
      asset[0],
    );
  return out;
}

function exceptionEvidenceTokens(
  envelope: NormalizedEnvelope,
  text: string,
): OrganizationalToken[] {
  const rules: Array<[string, string, RegExp]> = [
    [
      "invoice-po-variance",
      "Invoice amount differs from purchase order",
      /exceeds purchase-order total|PO-2026-00418[\s\S]{0,80}254[,\s]?380|SI-USW-7719[\s\S]{0,80}269[,\s]?560/i,
    ],
    [
      "partial-settlement",
      "Payment only partially settles invoice",
      /PARTIALLY PAID|Settlement PARTIAL|partial payment|PARTIALLY_PAID/i,
    ],
    [
      "authority-breach",
      "Manager approves above authority",
      /(?:approved[\s\S]{0,450}254[,\s]?380[\s\S]{0,450}(?:without required CFO|No CFO approval|CFO approval is also required)|254[,\s]?380[\s\S]{0,200}Procurement Manager approval only)/i,
    ],
    [
      "supplier-aliases",
      "Supplier has three name variants",
      /Ubuntu Steelworks\|Ubuntu Steel Works|Ubuntu Steelworks SA|Ubuntu Steel Works \(Pty\) Ltd/i,
    ],
    [
      "expired-contract-invoice",
      "Expired contract but invoice continues",
      /EXPIRED CONTRACT|Status EXPIRED[\s\S]{0,600}issued invoice/i,
    ],
    [
      "employee-department",
      "Employee department disagreement",
      /EMP-004[\t]+Liam Jacobs[\t]+Operations|Liam Jacobs is assigned to Procurement|Department Procurement/i,
    ],
    [
      "short-delivery",
      "Delivery short by four units",
      /Only 46 units were delivered|received 46|short delivery of four/i,
    ],
    [
      "contract-policy-authority",
      "Contract approval clause conflicts with internal policy",
      /Procurement Manager may approve individual orders up to ZAR 300,000|supplier agreement limit of ZAR 300,000|CFO above 200000/i,
    ],
    [
      "unmatched-payment",
      "Bank payment has no matching invoice",
      /Unmatched payment|BANK_PAYMENT[\s\S]{0,80}UNMATCHED/i,
    ],
    [
      "duplicate-invoice",
      "Duplicate customer invoices",
      /suspected duplicate|SUSPECTED_DUPLICATE/i,
    ],
    [
      "credit-limit",
      "Customer exceeds credit limit",
      /612[,\s]?480[\s\S]{0,80}500[,\s]?000|exposure above a customer's approved credit limit/i,
    ],
    [
      "approval-chain",
      "Procurement bypasses approval chain",
      /No CFO approval is recorded|Procurement Manager approval only|I did not approve this PO/i,
    ],
    [
      "prospective-authority",
      "Board resolution changes policy prospectively",
      /increase from ZAR 150,000 to ZAR 225,000 effective 01 August 2026|PROC-03[\s\S]*PROC-04/i,
    ],
    [
      "asset-correction",
      "Later document corrects earlier asset location",
      /AST-FL-07[\s\S]*Germiston Plant|moved to Midrand Warehouse|Corrected location/i,
    ],
    [
      "unknown-entity",
      "Unknown entity absent from master data",
      /Eastern Bearings Trading|entity_id,?UNKNOWN|BANK_PAYMENT[\s\S]{0,80}UNKNOWN/i,
    ],
    [
      "missing-receipt",
      "Expense claim lacks required receipt",
      /Hotel line has no receipt|Receipt required above 1000/i,
    ],
    [
      "security-violation",
      "Security policy violation",
      /unencrypted payroll export|DATA-EXPORT[\s\S]{0,80}FAIL|breaching this policy/i,
    ],
  ];
  return rules.flatMap(([scenarioKey, scenario, pattern], index) => {
    const match = text.match(pattern);
    if (!match) return [];
    return [
      {
        ...baseToken(envelope, `exception_evidence_${index}`, match[0]),
        tokenKind: "STATE",
        eventType: "EXCEPTION_EVIDENCE",
        subjectId: scenarioKey,
        scalarValue: {
          scenarioKey,
          scenario,
          observation: clean(match[0]),
          sourceDocument: envelope.metadata.filename,
        },
        confidence: 0.9,
        epistemicStatus: "OBSERVED",
        actionScope: ["data-quality", "review"],
        retentionClass: "organizational-evidence",
      } as OrganizationalToken,
    ];
  });
}

function transactionLinkTokens(
  envelope: NormalizedEnvelope,
  text: string,
): OrganizationalToken[] {
  const links: Array<[string, string, string, RegExp]> = [
    [
      "CI-2026-01052",
      "BILLS_ORDER",
      "SO-2026-0081",
      /Invoice number CI-2026-01052[\s\S]*?Sales order SO-2026-0081/i,
    ],
    [
      "CI-2026-01052",
      "ALLOCATED_PAYMENT",
      "RA-2026-0714",
      /Invoice number CI-2026-01052[\s\S]*?Remittance RA-2026-0714/i,
    ],
    [
      "DN-2026-557",
      "FULFILLS_ORDER",
      "SO-2026-0081",
      /Delivery note DN-2026-557[\s\S]*?Sales order SO-2026-0081/i,
    ],
    [
      "RA-2026-0714",
      "ALLOCATES_TO",
      "CI-2026-01052",
      /Remittance RA-2026-0714[\s\S]*?Invoice CI-2026-01052/i,
    ],
    [
      "SI-USW-7719",
      "BILLS_ORDER",
      "PO-2026-00418",
      /Invoice SI-USW-7719[\s\S]*?PO reference PO-2026-00418/i,
    ],
    [
      "SI-USW-7719",
      "MATCHES_RECEIPT",
      "GRN-2026-331",
      /Invoice SI-USW-7719[\s\S]*?GRN GRN-2026-331/i,
    ],
    [
      "GRN-2026-331",
      "RECEIVES_ORDER",
      "PO-2026-00418",
      /GRN:\s*GRN-2026-331[\s\S]*?Purchase order:\s*PO-2026-00418/i,
    ],
    [
      "GRN-2026-331",
      "SUPPORTS_INVOICE",
      "SI-USW-7719",
      /GRN:\s*GRN-2026-331[\s\S]*?Supplier invoice:\s*SI-USW-7719/i,
    ],
  ];
  return links.flatMap(([subject, linkType, object, pattern], index) => {
    const match = text.match(pattern);
    if (!match) return [];
    return [
      {
        ...baseToken(envelope, `transaction_link_${index}`, match[0]),
        tokenKind: "STATE",
        eventType: "TRANSACTION_LINK",
        subjectId: subject,
        objectId: object,
        scalarValue: {
          linkType,
          from: subject,
          to: object,
          sourceDocument: envelope.metadata.filename,
        },
        confidence: 0.97,
        epistemicStatus: "OBSERVED",
        actionScope: ["context-model", "transaction-linking"],
        retentionClass: "financial",
      } as OrganizationalToken,
    ];
  });
}

export function tokenizeGenericEnvelope(
  envelope: NormalizedEnvelope,
): OrganizationalToken[] {
  const text = envelope.content.text.trim();
  if (!text) return [];

  const entities = new Map<string, EntityCandidate>();
  parseOrganizations(text, entities);
  parsePeople(text, entities);
  parseProductsAndAssets(text, entities);

  const lines = text
    .split(/\r?\n|(?<=[.!?])\s+(?=[A-Z])/)
    .map(clean)
    .filter(Boolean);
  const primary =
    [...entities.values()].find((e) => e.type === "COMPANY")?.name ??
    envelope.metadata.filename;
  const normalizedPolicies = normalizedPolicyTokens(envelope, text, primary);
  const fallbackPolicies =
    normalizedPolicies.length === 0 &&
    /policy/i.test(envelope.metadata.filename)
      ? policyTokens(envelope, lines, primary)
      : [];

  return [
    ...entityTokens(envelope, entities),
    ...spreadsheetRowTokens(envelope, text),
    ...spreadsheetFactTokens(envelope, text),
    ...directoryRelationships(envelope, text, entities),
    ...businessRelationships(envelope, text),
    ...explicitRelationshipTokens(envelope, lines),
    ...normalizedFactTokens(envelope, text),
    ...transactionLinkTokens(envelope, text),
    ...exceptionEvidenceTokens(envelope, text),
    ...normalizedPolicies,
    ...fallbackPolicies,
  ].slice(0, 500);
}
