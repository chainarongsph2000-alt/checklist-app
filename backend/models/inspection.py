"""
models/inspection.py — SQLite model for inspection records
"""
import sqlite3
import json
import os
from datetime import datetime, timezone
from pathlib import Path

DB_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DB_PATH = DB_DIR / "checklist.db"

ICT_TZ = timezone.utc  # store UTC, format for display


def _get_db():
    """Get SQLite connection with row factory."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create tables if not exist."""
    conn = _get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS inspections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            checklist_id TEXT NOT NULL,
            checklist_title TEXT NOT NULL,
            building_type TEXT,
            inspector TEXT DEFAULT '',
            result TEXT NOT NULL DEFAULT '{}',
            passed INTEGER NOT NULL DEFAULT 0,
            failed INTEGER NOT NULL DEFAULT 0,
            total_items INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'in_progress',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_created_at ON inspections(created_at);
        CREATE INDEX IF NOT EXISTS idx_checklist_id ON inspections(checklist_id);
    """)
    conn.commit()
    conn.close()


def save_inspection(checklist_id, checklist_title, result, passed, failed, total, status="completed", inspector="", building_type=""):
    """Save or update inspection result."""
    conn = _get_db()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        """INSERT INTO inspections 
           (checklist_id, checklist_title, building_type, inspector, result, passed, failed, total_items, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (checklist_id, checklist_title, building_type, inspector, json.dumps(result, ensure_ascii=False),
         passed, failed, total, status, now, now)
    )
    conn.commit()
    inspection_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.close()
    return inspection_id


def get_inspections(limit=20, offset=0):
    """Get inspection history."""
    conn = _get_db()
    rows = conn.execute(
        "SELECT * FROM inspections ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (limit, offset)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_inspection(inspection_id):
    """Get single inspection."""
    conn = _get_db()
    row = conn.execute("SELECT * FROM inspections WHERE id = ?", (inspection_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_stats():
    """Get aggregated statistics."""
    conn = _get_db()
    
    # Total counts
    total = conn.execute("SELECT COUNT(*) FROM inspections").fetchone()[0]
    completed = conn.execute("SELECT COUNT(*) FROM inspections WHERE status='completed'").fetchone()[0]
    
    # Pass/fail rates
    passed_total = conn.execute("SELECT COALESCE(SUM(passed), 0) FROM inspections").fetchone()[0]
    failed_total = conn.execute("SELECT COALESCE(SUM(failed), 0) FROM inspections").fetchone()[0]
    
    # By building type
    by_type = conn.execute(
        "SELECT checklist_title, COUNT(*) as cnt FROM inspections GROUP BY checklist_title ORDER BY cnt DESC LIMIT 10"
    ).fetchall()
    
    # Monthly trend (last 6 months)
    trend = conn.execute("""
        SELECT substr(created_at, 1, 7) as month, COUNT(*) as cnt
        FROM inspections
        WHERE created_at >= date('now', '-6 months')
        GROUP BY month ORDER BY month
    """).fetchall()
    
    # Recent inspections
    recent = conn.execute(
        "SELECT id, checklist_title, passed, failed, total_items, status, created_at FROM inspections ORDER BY created_at DESC LIMIT 10"
    ).fetchall()
    
    conn.close()
    
    return {
        "total_inspections": total,
        "completed": completed,
        "total_passed_items": passed_total,
        "total_failed_items": failed_total,
        "by_type": [dict(r) for r in by_type],
        "trend": [dict(r) for r in trend],
        "recent": [dict(r) for r in recent],
    }


# Initialize on import
init_db()
