from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models import ProcessingLog

router = APIRouter(prefix="/api", tags=["Logs"])


@router.get("/logs", summary="Processing logs (all or per job)")
def get_logs(
    job_id: str = None,
    level: str = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    q = db.query(ProcessingLog)
    if job_id:
        q = q.filter(ProcessingLog.job_id == job_id)
    if level:
        q = q.filter(ProcessingLog.level == level.upper())
    q = q.order_by(desc(ProcessingLog.created_at))
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "data": [
            {
                "id": l.id,
                "job_id": l.job_id,
                "event": l.event,
                "message": l.message,
                "level": l.level,
                "metadata": l.log_metadata,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            } for l in items
        ]
    }
