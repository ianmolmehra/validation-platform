"""
Main ETL pipeline orchestrator.
Reads a CSV/XLSX file, runs all stages, stores results to DB.
"""
from __future__ import annotations
import os
import time
import uuid
from datetime import datetime
from collections import Counter
from typing import Optional

import pandas as pd
from sqlalchemy.orm import Session

from models import Upload, Transaction, ValidationResult, ProcessingHistory, ProcessingLog, GeneratedReport
from services.column_mapper import map_columns, missing_required_columns
from services.profiler import profile_dataframe
from services.validator import validate_and_correct_row
from services.scoring import compute_quality_score, compute_readiness_score
from services.insights import generate_insights
from services.report_generator import (
    generate_validated_csv, generate_error_csv, generate_master_csv,
    generate_summary_pdf, generate_chunks, generate_country_files, build_zip
)

REPORTS_DIR = os.getenv("REPORTS_DIR", "/tmp/validation_reports")


def _log(db: Session, job_id: str, event: str, message: str, level: str = "INFO", meta=None):
    db.add(ProcessingLog(job_id=job_id, event=event, message=message, level=level, log_metadata=meta))
    db.commit()


def run_pipeline(job_id: str, file_path: str, db: Session, chunk_size: int = 1000) -> dict:
    start_time = time.time()
    os.makedirs(REPORTS_DIR, exist_ok=True)
    job_dir = os.path.join(REPORTS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    upload = db.query(Upload).filter(Upload.job_id == job_id).first()
    if not upload:
        raise ValueError(f"Job {job_id} not found")

    # ── Update status: profiling ──────────────────────────────────────────────
    upload.status = "profiling"
    db.commit()
    _log(db, job_id, "PROFILING_STARTED", "Dataset profiling initiated", "INFO")

    # ── Load file ────────────────────────────────────────────────────────────
    ext = os.path.splitext(file_path)[1].lower()
    try:
        if ext in (".xlsx", ".xls"):
            df = pd.read_excel(file_path, dtype=str)
        else:
            df = pd.read_csv(file_path, dtype=str)
    except Exception as e:
        upload.status = "failed"
        db.commit()
        _log(db, job_id, "FILE_READ_ERROR", str(e), "ERROR")
        raise

    df = df.dropna(how="all")
    upload.total_rows = len(df)
    upload.total_columns = len(df.columns)
    db.commit()

    profile = profile_dataframe(df)
    _log(db, job_id, "PROFILING_COMPLETED",
         f"Profile complete: {profile['total_rows']} rows, {profile['total_columns']} cols", "SUCCESS",
         {"profile": profile})

    # ── Column mapping ────────────────────────────────────────────────────────
    mapping = map_columns(df.columns.tolist())
    missing = missing_required_columns(mapping)
    if missing:
        _log(db, job_id, "SCHEMA_WARNING",
             f"Missing/unrecognised columns: {', '.join(missing)}", "WARNING")

    # ── Load country rules ────────────────────────────────────────────────────
    from models import CountryRule
    rules = db.query(CountryRule).filter(CountryRule.is_active == True).all()
    country_rules = {r.country: r.phone_digits for r in rules}
    country_prefixes = {r.country: r.phone_prefix for r in rules if r.phone_prefix}

    # ── Validation ────────────────────────────────────────────────────────────
    upload.status = "validating"
    db.commit()
    _log(db, job_id, "VALIDATION_STARTED", "Validation engine started", "INFO")

    all_errors: list[dict] = []
    all_corrections: list[dict] = []
    master_rows: list[dict] = []
    valid_rows_data: list[dict] = []
    seen_order_ids: set = set()
    seen_txn_refs: set = set()

    valid_count = 0
    invalid_count = 0
    corrected_count = 0
    duplicate_count = 0

    db_transactions = []
    db_val_results = []

    for idx, row in df.iterrows():
        row_num = int(idx) + 2  # 1-indexed + header
        result = validate_and_correct_row(
            row, row_num, mapping, country_rules, country_prefixes,
            seen_order_ids, seen_txn_refs
        )

        cr = result["corrected_row"]
        cr["_row_number"] = row_num
        cr["_is_valid"] = result["is_valid"]
        cr["_is_duplicate"] = result["is_duplicate"]
        cr["_was_corrected"] = result["was_corrected"]
        cr["_validation_status"] = "valid" if result["is_valid"] else ("corrected" if result["was_corrected"] else "invalid")
        master_rows.append(cr)

        if result["is_valid"]:
            valid_count += 1
            valid_rows_data.append(cr)
        else:
            invalid_count += 1

        if result["is_duplicate"]:
            duplicate_count += 1

        if result["was_corrected"]:
            corrected_count += 1

        all_errors.extend(result["errors"])
        all_corrections.extend(result["corrections"])

        # DB transaction record
        def safe_float(v):
            try:
                return float(str(v).replace(",", "")) if v else None
            except Exception:
                return None
        def safe_int(v):
            try:
                return int(float(str(v).replace(",", ""))) if v else None
            except Exception:
                return None

        txn = Transaction(
            job_id=job_id,
            row_number=row_num,
            order_id=cr.get("order_id"),
            order_date_raw=str(cr.get("order_date") or ""),
            customer_name=cr.get("customer_name"),
            customer_phone=cr.get("customer_phone"),
            customer_phone_raw=str(row.get(mapping.get("customer_phone") or "", "") or ""),
            country=cr.get("country"),
            country_raw=str(row.get(mapping.get("country") or "", "") or ""),
            order_amount=safe_float(cr.get("order_amount")),
            product_id=cr.get("product_id"),
            product_name=cr.get("product_name"),
            quantity=safe_int(cr.get("quantity")),
            unit_price=safe_float(cr.get("unit_price")),
            payment_mode=cr.get("payment_mode"),
            payment_status=cr.get("payment_status"),
            transaction_ref=cr.get("transaction_ref"),
            is_valid=result["is_valid"],
            is_duplicate=result["is_duplicate"],
            was_corrected=result["was_corrected"],
            validation_status=cr["_validation_status"],
        )
        db_transactions.append(txn)

        for err in result["all_issues"]:
            db_val_results.append(ValidationResult(
                job_id=job_id,
                row_number=err["row_number"],
                order_id=str(err.get("order_id") or ""),
                error_type=err["error_type"],
                error_field=err["error_field"],
                error_message=err["error_message"],
                original_value=err.get("original_value"),
                corrected_value=err.get("corrected_value"),
                severity=err.get("severity", "error"),
                was_corrected=err.get("was_corrected", False),
            ))

    # Bulk insert
    db.bulk_save_objects(db_transactions)
    db.bulk_save_objects(db_val_results)
    db.commit()

    _log(db, job_id, "VALIDATION_COMPLETED",
         f"Validated {len(df)} rows: {valid_count} valid, {invalid_count} invalid, {corrected_count} corrected",
         "SUCCESS")

    # ── Scoring ───────────────────────────────────────────────────────────────
    upload.status = "processing"
    db.commit()

    total_cells = len(df) * len(df.columns)
    quality = compute_quality_score(
        len(df), valid_count, corrected_count, duplicate_count,
        profile["missing_values"], total_cells
    )
    invalid_pct = invalid_count / max(len(df), 1) * 100
    dup_pct = duplicate_count / max(len(df), 1) * 100
    readiness = compute_readiness_score(quality["overall"], invalid_pct, dup_pct)

    # ── Insights ──────────────────────────────────────────────────────────────
    error_type_counts = Counter(e["error_type"] for e in all_errors)
    insights = generate_insights(
        all_errors, len(df), valid_count, corrected_count, duplicate_count,
        profile.get("country_distribution", {}), quality["overall"]
    )

    # ── Reports ───────────────────────────────────────────────────────────────
    _log(db, job_id, "REPORT_GENERATION_STARTED", "Generating output reports", "INFO")

    valid_df = pd.DataFrame(valid_rows_data).drop(
        columns=["_row_number", "_is_valid", "_is_duplicate", "_was_corrected", "_validation_status"],
        errors="ignore"
    ) if valid_rows_data else pd.DataFrame()

    zip_files: list[tuple[str, bytes]] = []

    # validated_data.csv
    val_csv = generate_validated_csv(valid_df)
    _save_report(db, job_id, job_dir, "validated_data.csv", "validated_csv", val_csv)
    zip_files.append(("validated_data.csv", val_csv))

    # error_report.csv
    err_csv = generate_error_csv(all_errors)
    _save_report(db, job_id, job_dir, "error_report.csv", "error_csv", err_csv)
    zip_files.append(("error_report.csv", err_csv))

    # master_report.csv
    master_csv = generate_master_csv(master_rows)
    _save_report(db, job_id, job_dir, "master_report.csv", "master_csv", master_csv)
    zip_files.append(("master_report.csv", master_csv))

    # summary_report.pdf
    analytics_summary = {
        "top_countries": dict(Counter(r.get("country") for r in valid_rows_data if r.get("country")).most_common(5)),
        "payment_modes": dict(Counter(r.get("payment_mode") for r in valid_rows_data if r.get("payment_mode"))),
    }
    pdf_bytes = generate_summary_pdf(
        upload.original_filename, profile, quality, readiness,
        insights, analytics_summary, dict(error_type_counts)
    )
    _save_report(db, job_id, job_dir, "summary_report.pdf", "summary_pdf", pdf_bytes)
    zip_files.append(("summary_report.pdf", pdf_bytes))

    # Chunks
    if not valid_df.empty:
        for chunk_name, chunk_data in generate_chunks(valid_df, chunk_size):
            _save_report(db, job_id, job_dir, chunk_name, "chunk_csv", chunk_data)
            zip_files.append((f"chunks/{chunk_name}", chunk_data))

    # Country files
    if not valid_df.empty and "country" in valid_df.columns:
        for country_name, country_data in generate_country_files(valid_df):
            _save_report(db, job_id, job_dir, country_name, "country_csv", country_data)
            zip_files.append((f"countries/{country_name}", country_data))

    # ZIP
    zip_bytes = build_zip(zip_files)
    zip_path = os.path.join(job_dir, "export.zip")
    with open(zip_path, "wb") as f:
        f.write(zip_bytes)
    db.add(GeneratedReport(
        job_id=job_id, report_type="zip",
        file_name="export.zip", file_path=zip_path,
        file_size=len(zip_bytes)
    ))
    db.commit()

    _log(db, job_id, "ZIP_GENERATED", f"ZIP package created: {len(zip_bytes):,} bytes", "SUCCESS")

    # ── History ───────────────────────────────────────────────────────────────
    elapsed = round(time.time() - start_time, 3)
    history = ProcessingHistory(
        job_id=job_id,
        file_name=upload.original_filename,
        upload_date=upload.created_at,
        rows_processed=len(df),
        valid_rows=valid_count,
        invalid_rows=invalid_count,
        corrected_rows=corrected_count,
        duplicate_rows=duplicate_count,
        quality_score=quality["overall"],
        readiness_score=readiness["score"],
        readiness_label=readiness["label"],
        status="completed",
        processing_time_seconds=elapsed,
    )
    db.merge(history)
    upload.status = "completed"
    db.commit()

    _log(db, job_id, "PIPELINE_COMPLETED",
         f"Pipeline finished in {elapsed}s. Quality: {quality['overall']:.1f}/100", "SUCCESS")

    return {
        "job_id": job_id,
        "profile": profile,
        "quality_score": quality,
        "readiness": readiness,
        "insights": insights,
        "summary": {
            "total_rows": len(df),
            "valid_rows": valid_count,
            "invalid_rows": invalid_count,
            "corrected_rows": corrected_count,
            "duplicate_rows": duplicate_count,
            "error_type_counts": dict(error_type_counts),
        },
        "missing_columns": missing,
        "column_mapping": {k: v for k, v in mapping.items() if v},
    }


def _save_report(db, job_id, job_dir, filename, rtype, data: bytes):
    path = os.path.join(job_dir, filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    db.add(GeneratedReport(
        job_id=job_id, report_type=rtype,
        file_name=filename, file_path=path,
        file_size=len(data)
    ))
