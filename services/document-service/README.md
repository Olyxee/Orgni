# Orgni Docs — Document Integrity Pipeline

> **Status:** Not yet ported to the live Replit workspace — this backup copy is the current source. Runs as a standalone Python/FastAPI service; deploy to any Python host (e.g. Azure App Service). It calls Anthropic's hosted API for LLM extraction — no models or tokenizers are self-hosted; the only local processing is Tesseract OCR.

## Overview

Orgni Docs is the document understanding and integrity layer inside the Orgni platform.
It focuses on document extraction, validation, classification, and integrity checking.

It answers one question: **Did truth survive the transformation?**

## Part of the Orgni Platform

```
Orgni (Core Platform)
├── Orgni Docs       ← This repo
├── Orgni Workflows
├── Orgni Finance
├── Togent
└── Order Loop
```

## Actual Repo Structure

```
.
├── ocr/
│   └── extractor.py
├── extraction/
│   └── extractor.py
├── schemas/
│   └── document.py
├── validation/
│   └── engine.py
├── integrity/
│   └── trust_scorer.py
├── pipeline/
│   └── runner.py
├── tests/
│   ├── test_pipeline.py
│   └── test_api.py
├── sample_files/
│   └── sample_invoice.txt
├── main.py
├── config.py
├── requirements.txt
└── README.md
```

## Pipeline Flow

```
Input Document (PDF / PNG / JPG)
        ↓
    OCR Layer            → ocr/extractor.py
        ↓
    Structured Extraction → extraction/extractor.py
        ↓
    Constraint Validation → validation/engine.py
        ↓
    Trust Scoring          → integrity/trust_scorer.py
        ↓
    Verdict: APPROVED / REVIEW / BLOCKED
```

## How to Run Locally

### 1. Clone the repo

```bash
git clone https://github.com/OlyxeeAI/orgni-docs.git
cd orgni-docs
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Install Tesseract OCR

**Windows:** Download from https://github.com/UB-Mannheim/tesseract/wiki and install to `C:\Program Files\Tesseract-OCR\`

**Ubuntu/Debian:** `sudo apt install tesseract-ocr`

**macOS:** `brew install tesseract`

### 4. Set environment variables

```bash
# Windows
set TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
set ANTHROPIC_API_KEY=your_key_here
set LLM_MODEL=claude-sonnet-4-20250514

# Linux/macOS
export TESSERACT_CMD=/usr/bin/tesseract
export ANTHROPIC_API_KEY=your_key_here
export LLM_MODEL=claude-sonnet-4-20250514
```

`ANTHROPIC_API_KEY` is optional — regex extraction works without it.

### 5. Run the API (from repo root)

```bash
uvicorn main:app --reload
```

API docs: http://127.0.0.1:8000/docs

### 6. Run the tests (from repo root)

```bash
python tests/test_pipeline.py
python -m pytest tests/test_api.py -v
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/run` | POST | Run full pipeline on uploaded document |
| `/health` | GET | Service health check |

## Field Source Audit (per extracted field)

Every field in the response is tagged with exactly where it came from:

| Source | Meaning |
|---|---|
| `regex` | Matched directly from OCR text, confidence 1.0 |
| `llm` | Filled by LLM after regex found nothing, confidence 0.75, schema-validated |
| `not_found` | Not found by either method — listed in `missing_fields` |

## Approved Document Fields

| Field | Type | Description |
|---|---|---|
| invoice_number | string | Invoice identifier |
| date | string | Invoice date (YYYY-MM-DD) |
| due_date | string | Payment due date (YYYY-MM-DD) |
| supplier | string | Issuing company |
| client | string | Billed company |
| vat_number | string | SARS VAT registration (10 digits) |
| invoice_total | float | Total amount due (Rands) |
| vat | float | VAT amount (15%) |
| subtotal | float | Amount before VAT |
