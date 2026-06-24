"""
routers/checklists.py — Checklist listing and retrieval
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pathlib import Path
from ..config import CHECKLIST_DIR
from ..md_parser import load_md

router = APIRouter(prefix="/api", tags=["checklists"])


@router.get("/checklists")
async def list_checklists():
    """List all available checklists."""
    if not CHECKLIST_DIR.exists():
        return []
    
    checklists = []
    for f in sorted(CHECKLIST_DIR.glob("*.md")):
        if f.stem == "00-สารบัญ":
            continue
        try:
            data = load_md(f)
            checklists.append({
                "id": f.stem,
                "title": data["title"] or f.stem,
                "tags": data["tags"],
            })
        except Exception as e:
            checklists.append({
                "id": f.stem,
                "title": f.stem,
                "tags": [],
                "error": str(e),
            })
    return checklists


@router.get("/checklist/{checklist_id}")
async def get_checklist(checklist_id: str):
    """Get full checklist content by ID (filename stem)."""
    checklist_file = CHECKLIST_DIR / f"{checklist_id}.md"
    
    if checklist_file.exists():
        try:
            return load_md(checklist_file)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading checklist: {str(e)}")
    
    raise HTTPException(status_code=404, detail=f"Checklist not found: {checklist_id}")
