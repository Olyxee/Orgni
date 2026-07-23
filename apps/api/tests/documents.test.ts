/**
 * API upload endpoint tests.
 *
 * Document Intelligence is replaced by a local stub HTTP server, but everything
 * downstream is the real thing: the real ingestion pipeline, real envelope
 * validation, and the real tokenizer. So these tests exercise the genuine
 * endpoint → pipeline → tokens path, only standing in for the Python service.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";

const INVOICE_ENVELOPE = {
  source_id: "src_test",
  source_type: "UPLOAD",
  document_type: "INVOICE",
  content: { text: "TAX INVOICE ...", language: "en" },
  extracted_fields: {
    invoiceNumber: {
      value: "INV-1",
      confidence: 0.9,
      method: "RULE_MATCH",
      page: 1,
    },
    invoiceDate: {
      value: "2024-03-15",
      confidence: 0.9,
      method: "RULE_MATCH",
      page: 1,
    },
    vendorName: {
      value: "Olyxee AI (Pty) Ltd",
      confidence: 0.8,
      method: "RULE_MATCH",
      page: 1,
    },
    buyerName: {
      value: "Clover Retail Group",
      confidence: 0.8,
      method: "RULE_MATCH",
      page: 1,
    },
    totalAmount: {
      value: 13225,
      confidence: 0.9,
      method: "RULE_MATCH",
      page: 1,
    },
    currency: { value: "ZAR", confidence: 0.9, method: "RULE_MATCH", page: 1 },
  },
  tables: [],
  metadata: {
    filename: "invoice.pdf",
    mime_type: "application/pdf",
    checksum: "deadbeef",
    tenant_id: "tenant_olyxee",
  },
  evidence_locations: [],
  confidence: 0.88,
  warnings: [],
  schema_version: "0.1.0",
  extraction_status: "COMPLETE",
};

// Records the last multipart body the stub received, so tests can assert what
// the API forwarded to Document Intelligence.
let lastDiBody = "";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });
}

let diServer: Server;
let apiServer: Server;
let baseUrl: string;

beforeAll(async () => {
  // 1. Stub Document Intelligence.
  await new Promise<void>((resolve) => {
    diServer = createServer(async (req, res) => {
      lastDiBody = await readBody(req);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(INVOICE_ENVELOPE));
    });
    diServer.listen(0, resolve);
  });
  const diPort = (diServer.address() as AddressInfo).port;

  // 2. Point config at the stub BEFORE importing the app (config loads at import).
  process.env["NODE_ENV"] = "test";
  process.env["DOCUMENT_INTELLIGENCE_URL"] = `http://127.0.0.1:${diPort}`;

  const { default: app } = await import("../src/app.js");
  await new Promise<void>((resolve) => {
    apiServer = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${(apiServer.address() as AddressInfo).port}`;
});

afterAll(() => {
  apiServer?.close();
  diServer?.close();
});

function form(bytes: Uint8Array, filename: string, type: string): FormData {
  const body = new FormData();
  body.append("file", new Blob([bytes], { type }), filename);
  return body;
}

describe("POST /api/documents", () => {
  it("returns evidence-backed tokens for an invoice", async () => {
    const res = await fetch(`${baseUrl}/api/documents`, {
      method: "POST",
      headers: { "x-tenant-id": "tenant_olyxee" },
      body: form(
        new TextEncoder().encode("%PDF-1.4 fake"),
        "invoice.pdf",
        "application/pdf",
      ),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schemaVersion).toBe("0.1.0");
    expect(body.documentType).toBe("INVOICE");
    expect(Array.isArray(body.tokens)).toBe(true);
    expect(body.tokens.length).toBeGreaterThan(0);
    for (const token of body.tokens) {
      expect(token.tenantId).toBe("tenant_olyxee");
      expect(token.sourceRefs.length).toBeGreaterThan(0);
    }
  });

  it("rejects a request with no tenant header", async () => {
    const res = await fetch(`${baseUrl}/api/documents`, {
      method: "POST",
      body: form(
        new TextEncoder().encode("x"),
        "invoice.pdf",
        "application/pdf",
      ),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing_tenant");
  });

  it("rejects a request with no file", async () => {
    const res = await fetch(`${baseUrl}/api/documents`, {
      method: "POST",
      headers: { "x-tenant-id": "tenant_olyxee" },
      body: new FormData(),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing_file");
  });

  it("returns 422 with warnings for an unsupported type (controlled failure)", async () => {
    // Ingestion rejects the type before Document Intelligence is called.
    const res = await fetch(`${baseUrl}/api/documents`, {
      method: "POST",
      headers: { "x-tenant-id": "tenant_olyxee" },
      body: form(new TextEncoder().encode("PK"), "a.zip", "application/zip"),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.state).toBe("FAILED");
    expect(body.tokens).toHaveLength(0);
    expect(JSON.stringify(body.errors)).toContain("unsupported_mime_type");
  });

  it("forwards the tenant to Document Intelligence", async () => {
    await fetch(`${baseUrl}/api/documents`, {
      method: "POST",
      headers: { "x-tenant-id": "tenant_acme" },
      body: form(
        new TextEncoder().encode("%PDF-1.4 fake"),
        "invoice.pdf",
        "application/pdf",
      ),
    });
    // The multipart body the API forwarded carries the tenant.
    expect(lastDiBody).toContain("tenant_acme");
  });
});
