from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from sqlalchemy.orm import Session
import uuid, os, shutil, traceback
from database import get_db, SessionLocal
from models import Upload, ProcessingLog
from services.pipeline import run_pipeline

router = APIRouter(prefix="/api", tags=["Upload"])


def _run_pipeline_task(job_id: str, file_path: str, chunk_size: int):
    """Background task with its own DB session (request session is not thread-safe)."""
    db = SessionLocal()
    try:
        run_pipeline(job_id, file_path, db, chunk_size)
    except Exception as e:
        print(f"Pipeline error for job {job_id}: {e}")
        traceback.print_exc()
        try:
            upload = db.query(Upload).filter(Upload.job_id == job_id).first()
            if upload:
                upload.status = "failed"
                db.add(ProcessingLog(job_id=job_id, event="PIPELINE_FAILED",
                                     message=str(e), level="ERROR"))
                db.commit()
        except Exception:
            pass
    finally:
        db.close()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/validation_uploads")


@router.post("/upload", summary="Upload CSV or XLSX file")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    chunk_size: int = 50000,
    db: Session = Depends(get_db)
):
    allowed = {".csv", ".xlsx", ".xls"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Allowed: CSV, XLSX, XLS")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    job_id = str(uuid.uuid4())
    dest = os.path.join(UPLOAD_DIR, f"{job_id}{ext}")

    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_size = os.path.getsize(dest)

    upload = Upload(
        job_id=job_id,
        original_filename=file.filename,
        file_size=file_size,
        file_type=ext.lstrip("."),
        upload_path=dest,
        status="uploaded",
    )
    db.add(upload)
    db.add(ProcessingLog(job_id=job_id, event="UPLOAD_COMPLETED",
                         message=f"File '{file.filename}' uploaded ({file_size:,} bytes)", level="INFO"))
    db.commit()

    background_tasks.add_task(_run_pipeline_task, job_id, dest, chunk_size)

    return {
        "job_id": job_id,
        "filename": file.filename,
        "file_size": file_size,
        "file_type": ext.lstrip("."),
        "status": "processing",
        "message": "File uploaded. Processing started in background.",
    }


@router.get("/status/{job_id}", summary="Poll job processing status")
def get_status(job_id: str, db: Session = Depends(get_db)):
    upload = db.query(Upload).filter(Upload.job_id == job_id).first()
    if not upload:
        raise HTTPException(404, "Job not found")
    return {
        "job_id": job_id,
        "status": upload.status,
        "filename": upload.original_filename,
        "total_rows": upload.total_rows,
        "total_columns": upload.total_columns,
    }
