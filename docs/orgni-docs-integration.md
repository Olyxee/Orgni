# Orgni Docs Integration

Orgni Docs is now a first-class service inside the Orgni project at
`artifacts/orgni-docs`.

It was developed separately, so it keeps its own service boundary:

- `main.py` exposes the FastAPI service.
- `pipeline/runner.py` runs OCR, extraction, validation, trust scoring, and verdict generation.
- `ocr/`, `extraction/`, `validation/`, and `integrity/` own their pipeline stages.
- `tests/` contains the service-level regression tests.
- `requirements.txt` owns the Python dependencies for this service.

The main Orgni app still uploads documents through the Node API:

`POST /api/orgs/:orgId/documents`

That endpoint accepts multipart uploads using field name `files`. Orgni Docs currently exposes its own endpoint:

`POST /run`

That endpoint accepts a single multipart upload using field name `file` and returns the integrity report.

## Integration Direction

Keep Orgni Docs standing as its own service, but wire it into the main upload flow through a narrow adapter:

1. Main app uploads files to `artifacts/api-server`.
2. The Node document controller stores/parses the upload as it does today.
3. For supported integrity file types, Node forwards the file buffer to Orgni Docs `/run`.
4. Node stores the returned integrity report on the document record.
5. The app surfaces `verdict`, `trust_score`, `risk_level`, and validation warnings in Sources.

This keeps the project unified without mixing Python OCR concerns into the Node engine.

## Local Run

From `artifacts/orgni-docs`:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

On Windows, install Tesseract OCR and set:

```bash
set TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
```

The API docs will be available at `http://127.0.0.1:8000/docs`.

## Notes

- Orgni Docs supports `.pdf`, `.png`, `.jpg`, and `.jpeg`.
- The existing Node parser supports `.txt`, `.md`, `.csv`, `.json`, `.pdf`, and `.docx`.
- The adapter should only call Orgni Docs for file types it supports.
- If Orgni Docs is unavailable, the Node upload should still preserve the document and mark integrity analysis as unavailable rather than failing the whole upload.
