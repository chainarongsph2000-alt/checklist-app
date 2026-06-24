"""
routers/law.py — Law content retrieval with sanitized path
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pathlib import Path
import os
from ..config import VAULT_PATH, LAW_DIRS, CHECKLIST_DIR
from ..md_parser import load_md

router = APIRouter(prefix="/api", tags=["law"])


# Allowed base directories for law content
ALLOWED_BASES = [VAULT_PATH.resolve()]


def _is_safe_path(requested_path: str) -> bool:
    """
    Validate and sanitize requested path.
    - No directory traversal (..)
    - Must resolve within VAULT_PATH
    - Only .md files
    """
    # Reject obvious traversal attempts
    if ".." in requested_path.split("/"):
        return False
    if requested_path.startswith("/"):
        return False
    
    # Remove .md extension if present (we add it back)
    clean = requested_path.replace(".md", "").strip()
    return True


def _find_law_file(law_path: str) -> Path | None:
    """
    Find law file by path, searching:
    1. Direct: VAULT_PATH / "กฎหมาย" / law_path
    2. With .md: VAULT_PATH / "กฎหมาย" / f"{law_path}.md"
    3. Subdirs: each LAW_DIR / f"{law_path}.md"
    """
    law_path_clean = law_path.replace(".md", "").strip()
    
    candidates = [
        VAULT_PATH / "กฎหมาย" / law_path,
        VAULT_PATH / "กฎหมาย" / f"{law_path_clean}.md",
    ]
    for subdir in LAW_DIRS:
        candidates.append(subdir / f"{law_path_clean}.md")
    # Also search in checklist directory (00-สารบัญ etc.)
    candidates.append(CHECKLIST_DIR / f"{law_path_clean}.md")
    
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
            # Ensure resolved path is within VAULT_PATH
            if str(resolved).startswith(str(VAULT_PATH.resolve())):
                if resolved.exists() and resolved.suffix == ".md":
                    return resolved
        except (ValueError, RuntimeError):
            continue
    
    return None


@router.get("/law/{law_path:path}")
async def get_law(law_path: str):
    """Get law content by path. Path sanitized for security."""
    if not _is_safe_path(law_path):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid path: {law_path}"
        )
    
    law_file = _find_law_file(law_path)
    
    if law_file:
        try:
            return load_md(law_file)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading law file: {str(e)}")
    
    raise HTTPException(
        status_code=404,
        detail=f"Law not found: {law_path}"
    )
