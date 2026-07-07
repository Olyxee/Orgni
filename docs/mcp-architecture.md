# Orgni MCP Intelligence Layer — Architecture Guide

> For engineers joining the Orgni project.
> This covers the AI/MCP layer: how Orgni ingests information, understands it, and recommends what to do next.

---

## What This Layer Does

Orgni is not a chatbot. It is an operational intelligence platform that understands what is happening inside a business and helps move work forward safely.

The MCP (Model Context Protocol) Intelligence Layer is the component responsible for:

1. **Receiving** structured input from connected sources — emails, documents, calendars, tools
2. **Extracting** named entities (people, dates, deadlines, organizations) via the NER pipeline
3. **Classifying** the input into an operational type (e.g. approval request, task assignment)
4. **Recommending** the next action with a full audit trail

---

## Flow Diagram
Email / Calendar / Document / Tool │ ▼ POST /api/mcp/process-input │ ├──► Base Schema Validator (rejects malformed payloads early) │ ├──► NER Service (Python FastAPI on :8000) │ └── returns unified_entities[] │ ├──► Classifier (entity signals → classification) │ ├──► Recommender (classification → action object) │ └──► JSON response with audit trail

---

## File Structure
artifacts/api-server/ engine/ mcp-layer/ router.js ← Entry point. Handles POST /api/mcp/process-input classifier.js ← Maps entity signals to a classification string recommender.js ← Maps classification to a recommended action schemas/ base.schema.js ← Validates all incoming MCP payloads (data contract) connectors/ email.mock.js ← Sample email payload for manual testing tests/ mcp.test.js ← 10 unit tests, run with: node mcp.test.js

---
## API Reference
### `POST /api/mcp/process-input`
**Request body:**
| Field        | Type   | Required | Description                                       |
|--------------|--------|----------|---------------------------------------------------|
| `id`         | string | ✓        | Unique message ID                                 |
| `source`     | string | ✓        | `email`, `calendar`, `document`, or `tool`        |
| `orgId`      | string | ✓        | Organisation identifier in Orgni                  |
| `receivedAt` | string | ✓        | ISO 8601 timestamp of when the item was received  |
| `text`       | string | ✓        | Plain text content to process                     |
| `raw`        | object | ✓        | Source-native metadata (headers, sender, subject) |
**Example response:**
```json
{
  "success": true,
  "source": "email",
  "orgId": "org-001",
  "inputId": "msg-001",
  "classification": "approval_request",
  "entities": [
    { "raw": "Alisha", "label": "Person", "confidence": 0.74, "status": "review" },
    { "raw": "next Friday", "label": "Date", "confidence": 0.82, "status": "review" },
    { "raw": "Lethabo", "label": "Person", "confidence": 0.86, "status": "review" }
  ],
  "recommendation": {
    "action": "route_for_approval",
    "approver": "Lethabo",
    "deadline": "next Friday",
    "priority": "high",
    "reason": "Detected approval request requiring sign-off from Lethabo."
  },
  "audit": {
    "total_extracted": 3,
    "actionable_count": 3,
    "processed_at": "2026-07-05T20:25:32.328Z",
    "ner_pipeline": "1.3.0",
    "mock_mode": false
  }
}

