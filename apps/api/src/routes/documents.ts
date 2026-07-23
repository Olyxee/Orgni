import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import type { PrincipalRule } from "@workspace/contracts";
import {
  createDocumentIntelligenceClient,
  processDocument,
  toHandoff,
  type DocumentIntelligence,
} from "@workspace/worker/pipeline";
import { config } from "../lib/config";
import { logger } from "../lib/logger";
import { createOntologyClient } from "../lib/ontology-client";

const router: IRouter = Router();

// Files are held in memory and streamed straight to Document Intelligence; the
// API never writes uploads to disk (§16 — stateless, no local document store).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_UPLOAD_BYTES },
});

// Built once. When DOCUMENT_INTELLIGENCE_URL is unset the endpoint reports 503
// rather than pretending to work.
const documentIntelligence: DocumentIntelligence | null =
  config.DOCUMENT_INTELLIGENCE_URL
    ? createDocumentIntelligenceClient({
        baseUrl: config.DOCUMENT_INTELLIGENCE_URL,
      })
    : null;

// Optional: when configured, tokens are mapped into reviewable facts. When not,
// the endpoint still returns tokens (facts: null) rather than failing.
const ontology = config.ONTOLOGY_URL
  ? createOntologyClient({ baseUrl: config.ONTOLOGY_URL })
  : null;

/**
 * Resolve the caller's tenant.
 *
 * Phase 1 has no authentication yet (§15), so the tenant is taken from an
 * explicit header. This is the single seam to replace with the authenticated
 * principal's tenant once Entra External ID lands — the rest of the pipeline
 * already carries tenantId end-to-end.
 */
function resolveTenantId(req: Request): string | null {
  const header = req.header("x-tenant-id");
  return header && header.trim() ? header.trim() : null;
}

/**
 * POST /api/documents
 *
 * Upload one document (multipart field `file`) and receive the ontology
 * handoff: `{ sourceId, schemaVersion, tokens, warnings }`. Controlled failures
 * (unsupported type, unreadable, missing fields) return 200 with an empty token
 * list and warnings — the document was handled, it just produced no tokens.
 */
router.post(
  "/documents",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!documentIntelligence) {
      res.status(503).json({
        error: "document_intelligence_unavailable",
        message: "DOCUMENT_INTELLIGENCE_URL is not configured.",
      });
      return;
    }

    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      res.status(400).json({
        error: "missing_tenant",
        message: "An X-Tenant-Id header is required.",
      });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({
        error: "missing_file",
        message: "Attach a document as multipart field 'file'.",
      });
      return;
    }

    // A source ACL could be derived from the authenticated principal later; for
    // now default to tenant-scoped read.
    const sourceAcl: PrincipalRule[] = [
      {
        principalId: tenantId,
        principalType: "GROUP",
        effect: "ALLOW",
        actions: ["READ"],
      },
    ];

    try {
      const result = await processDocument(
        {
          filename: file.originalname,
          mimeType: file.mimetype,
          content: new Uint8Array(file.buffer),
          tenantId,
          sourceAcl,
        },
        documentIntelligence,
      );

      // Identifiers and outcome only — never document content or field values.
      logger.info(
        {
          sourceId: result.sourceId,
          tenantId,
          documentType: result.documentType,
          state: result.state,
          tokenCount: result.tokens.length,
        },
        "document processed",
      );

      // Map tokens → reviewable facts when the ontology is configured and there
      // are tokens. An ontology failure degrades to tokens-only with a warning
      // rather than failing the whole request.
      let facts: unknown = null;
      const handoff = toHandoff(result);
      if (ontology && handoff.tokens.length > 0) {
        try {
          facts = await ontology.toFacts(handoff.tokens);
        } catch (ontErr) {
          handoff.warnings.push(
            `ontology_unavailable: ${ontErr instanceof Error ? ontErr.message : "error"}`,
          );
          logger.warn(
            { sourceId: result.sourceId, tenantId },
            "ontology mapping failed; returning tokens only",
          );
        }
      }

      const status = result.state === "FAILED" ? 422 : 200;
      res.status(status).json({
        ...handoff,
        facts,
        state: result.state,
        documentType: result.documentType,
        errors: result.errors,
      });
    } catch (err) {
      logger.error(
        { tenantId, error: err instanceof Error ? err.name : "unknown" },
        "document processing crashed",
      );
      res.status(502).json({
        error: "processing_failed",
        message: "The document could not be processed.",
      });
    }
  },
);

// Multer rejects oversize files with a specific code; translate to 413.
router.use(
  (err: unknown, _req: Request, res: Response, next: (e?: unknown) => void) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        error: "file_too_large",
        message: `Max upload size is ${config.MAX_UPLOAD_BYTES} bytes.`,
      });
      return;
    }
    next(err);
  },
);

export default router;
