"""
Orgni Docs — FastAPI Application
Document understanding, integrity, validation, and extraction pipeline.
Part of the Orgni platform by Olyxee.
"""
import os
import uuid

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from config import UPLOAD_DIR, MAX_FILE_SIZE_BYTES, ALLOWED_CONTENT_TYPES, ALLOWED_EXTENSIONS
from pipeline.runner import run as run_pipeline

os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="Orgni Docs",
    description="Document understanding, integrity, validation, and extraction. Part of the Orgni platform by Olyxee.",
    version="1.1.0"
)


@app.get("/health")
def health():
    import platform
    return {
        "status": "ok",
        "service": "orgni-docs",
        "platform": "Orgni",
        "version": "1.1.0",
        "environment": platform.system(),
    }


@app.post("/run", response_class=JSONResponse)
async def run(file: UploadFile = File(...)):
    """Run the full Orgni Docs pipeline on an uploaded document."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported type: {file.content_type}")

    ext = os.path.splitext(file.filename or "")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail=f"Unsupported extension: {ext}")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Max 20MB.")

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    save_path = os.path.join(UPLOAD_DIR, f"{doc_id}{ext}")
    with open(save_path, "wb") as f:
        f.write(contents)

    result = run_pipeline(doc_id, save_path, file.content_type)
    return result
