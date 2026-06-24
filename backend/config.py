"""
config.py — Configuration for Checklist App
"""
from pathlib import Path

# ─── Paths ──────────────────────────────────────────────────
VAULT_PATH = Path("/root/Documents/obsidian-vault")
CHECKLIST_DIR = VAULT_PATH / "กฎหมาย" / "Checklist-ตรวจแบบ"
LAW_DIRS = sorted([
    d for d in (VAULT_PATH / "กฎหมาย").iterdir()
    if d.is_dir() and d.name not in ("Checklist-ตรวจแบบ",)
])

# ─── App ────────────────────────────────────────────────────
APP_TITLE = "Checklist ตรวจแบบ — เทศบาลตำบลเมืองเก่า"
HOST = "0.0.0.0"
PORT = 8888

# ─── Search ─────────────────────────────────────────────────
SEARCH_MAX_RESULTS = 50
SEARCH_MIN_LENGTH = 2
SEARCH_EXCLUDE_DIRS = {"asa_downloads", "extracted_text", "__pycache__", ".git"}

# ─── Validate paths at import ───────────────────────────────
def validate_paths():
    """Check that required paths exist, return list of warnings."""
    warnings = []
    if not VAULT_PATH.exists():
        warnings.append(f"⚠️ Vault path not found: {VAULT_PATH}")
    if not CHECKLIST_DIR.exists():
        warnings.append(f"⚠️ Checklist directory not found: {CHECKLIST_DIR}")
    if not LAW_DIRS:
        warnings.append("⚠️ No law directories found in vault")
    return warnings
