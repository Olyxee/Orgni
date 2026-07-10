# Orgni Docs — Document Integrity Pipeline

## Overview

Orgni Docs is the document understanding and integrity layer inside the Orgni platform.
It focuses on document extraction, validation, classification, and integrity checking.

It answers one question: **Did truth survive the transformation?**

Every document passes through a multi-stage pipeline that extracts, validates,
and scores integrity before approving or blocking the output.

## Part of the Orgni Platform

```
Orgni (Core Platform)
├── Orgni Docs       ← You are here
│     Document understanding, integrity, validation, extraction
├── Orgni Workflows
│     Business processes, approvals, operational tasks
├── Orgni Finance
│     Reconciliation, financial integrity, anomaly detection
├── Togent
│     AI-agent optimisation and evaluation
└── Order Loop
      Delivery and collection communication
```

## Project Structure

```
orgni_docs/
├── ocr/                  # Document text extraction (PDF + images)
│   └── extractor.py
├── extraction/           # Structured field extraction (regex + LLM fallback)
│   └── extractor.py
├── schemas/              # Shared data models and approved field definitions
│   └── document.py
├── validation/           # Constraint validation engine
│   └── engine.py
├── integrity/            # Trust scoring layer
│   └── trust_scorer.py
├── pipeline/             # End-to-end pipeline runner
│   └── runner.py
├── tests/                # Integration tests
│   └── test_pipeline.py
├── sample_files/         # Sample invoices for testing
├── main.py               # FastAPI application entry point
├── config.py             # Environment-based configuration
└── requirements.txt
```

## Pipeline Flow

```
Input Document (PDF / PNG / JPG)
        ↓
    OCR Layer
    Text extraction, page structure, confidence scoring
        ↓
    Structured Extraction
    Regex-first field extraction, LLM fallback, date normalisation
        ↓
    Constraint Validation
    Math checks, format checks, relationship checks
        ↓
    Trust Scoring
    Weighted integrity score across all pipeline signals
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

**Windows:**
Download from https://github.com/UB-Mannheim/tesseract/wiki
Install to `C:\Program Files\Tesseract-OCR\`

**Ubuntu/Debian:**
```bash
sudo apt install tesseract-ocr
```

**macOS:**
```bash
brew install tesseract
```

### 4. Set environment variables

```bash
# Windows
set TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
set ANTHROPIC_API_KEY=your_key_here   # optional — regex works without it

# Linux/macOS
export ANTHROPIC_API_KEY=your_key_here
```

### 5. Run the API

```bash
uvicorn main:app --reload
```

API docs available at: http://127.0.0.1:8000/docs

### 6. Run the tests

```bash
python tests/test_pipeline.py
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/run` | POST | Run full Orgni Docs pipeline on uploaded document |
| `/health` | GET | Service health check |

## Sample Response

```json
{
  "document_id": "doc_3f2a1b4c",
  "verdict": "APPROVED",
  "trust_score": 0.82,
  "risk_level": "low",
  "approved": true,
  "recommendation": "Output approved. Minor signals detected — monitor.",
  "integrity_flags": [],
  "stage_outputs": {
    "extraction": {
      "extracted_fields": {
        "invoice_number": "INV-2024-0081",
        "date": "2024-03-15",
        "invoice_total": 15000.0,
        "vat": 1956.52,
        "subtotal": 13043.48
      },
      "completeness_score": 0.89
    },
    "validation": {
      "passed": true,
      "integrity_score": 0.91
    }
  }
}
```

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
