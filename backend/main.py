"""
main.py — FastAPI Checklist App (modular architecture)
"""
import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from .config import APP_TITLE, validate_paths
from .routers import checklists, law, search, dashboard

# ─── Logging ────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("checklist-app")

# ─── App ────────────────────────────────────────────────────
app = FastAPI(title=APP_TITLE)

# ─── Validate paths ─────────────────────────────────────────
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

warnings = validate_paths()
for w in warnings:
    logger.warning(w)

# ─── Mount static frontend ──────────────────────────────────
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend")
    logger.info(f"Frontend mounted: {FRONTEND_DIR}")
else:
    logger.warning(f"Frontend directory not found: {FRONTEND_DIR}")

# ─── Register routers ───────────────────────────────────────
app.include_router(checklists.router)
app.include_router(law.router)
app.include_router(search.router)
app.include_router(dashboard.router)


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main frontend page."""
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return index_path.read_text(encoding='utf-8')
    return "<h1>Checklist App — วาง index.html ในโฟลเดอร์ frontend/</h1>"


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page():
    """Serve the dashboard page."""
    dashboard_path = FRONTEND_DIR / "dashboard.html"
    if dashboard_path.exists():
        return dashboard_path.read_text(encoding='utf-8')
    return "<h1>Dashboard — ยังไม่ได้สร้าง</h1>"


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "app": APP_TITLE,
        "frontend": FRONTEND_DIR.exists(),
        "warnings": warnings,
    }


# ─── Run ────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    from .config import HOST, PORT
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)
