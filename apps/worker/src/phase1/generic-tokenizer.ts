import type { OrganizationalToken } from "@workspace/contracts";

import type { NormalizedEnvelope } from "../envelope/types.js";

const ORGANIZATION_PATTERN =
  /\b([A-Z][A-Za-z0-9&.'()-]*(?:[ \t]+[A-Z][A-Za-z0-9&.'()-]*){0,7}[ \t]+(?:Pty(?:[ \t]+Ltd)?|Ltd|Limited|LLC|Inc|Corporation|Company|Group|CC|PLC))\b/g;

const RELATION_PATTERN =
  /^\s*([A-Z][A-Za-z0-9&().,' -]{2,80}?)\s+(reports to|manages|employs|supplies|approves|owns|contracts with|purchases from|pays|invoices)\s+([A-Z][A-Za-z0-9&().,' -]{2,80}?)[.;]?\s*$/i;

const POLICY_PATTERN =
  /\b(must|shall|required to|required by|may not|must not|shall not|not permitted|prohibited)\b/i;

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
};

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function cleanOrganization(value: string): string {
  return clean(value).replace(
    /^.*\b(?:POLICY|REPORT|REGISTER|STATEMENT|DIRECTORY|MINUTES)\s+(?=[A-Z])/,
    "",
  );
}

function sourceRef(envelope: NormalizedEnvelope, section: string) {
  return {
    evidenceId: `ev_${envelope.source_id}`,
    sourceSystem: "orgni.document-service",
    sourceObjectId: envelope.metadata.checksum,
    checksum: envelope.metadata.checksum,
    locator: { section },
  };
}

function baseToken(
  envelope: NormalizedEnvelope,
  suffix: string,
): Pick<
  OrganizationalToken,
  | "tokenId"
  | "tenantId"
  | "transactionTime"
  | "sourceRefs"
  | "visibility"
  | "payloadRef"
> {
  return {
    tokenId: `tok_${envelope.source_id}_${suffix}`,
    tenantId: envelope.metadata.tenant_id,
    transactionTime: new Date().toISOString(),
    sourceRefs: [sourceRef(envelope, suffix)],
    visibility: [],
    payloadRef: envelope.metadata.checksum,
  };
}

export function tokenizeGenericEnvelope(
  envelope: NormalizedEnvelope,
): OrganizationalToken[] {
  const text = envelope.content.text.trim();
  if (!text) return [];

  const tokens: OrganizationalToken[] = [];
  const organizations = [
    ...new Set(
      [...text.matchAll(ORGANIZATION_PATTERN)].map((match) =>
        cleanOrganization(match[1]!),
      ),
    ),
  ].slice(0, 100);

  organizations.forEach((organization, index) => {
    tokens.push({
      ...baseToken(envelope, `entity_${index}`),
      tokenKind: "STATE",
      eventType: "DOCUMENT_ASSERTION",
      subjectId: organization,
      scalarValue: {
        sourceDocument: envelope.metadata.filename,
        assertion: "Entity explicitly named in source evidence",
      },
      confidence: 0.65,
      epistemicStatus: "OBSERVED",
      actionScope: ["context-model"],
      retentionClass: "organizational-evidence",
    });
  });

  const lines = text
    .split(/\r?\n|(?<=[.!?])\s+(?=[A-Z])/)
    .map(clean)
    .filter(Boolean);

  lines.forEach((line, index) => {
    const relation = line.match(RELATION_PATTERN);
    if (relation) {
      const subject = clean(relation[1]!);
      const phrase = relation[2]!.toLowerCase();
      const object = clean(relation[3]!);
      tokens.push({
        ...baseToken(envelope, `relation_${index}`),
        tokenKind: "RELATION",
        subjectId: subject,
        predicate: PREDICATES[phrase] ?? "RELATED_TO",
        objectId: object,
        scalarValue: { statement: line },
        confidence: 0.7,
        epistemicStatus: "OBSERVED",
        actionScope: ["context-model"],
        retentionClass: "organizational-evidence",
      });
    }

    if (line.length >= 15 && line.length <= 600 && POLICY_PATTERN.test(line)) {
      tokens.push({
        ...baseToken(envelope, `policy_${index}`),
        tokenKind: "POLICY",
        eventType: "ORGANIZATIONAL_POLICY",
        subjectId: organizations[0] ?? envelope.metadata.filename,
        scalarValue: { clause: line },
        confidence: 0.65,
        epistemicStatus: "OBSERVED",
        actionScope: ["policy", "compliance"],
        retentionClass: "organizational-policy",
      });
    }
  });

  return tokens.slice(0, 250);
}
