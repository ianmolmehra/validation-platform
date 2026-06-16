from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models import ProcessingHistory, Upload

router = APIRouter(prefix="/api", tags=["History"])


@router.get("/history", summary="Processing history of all jobs")
def get_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    q = db.query(ProcessingHistory).order_by(desc(ProcessingHistory.created_at))
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "data": [
            {
                "job_id": h.job_id,
                "file_name": h.file_name,
                "upload_date": h.upload_date.isoformat() if h.upload_date else None,
                "rows_processed": h.rows_processed,
                "valid_rows": h.valid_rows,
                "invalid_rows": h.invalid_rows,
                "corrected_rows": h.corrected_rows,
                "duplicate_rows": h.duplicate_rows,
                "quality_score": float(h.quality_score) if h.quality_score else 0,
                "readiness_score": float(h.readiness_score) if h.readiness_score else 0,
                "readiness_label": h.readiness_label,
                "status": h.status,
                "processing_time_seconds": float(h.processing_time_seconds) if h.processing_time_seconds else 0,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            } for h in items
        ]
    }
