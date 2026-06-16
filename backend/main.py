"""
Validation Platform — FastAPI Backend
Enterprise Transaction Data Validation & Processing
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

load_dotenv()

from database import engine, Base, check_db_connection
import models  # noqa — register all models

# Auto-create tables if not using docker init.sql
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"DB table creation warning: {e}")

from routers import upload, results, analytics, history, logs, download
from routers import countries

app = FastAPI(
    title="Validation Platform API",
    description="""
## Enterprise Transaction Data Validation & Processing Platform

Upload CSV/XLSX transaction files and get:
- **7-stage validation** with auto-correction
- **Data quality scoring** (0–100)
- **Client readiness assessment**
- **AI-powered insights** (rule-based)
- **Downloadable reports**: validated CSV, error CSV, master CSV, PDF summary, ZIP export
- **SQL analytics**: revenue by country, payment mode distribution, and more

### Supported Column Aliases
The platform auto-detects 100+ column name variations — no need to rename your headers.
    """,
    version="1.0.0",
    contact={"name": "Validation Platform", "email": "support@validationplatform.io"},
    license_info={"name": "MIT"},
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(results.router)
app.include_router(analytics.router)
app.include_router(history.router)
app.include_router(logs.router)
app.include_router(download.router)
app.include_router(countries.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "platform": "Validation Platform",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    db_ok = check_db_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
    }


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": str(exc), "type": type(exc).__name__})
