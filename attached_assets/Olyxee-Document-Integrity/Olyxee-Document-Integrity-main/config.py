"""
ODI — Global Configuration

All environment-based settings live here.
No other module should hardcode paths or keys.
"""
import os
import platform


def get_tesseract_cmd() -> str | None:
    env_path = os.environ.get("TESSERACT_CMD")
    if env_path:
        return env_path
    if platform.system() == "Windows":
        default = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        if os.path.exists(default):
            return default
    return None


# Anthropic
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

# Storage
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://odi:odi@localhost:5432/odi")

# Upload limits
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20MB
ALLOWED_CONTENT_TYPES = {"application/pdf", "image/png", "image/jpeg", "image/jpg"}
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
