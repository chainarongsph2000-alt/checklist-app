import os
import re
import json
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, Query
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import markdown

app = FastAPI(title="Checklist ตรวจแบบ — เทศบาลตำบลเมืองเก่า")

# ─── Config ────────────────────────────────────────────────
VAULT_PATH = Path("/root/Documents/obsidian-vault")
CHECKLIST_DIR = VAULT_PATH / "กฎหมาย" / "Checklist-ตรวจแบบ"
LAW_DIRS = sorted([
    d for d in (VAULT_PATH / "กฎหมาย").iterdir()
    if d.is_dir() and d.name not in ("Checklist-ตรวจแบบ",)
])

# ─── Helper ────────────────────────────────────────────────

def md_to_html(text: str) -> str:
    """Convert markdown text to HTML (basic)."""
    # Convert [[Link|Text]] → <a href='...'>Text</a>
    text = re.sub(
        r'\[\[([^\]|]+)(?:\|([^\]|]+))?\]\]',
        lambda m: f'<a href="/api/law/{m.group(1).strip()}" class="law-link" target="law">{m.group(2) or m.group(1).strip()}</a>',
        text
    )
    # Convert checkboxes
    text = re.sub(r'- \[ \]', '<input type="checkbox" class="check-item">', text)
    text = re.sub(r'- \[x\]', '<input type="checkbox" class="check-item" checked disabled>', text)
    # Convert headers
    text = re.sub(r'^### (.+)$', r'<h3>\1</h3>', text, flags=re.MULTILINE)
    text = re.sub(r'^## (.+)$', r'<h2>\1</h2>', text, flags=re.MULTILINE)
    text = re.sub(r'^# (.+)$', r'<h1>\1</h1>', text, flags=re.MULTILINE)
    # Bold/italic
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    # Tables (simple)
    text = re.sub(r'^\|(.+)\|$', lambda m: f'<tr>{"".join(f"<td>{c.strip()}</td>" for c in m.group(1).split("|")[1:-1])}</tr>', text, flags=re.MULTILINE)
    text = re.sub(r'<tr>.*?:.*?:.*?</tr>', '', text)  # remove alignment row
    # Wrap table
    if '<tr>' in text:
        text = re.sub(r'(<tr>.*?</tr>)+', lambda m: f'<table class="check-table"><tbody>{m.group(0)}</tbody></table>', text, flags=re.DOTALL)
    # Newlines
    text = text.replace('\n', '<br>\n')
    return text


def load_md(filepath: Path) -> dict:
    """Load .md file and return {'title', 'html', 'raw', 'tags', 'links'}."""
    raw = filepath.read_text(encoding='utf-8')
    html = md_to_html(raw)
    title = ""
    if raw.startswith('# '):
        title = raw.split('\n')[0].replace('# ', '').strip()
    # Extract tags
    tags = re.findall(r'#([\wก-เ]+)', raw)
    # Extract links
    links = re.findall(r'\[\[([^\]|]+)(?:\|[^\]|]+)?\]\]', raw)
    return {
        "title": title,
        "html": html,
        "raw": raw,
        "tags": tags,
        "links": links,
        "filename": filepath.stem,
    }


# ─── Mount static frontend ─────────────────────────────────
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend")

# ─── API Routes ────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main frontend page."""
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return index_path.read_text(encoding='utf-8')
    return "<h1>Checklist App — วาง index.html ในโฟลเดอร์ frontend/</h1>"


@app.get("/api/checklists")
async def list_checklists():
    """List all available checklists."""
    checklists = []
    if CHECKLIST_DIR.exists():
        for f in sorted(CHECKLIST_DIR.glob("*.md")):
            if f.stem == "00-สารบัญ":
                continue
            data = load_md(f)
            checklists.append({
                "id": f.stem,
                "title": data["title"] or f.stem,
                "tags": data["tags"],
            })
    return checklists


@app.get("/api/checklist/{checklist_id}")
async def get_checklist(checklist_id: str):
    """Get full checklist content."""
    for f in CHECKLIST_DIR.glob("*.md"):
        if f.stem == checklist_id:
            return load_md(f)
    return JSONResponse({"error": "Not found"}, status_code=404)


@app.get("/api/law/{law_path:path}")
async def get_law(law_path: str):
    """Get law content by path from vault."""
    # Try direct path first
    candidates = [
        VAULT_PATH / "กฎหมาย" / law_path,
        VAULT_PATH / "กฎหมาย" / f"{law_path}.md",
    ]
    # Try relative to any subfolder
    law_path_clean = law_path.replace(".md", "")
    for subdir in LAW_DIRS:
        candidates.append(subdir / f"{law_path_clean}.md")
    
    for candidate in candidates:
        if candidate.exists() and candidate.suffix == ".md":
            return load_md(candidate)
    
    return JSONResponse({"error": f"Law not found: {law_path}", "tried": [str(c) for c in candidates]}, status_code=404)


@app.get("/api/search")
async def search(q: str = Query("", min_length=2)):
    """Search across all .md files in vault."""
    results = []
    for md_file in VAULT_PATH.rglob("*.md"):
        if "asa_downloads" in str(md_file) or "extracted_text" in str(md_file):
            continue
        text = md_file.read_text(encoding='utf-8', errors='ignore')
        if q.lower() in text.lower():
            # Find context around match
            lines = text.split('\n')
            for i, line in enumerate(lines):
                if q.lower() in line.lower():
                    results.append({
                        "file": str(md_file.relative_to(VAULT_PATH)),
                        "line": i + 1,
                        "context": line.strip()[:150],
                    })
                    if len(results) >= 20:
                        break
        if len(results) >= 20:
            break
    return results


# ─── Run ───────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8888)
