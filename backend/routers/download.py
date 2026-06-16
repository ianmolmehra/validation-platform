from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
import os, io
from database import get_db
from models import GeneratedReport, Upload

SAMPLE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "sample_data")

SAMPLES = {
    "clean": {
        "file": "sample_clean.csv",
        "label": "Clean Dataset",
        "description": "20 rows — well-formatted data, minor phone corrections",
        "score": 98,
        "badge": "High Quality",
    },
    "mixed": {
        "file": "sample_mixed.csv",
        "label": "Mixed Dataset",
        "description": "20 rows — country codes in phones, date format variations, duplicate",
        "score": 65,
        "badge": "Needs Cleanup",
    },
    "messy": {
        "file": "sample_messy.csv",
        "label": "Messy Dataset",
        "description": "20 rows — missing fields, invalid phones, bad dates, negative amounts",
        "score": 25,
        "badge": "Poor Quality",
    },
}

router = APIRouter(prefix="/api", tags=["Download"])


def _get_report(db, job_id, rtype):
    r = db.query(GeneratedReport).filter(
        GeneratedReport.job_id == job_id,
        GeneratedReport.report_type == rtype
    ).first()
    if not r or not os.path.exists(r.file_path):
        raise HTTPException(404, f"Report '{rtype}' not found for job {job_id}")
    return r


@router.get("/download/zip/{job_id}", summary="Download full ZIP export")
def download_zip(job_id: str, db: Session = Depends(get_db)):
    r = _get_report(db, job_id, "zip")
    return FileResponse(r.file_path, media_type="application/zip",
                        filename=f"validation_export_{job_id[:8]}.zip")


@router.get("/download/report/{job_id}", summary="Download PDF summary report")
def download_report(job_id: str, db: Session = Depends(get_db)):
    r = _get_report(db, job_id, "summary_pdf")
    return FileResponse(r.file_path, media_type="application/pdf",
                        filename=f"summary_report_{job_id[:8]}.pdf")


@router.get("/download/validated/{job_id}", summary="Download validated CSV")
def download_validated(job_id: str, db: Session = Depends(get_db)):
    r = _get_report(db, job_id, "validated_csv")
    return FileResponse(r.file_path, media_type="text/csv",
                        filename="validated_data.csv")


@router.get("/download/errors/{job_id}", summary="Download error report CSV")
def download_errors(job_id: str, db: Session = Depends(get_db)):
    r = _get_report(db, job_id, "error_csv")
    return FileResponse(r.file_path, media_type="text/csv",
                        filename="error_report.csv")


@router.get("/download/master/{job_id}", summary="Download master report CSV")
def download_master(job_id: str, db: Session = Depends(get_db)):
    r = _get_report(db, job_id, "master_csv")
    return FileResponse(r.file_path, media_type="text/csv",
                        filename="master_report.csv")


@router.get("/samples", summary="List available sample datasets")
def list_samples():
    return [{"key": k, **{x: v[x] for x in ("label","description","score","badge")}} for k, v in SAMPLES.items()]


@router.get("/samples/{key}", summary="Download a sample dataset")
def download_sample(key: str):
    if key not in SAMPLES:
        raise HTTPException(404, f"Sample '{key}' not found")
    path = os.path.abspath(os.path.join(SAMPLE_DIR, SAMPLES[key]["file"]))
    if not os.path.exists(path):
        raise HTTPException(404, "Sample file missing on server")
    return FileResponse(path, media_type="text/csv", filename=SAMPLES[key]["file"])


@router.get("/reports/{job_id}", summary="List all generated reports for a job")
def list_reports(job_id: str, db: Session = Depends(get_db)):
    reports = db.query(GeneratedReport).filter(GeneratedReport.job_id == job_id).all()
    return [
        {
            "id": r.id,
            "report_type": r.report_type,
            "file_name": r.file_name,
            "file_size": r.file_size,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in reports
    ]
