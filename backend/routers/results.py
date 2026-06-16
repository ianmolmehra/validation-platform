from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from database import get_db
from models import Upload, Transaction, ValidationResult, ProcessingHistory, GeneratedReport

router = APIRouter(prefix="/api", tags=["Results"])


@router.get("/results/{job_id}", summary="Get full validation results for a job")
def get_results(job_id: str, db: Session = Depends(get_db)):
    upload = db.query(Upload).filter(Upload.job_id == job_id).first()
    if not upload:
        raise HTTPException(404, "Job not found")
    if upload.status not in ("completed", "failed"):
        return {"job_id": job_id, "status": upload.status, "message": "Still processing…"}

    history = upload.history
    errors = db.query(ValidationResult).filter(
        ValidationResult.job_id == job_id,
        ValidationResult.severity == "error",
        ValidationResult.was_corrected == False
    ).limit(500).all()

    corrections = db.query(ValidationResult).filter(
        ValidationResult.job_id == job_id,
        ValidationResult.was_corrected == True
    ).limit(200).all()

    error_type_counts = (
        db.query(ValidationResult.error_type, func.count().label("cnt"))
        .filter(ValidationResult.job_id == job_id, ValidationResult.severity == "error")
        .group_by(ValidationResult.error_type)
        .all()
    )

    # Chunk info
    chunk_reports = db.query(GeneratedReport).filter(
        GeneratedReport.job_id == job_id,
        GeneratedReport.report_type == "chunk_csv"
    ).all()
    chunk_count = len(chunk_reports)

    # Country file info
    country_reports = db.query(GeneratedReport).filter(
        GeneratedReport.job_id == job_id,
        GeneratedReport.report_type == "country_csv"
    ).all()
    country_file_count = len(country_reports)
    country_file_names = [r.file_name.replace(".csv", "") for r in country_reports]

    # Quality dimensions (derived from quality_score)
    qs = float(history.quality_score) if history and history.quality_score else 0
    rs = float(history.readiness_score) if history and history.readiness_score else 0
    total = history.rows_processed if history else 1
    valid = history.valid_rows if history else 0
    corrected = history.corrected_rows if history else 0
    duplicates = history.duplicate_rows if history else 0
    completeness = min(100.0, qs + 3)
    accuracy = qs
    validity = min(100.0, max(0.0, qs - 2))
    uniqueness = round((1 - duplicates / max(total, 1)) * 100, 1)

    return {
        "job_id": job_id,
        "status": upload.status,
        "filename": upload.original_filename,
        "total_rows": upload.total_rows,
        "chunk_count": chunk_count,
        "country_file_count": country_file_count,
        "country_file_names": country_file_names,
        "chunk_size": 1000,
        "history": {
            "rows_processed": total,
            "valid_rows": history.valid_rows if history else 0,
            "invalid_rows": history.invalid_rows if history else 0,
            "corrected_rows": history.corrected_rows if history else 0,
            "duplicate_rows": history.duplicate_rows if history else 0,
            "quality_score": qs,
            "readiness_score": rs,
            "readiness_label": history.readiness_label if history else "",
            "processing_time_seconds": float(history.processing_time_seconds) if history and history.processing_time_seconds else 0,
            "completeness": completeness,
            "accuracy": accuracy,
            "validity": validity,
            "uniqueness": uniqueness,
        } if history else {},
        "errors": [
            {
                "row_number": e.row_number,
                "order_id": e.order_id,
                "error_type": e.error_type,
                "error_field": e.error_field,
                "error_message": e.error_message,
                "original_value": e.original_value,
            } for e in errors
        ],
        "corrections": [
            {
                "row_number": c.row_number,
                "error_field": c.error_field,
                "original_value": c.original_value,
                "corrected_value": c.corrected_value,
            } for c in corrections
        ],
        "error_type_summary": {r.error_type: r.cnt for r in error_type_counts},
    }


@router.get("/transactions/{job_id}", summary="Get paginated transactions")
def get_transactions(
    job_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    valid_only: bool = False,
    db: Session = Depends(get_db)
):
    q = db.query(Transaction).filter(Transaction.job_id == job_id)
    if valid_only:
        q = q.filter(Transaction.is_valid == True)
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "data": [
            {
                "row_number": t.row_number,
                "order_id": t.order_id,
                "order_date": str(t.order_date) if t.order_date else t.order_date_raw,
                "customer_name": t.customer_name,
                "customer_phone": t.customer_phone,
                "country": t.country,
                "order_amount": float(t.order_amount) if t.order_amount else None,
                "product_name": t.product_name,
                "quantity": t.quantity,
                "unit_price": float(t.unit_price) if t.unit_price else None,
                "payment_mode": t.payment_mode,
                "payment_status": t.payment_status,
                "transaction_ref": t.transaction_ref,
                "is_valid": t.is_valid,
                "is_duplicate": t.is_duplicate,
                "was_corrected": t.was_corrected,
                "validation_status": t.validation_status,
            } for t in items
        ]
    }
