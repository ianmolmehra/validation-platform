from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text, desc
from database import get_db
from models import Transaction, ValidationResult, ProcessingHistory, Upload

router = APIRouter(prefix="/api", tags=["Analytics"])


@router.get("/analytics", summary="Platform-wide analytics")
def get_analytics(job_id: str = None, db: Session = Depends(get_db)):
    q = db.query(Transaction)
    vq = db.query(ValidationResult)
    if job_id:
        q = q.filter(Transaction.job_id == job_id)
        vq = vq.filter(ValidationResult.job_id == job_id)

    # Top countries by revenue
    top_countries = (
        db.query(Transaction.country, func.sum(Transaction.order_amount).label("revenue"), func.count().label("orders"))
        .filter(Transaction.is_valid == True, *(([Transaction.job_id == job_id]) if job_id else []))
        .group_by(Transaction.country)
        .order_by(desc("revenue"))
        .limit(10)
        .all()
    )

    # Payment mode distribution
    payment_modes = (
        db.query(Transaction.payment_mode, func.count().label("count"), func.sum(Transaction.order_amount).label("revenue"))
        .filter(*(([Transaction.job_id == job_id]) if job_id else []))
        .group_by(Transaction.payment_mode)
        .order_by(desc("count"))
        .all()
    )

    # Daily transaction volume (last 30 days)
    daily_volume = (
        db.query(Transaction.order_date, func.count().label("count"), func.sum(Transaction.order_amount).label("revenue"))
        .filter(Transaction.order_date != None, *(([Transaction.job_id == job_id]) if job_id else []))
        .group_by(Transaction.order_date)
        .order_by(Transaction.order_date)
        .limit(60)
        .all()
    )

    # Error type distribution
    error_dist = (
        vq.with_entities(ValidationResult.error_type, func.count().label("count"))
        .filter(ValidationResult.severity == "error")
        .group_by(ValidationResult.error_type)
        .order_by(desc("count"))
        .limit(10)
        .all()
    )

    # Country error distribution
    country_errors = (
        db.query(Transaction.country, func.count().label("error_count"))
        .join(ValidationResult, (ValidationResult.job_id == Transaction.job_id) &
              (ValidationResult.row_number == Transaction.row_number))
        .filter(ValidationResult.severity == "error",
                *(([Transaction.job_id == job_id]) if job_id else []))
        .group_by(Transaction.country)
        .order_by(desc("error_count"))
        .limit(10)
        .all()
    )

    # Validation success rate
    total_txns = q.count()
    valid_txns = q.filter(Transaction.is_valid == True).count()
    success_rate = round(valid_txns / max(total_txns, 1) * 100, 2)

    # Payment status breakdown
    payment_status = (
        db.query(Transaction.payment_status, func.count().label("count"))
        .filter(*(([Transaction.job_id == job_id]) if job_id else []))
        .group_by(Transaction.payment_status)
        .all()
    )

    # Revenue by payment mode
    rev_by_pm = (
        db.query(Transaction.payment_mode, func.sum(Transaction.order_amount).label("revenue"))
        .filter(Transaction.is_valid == True, *(([Transaction.job_id == job_id]) if job_id else []))
        .group_by(Transaction.payment_mode)
        .order_by(desc("revenue"))
        .all()
    )

    return {
        "top_countries": [
            {"country": r.country, "revenue": float(r.revenue or 0), "orders": r.orders}
            for r in top_countries
        ],
        "payment_mode_distribution": [
            {"mode": r.payment_mode, "count": r.count, "revenue": float(r.revenue or 0)}
            for r in payment_modes
        ],
        "daily_volume": [
            {"date": str(r.order_date), "count": r.count, "revenue": float(r.revenue or 0)}
            for r in daily_volume if r.order_date
        ],
        "error_distribution": [
            {"error_type": r.error_type, "count": r.count}
            for r in error_dist
        ],
        "country_error_distribution": [
            {"country": r.country, "error_count": r.error_count}
            for r in country_errors
        ],
        "validation_success_rate": success_rate,
        "total_transactions": total_txns,
        "valid_transactions": valid_txns,
        "payment_status_breakdown": [
            {"status": r.payment_status, "count": r.count}
            for r in payment_status
        ],
        "revenue_by_payment_mode": [
            {"mode": r.payment_mode, "revenue": float(r.revenue or 0)}
            for r in rev_by_pm
        ],
    }
