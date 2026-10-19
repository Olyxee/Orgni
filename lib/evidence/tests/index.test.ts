/**
 * Evidence Retrieval Unit Tests
 *
 * Tests for keyword/entity matching, relevance ordering, empty results,
 * and retrieval bounds. Uses mocked repository for isolation.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  retrieveEvidence,
  retrieveEvidenceByType,
  extractKeywords,
  normalizeText,
} from "../src/index.js";

/**
 * Mock repository for testing evidence retrieval without database.
 */
function createMockRepository(
  tokens: Array<{
    sourceId: string;
    sourceFilename: string;
    sourceMimeType: string;
    tokenId: string;
    tokenKind: string;
    token: Record<string, unknown>;
    matchScore: number;
    matchType: "keyword" | "entity_type" | "entity_id";
  }>,
) {
  return {
    findEvidence: vi.fn().mockResolvedValue(tokens),
  };
}

describe("normalizeText", () => {
  it("lowercases and trims input", () => {
    expect(normalizeText("  HELLO  ")).toBe("hello");
  });

  it("handles mixed case", () => {
    expect(normalizeText("InVoIcE")).toBe("invoice");
  });

  it("handles empty string", () => {
    expect(normalizeText("")).toBe("");
  });
});

describe("extractKeywords", () => {
  it("splits on whitespace and filters short terms", () => {
    expect(extractKeywords("invoice total amount 2024")).toEqual([
      "invoice",
      "total",
      "amount",
      "2024",
    ]);
  });

  it("handles single word query", () => {
    expect(extractKeywords("invoice")).toEqual(["invoice"]);
  });

  it("filters out single-character terms", () => {
    expect(extractKeywords("a b c invoice")).toEqual(["invoice"]);
  });

  it("handles empty query", () => {
    expect(extractKeywords("")).toEqual([]);
  });

  it("handles multiple spaces", () => {
    expect(extractKeywords("invoice   total    amount")).toEqual([
      "invoice",
      "total",
      "amount",
    ]);
  });
});

