"""
routers/dashboard.py — Dashboard API + Inspection save/load
"""
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from typing import Optional
from ..models.inspection import save_inspection, get_inspections, get_inspection, get_stats

router = APIRouter(prefix="/api", tags=["dashboard"])


class InspectionSave(BaseModel):
    checklist_id: str
    checklist_title: str
    building_type: str = ""
    inspector: str = ""
    result: dict = {}
    passed: int = 0
    failed: int = 0
    total: int = 0
    status: str = "completed"


@router.post("/inspections")
async def create_inspection(data: InspectionSave):
    """Save inspection result to history."""
    try:
        inspection_id = save_inspection(
            checklist_id=data.checklist_id,
            checklist_title=data.checklist_title,
            result=data.result,
            passed=data.passed,
            failed=data.failed,
            total=data.total,
            status=data.status,
            inspector=data.inspector,
            building_type=data.building_type,
        )
        return {"id": inspection_id, "status": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inspections")
async def list_inspections(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)):
    """List inspection history."""
    records = get_inspections(limit, offset)
    return {"records": records, "total": len(records)}


@router.get("/inspections/{inspection_id}")
async def get_inspection_detail(inspection_id: int):
    """Get single inspection detail."""
    record = get_inspection(inspection_id)
    if not record:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return record


@router.get("/dashboard/stats")
async def dashboard_stats():
    """Get aggregated dashboard statistics."""
    return get_stats()
