"""
routers/search.py — Full-text search across Obsidian vault
"""
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from pathlib import Path
from ..config import VAULT_PATH, SEARCH_MAX_RESULTS, SEARCH_MIN_LENGTH, SEARCH_EXCLUDE_DIRS

router = APIRouter(prefix="/api", tags=["search"])


def _should_exclude(path: Path) -> bool:
    """Check if path should be excluded from search."""
    return any(excl in path.parts for excl in SEARCH_EXCLUDE_DIRS)


@router.get("/search")
async def search(q: str = Query("", min_length=2), limit: int = Query(20, ge=1, le=SEARCH_MAX_RESULTS)):
    """Search across all .md files in vault. Returns matches with context."""
    if len(q) < SEARCH_MIN_LENGTH:
        return JSONResponse({"results": [], "total": 0, "query": q})
    
    results = []
    q_lower = q.lower()
    
    try:
        for md_file in sorted(VAULT_PATH.rglob("*.md")):
            if _should_exclude(md_file):
                continue
            
            try:
                text = md_file.read_text(encoding='utf-8', errors='ignore')
            except (IOError, PermissionError):
                continue
            
            if q_lower not in text.lower():
                continue
            
            # Find matching lines with context
            lines = text.split('\n')
            for i, line in enumerate(lines):
                if q_lower in line.lower():
                    results.append({
                        "file": str(md_file.relative_to(VAULT_PATH)),
                        "line": i + 1,
                        "context": line.strip()[:200],
                    })
                    
                    if len(results) >= limit:
                        break
            
            if len(results) >= limit:
                break
    except Exception as e:
        return JSONResponse({
            "results": results,
            "total": len(results),
            "query": q,
            "error": str(e),
        })
    
    return {
        "results": results,
        "total": len(results),
        "query": q,
    }