describe("retrieveEvidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty result for empty query", async () => {
    const mockRepo = createMockRepository([]);
    const result = await retrieveEvidence(mockRepo, "tenant_a", "", {});
    expect(result.evidence).toEqual([]);
    expect(result.totalScanned).toBe(0);
    expect(result.totalMatched).toBe(0);
  });

  it("returns matched evidence sorted by score", async () => {
    const mockTokens = [
      {
        sourceId: "src_1",
        sourceFilename: "invoice.pdf",
        sourceMimeType: "application/pdf",
        tokenId: "tok_1",
        tokenKind: "EVENT",
        token: { eventType: "INVOICE_ISSUED", amount: 1000 },
        matchScore: 3,
        matchType: "keyword" as const,
      },
      {
        sourceId: "src_2",
        sourceFilename: "payment.pdf",
        sourceMimeType: "application/pdf",
        tokenId: "tok_2",
        tokenKind: "EVENT",
        token: { eventType: "PAYMENT_RECEIVED", amount: 500 },
        matchScore: 1,
        matchType: "keyword" as const,
      },
    ];
    const mockRepo = createMockRepository(mockTokens);

    const result = await retrieveEvidence(mockRepo, "tenant_a", "invoice payment", {});

    expect(result.evidence).toHaveLength(2);
    expect(result.evidence[0].matchScore).toBe(3);
    expect(result.evidence[1].matchScore).toBe(1);
  });

  it("enforces maxRecords limit", async () => {
    const mockTokens = Array.from({ length: 25 }, (_, i) => ({
      sourceId: `src_${i}`,
      sourceFilename: `doc_${i}.pdf`,
      sourceMimeType: "application/pdf",
      tokenId: `tok_${i}`,
      tokenKind: "EVENT",
      token: { eventType: "TEST" },
      matchScore: 1,
      matchType: "keyword" as const,
    }));
    const mockRepo = createMockRepository(mockTokens);

    const result = await retrieveEvidence(mockRepo, "tenant_a", "test", {
      maxRecords: 5,
    });

    expect(result.evidence).toHaveLength(5);
  });

  it("enforces maxTextLength bound", async () => {
    const token1 = {
      sourceId: "src_1",
      sourceFilename: "doc1.pdf",
      sourceMimeType: "application/pdf",
      tokenId: "tok_1",
      tokenKind: "EVENT",
      token: { description: "x".repeat(400) }, // ~402 chars with JSON overhead
      matchScore: 1,
      matchType: "keyword" as const,
    };
    const token2 = {
      sourceId: "src_2",
      sourceFilename: "doc2.pdf",
      sourceMimeType: "application/pdf",
      tokenId: "tok_2",
      tokenKind: "EVENT",
      token: { description: "y".repeat(400) }, // ~402 chars with JSON overhead
      matchScore: 1,
      matchType: "keyword" as const,
    };
    const mockRepo = createMockRepository([token1, token2]);

    const result = await retrieveEvidence(mockRepo, "tenant_a", "test", {
      maxTextLength: 500, // Only first token fits (402 + second would be 804 > 500)
    });

    // First token fits, second would exceed the limit
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0].sourceId).toBe("src_1");
    expect(result.truncated).toBe(true);
  });

  it("filters by token kinds when specified", async () => {
    const mockTokens = [
      {
        sourceId: "src_1",
        sourceFilename: "doc.pdf",
        sourceMimeType: "application/pdf",
        tokenId: "tok_1",
        tokenKind: "EVENT",
        token: { eventType: "INVOICE" },
        matchScore: 1,
        matchType: "keyword" as const,
      },
      {
        sourceId: "src_2",
        sourceFilename: "doc.pdf",
        sourceMimeType: "application/pdf",
        tokenId: "tok_2",
        tokenKind: "ENTITY",
        token: { entityType: "VENDOR" },
        matchScore: 1,
        matchType: "entity_type" as const,
      },
    ];
    const mockRepo = createMockRepository(mockTokens);

    const result = await retrieveEvidence(mockRepo, "tenant_a", "test", {
      tokenKinds: ["ENTITY"],
    });

    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0].tokenKind).toBe("ENTITY");
  });

  it("filters by minimum score", async () => {
    const mockTokens = [
      {
        sourceId: "src_1",
        sourceFilename: "doc.pdf",
        sourceMimeType: "application/pdf",
        tokenId: "tok_1",
        tokenKind: "EVENT",
        token: { eventType: "INVOICE" },
        matchScore: 5,
        matchType: "keyword" as const,
      },
      {
        sourceId: "src_2",
        sourceFilename: "doc.pdf",
        sourceMimeType: "application/pdf",
        tokenId: "tok_2",
        tokenKind: "EVENT",
        token: { eventType: "PAYMENT" },
        matchScore: 1,
        matchType: "keyword" as const,
      },
    ];
    const mockRepo = createMockRepository(mockTokens);

    const result = await retrieveEvidence(mockRepo, "tenant_a", "test", {
      minScore: 3,
    });

    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0].matchScore).toBe(5);
  });

  it("preserves source information in results", async () => {
    const mockTokens = [
      {
        sourceId: "src_invoice_123",
        sourceFilename: "invoice_123.pdf",
        sourceMimeType: "application/pdf",
        tokenId: "tok_1",
        tokenKind: "EVENT",
        token: { eventType: "INVOICE_ISSUED", total: 1500 },
        matchScore: 2,
        matchType: "keyword" as const,
      },
    ];
    const mockRepo = createMockRepository(mockTokens);

    const result = await retrieveEvidence(mockRepo, "tenant_a", "invoice", {});

    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0].sourceId).toBe("src_invoice_123");
    expect(result.evidence[0].sourceFilename).toBe("invoice_123.pdf");
    expect(result.evidence[0].sourceMimeType).toBe("application/pdf");
  });

  it("includes metadata in response", async () => {
    const mockRepo = createMockRepository([]);
    const result = await retrieveEvidence(mockRepo, "tenant_billing", "invoice total", {
      tokenKinds: ["EVENT"],
    });

    expect(result.metadata.tenantId).toBe("tenant_billing");
    expect(result.metadata.queryKeywords).toContain("invoice");
    expect(result.metadata.queryKeywords).toContain("total");
    expect(result.metadata.queryEntityTypes).toEqual(["EVENT"]);
  });

  it("returns empty when no matches found", async () => {
    const mockRepo = createMockRepository([]);
    const result = await retrieveEvidence(mockRepo, "tenant_a", "xyz no match", {});
    expect(result.evidence).toEqual([]);
    expect(result.totalMatched).toBe(0);
  });
});

describe("retrieveEvidenceByType", () => {
  it("retrieves evidence filtered by entity types", async () => {
    const mockTokens = [
      {
        sourceId: "src_1",
        sourceFilename: "doc.pdf",
        sourceMimeType: "application/pdf",
        tokenId: "tok_1",
        tokenKind: "RELATION",
        token: { predicate: "OWNS" },
        matchScore: 2,
        matchType: "entity_type" as const,
      },
    ];
    const mockRepo = createMockRepository(mockTokens);

    const result = await retrieveEvidenceByType(mockRepo, "tenant_a", ["RELATION"]);

    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0].tokenKind).toBe("RELATION");
  });
});