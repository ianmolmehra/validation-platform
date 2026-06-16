from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Enum, Text,
    ForeignKey, JSON, DECIMAL, Date, BigInteger
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class UploadStatus(str, enum.Enum):
    uploaded = "uploaded"
    profiling = "profiling"
    validating = "validating"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class Upload(Base):
    __tablename__ = "uploads"
    id = Column(Integer, primary_key=True)
    job_id = Column(String(36), unique=True, nullable=False, index=True)
    original_filename = Column(String(500), nullable=False)
    file_size = Column(BigInteger)
    file_type = Column(String(20))
    upload_path = Column(String(1000))
    status = Column(String(50), default="uploaded")
    total_rows = Column(Integer, default=0)
    total_columns = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    transactions = relationship("Transaction", back_populates="upload", cascade="all, delete-orphan")
    validation_results = relationship("ValidationResult", back_populates="upload", cascade="all, delete-orphan")
    history = relationship("ProcessingHistory", back_populates="upload", uselist=False, cascade="all, delete-orphan")
    logs = relationship("ProcessingLog", back_populates="upload", cascade="all, delete-orphan")
    reports = relationship("GeneratedReport", back_populates="upload", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True)
    job_id = Column(String(36), ForeignKey("uploads.job_id", ondelete="CASCADE"), nullable=False, index=True)
    row_number = Column(Integer)
    order_id = Column(String(200))
    order_date = Column(Date)
    order_date_raw = Column(String(100))
    customer_name = Column(String(500))
    customer_phone = Column(String(50))
    customer_phone_raw = Column(String(50))
    country = Column(String(200))
    country_raw = Column(String(200))
    order_amount = Column(DECIMAL(15, 2))
    product_id = Column(String(200))
    product_name = Column(String(500))
    quantity = Column(Integer)
    unit_price = Column(DECIMAL(15, 2))
    payment_mode = Column(String(100))
    payment_status = Column(String(100))
    transaction_ref = Column(String(500))
    is_valid = Column(Boolean, default=True)
    is_duplicate = Column(Boolean, default=False)
    was_corrected = Column(Boolean, default=False)
    validation_status = Column(String(50), default="valid")
    created_at = Column(DateTime, server_default=func.now())

    upload = relationship("Upload", back_populates="transactions")


class ValidationResult(Base):
    __tablename__ = "validation_results"
    id = Column(Integer, primary_key=True)
    job_id = Column(String(36), ForeignKey("uploads.job_id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_id = Column(Integer)
    row_number = Column(Integer)
    order_id = Column(String(200))
    error_type = Column(String(200))
    error_field = Column(String(200))
    error_message = Column(Text)
    original_value = Column(Text)
    corrected_value = Column(Text)
    severity = Column(String(20), default="error")
    was_corrected = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    upload = relationship("Upload", back_populates="validation_results")


class ProcessingHistory(Base):
    __tablename__ = "processing_history"
    id = Column(Integer, primary_key=True)
    job_id = Column(String(36), ForeignKey("uploads.job_id", ondelete="CASCADE"), unique=True, nullable=False)
    file_name = Column(String(500))
    upload_date = Column(DateTime)
    rows_processed = Column(Integer, default=0)
    valid_rows = Column(Integer, default=0)
    invalid_rows = Column(Integer, default=0)
    corrected_rows = Column(Integer, default=0)
    duplicate_rows = Column(Integer, default=0)
    quality_score = Column(DECIMAL(5, 2))
    readiness_score = Column(DECIMAL(5, 2))
    readiness_label = Column(String(100))
    status = Column(String(50))
    processing_time_seconds = Column(DECIMAL(10, 3))
    created_at = Column(DateTime, server_default=func.now())

    upload = relationship("Upload", back_populates="history")


class ProcessingLog(Base):
    __tablename__ = "processing_logs"
    id = Column(Integer, primary_key=True)
    job_id = Column(String(36), ForeignKey("uploads.job_id", ondelete="CASCADE"), nullable=False, index=True)
    event = Column(String(200), nullable=False)
    message = Column(Text)
    level = Column(String(20), default="INFO")
    log_metadata = Column(JSON, name="metadata")
    created_at = Column(DateTime, server_default=func.now())

    upload = relationship("Upload", back_populates="logs")


class GeneratedReport(Base):
    __tablename__ = "generated_reports"
    id = Column(Integer, primary_key=True)
    job_id = Column(String(36), ForeignKey("uploads.job_id", ondelete="CASCADE"), nullable=False, index=True)
    report_type = Column(String(50))
    file_name = Column(String(500))
    file_path = Column(String(1000))
    file_size = Column(BigInteger)
    extra_info = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())

    upload = relationship("Upload", back_populates="reports")


class CountryRule(Base):
    __tablename__ = "country_rules"
    id = Column(Integer, primary_key=True)
    country = Column(String(100), unique=True, nullable=False)
    phone_digits = Column(Integer, nullable=False)
    phone_prefix = Column(String(20))
    currency = Column(String(10), default="USD")
    date_format = Column(String(50), default="yyyy-MM-dd")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
