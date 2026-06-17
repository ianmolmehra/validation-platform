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

from database import engine, Base, check_db_connection, SessionLocal
import models  # noqa — register all models

# Auto-create tables if not using docker init.sql
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"DB table creation warning: {e}")

# Seed country rules if table is empty (needed for Render/Neon — init.sql only runs locally)
def _seed_countries():
    from models import CountryRule
    db = SessionLocal()
    try:
        if db.query(CountryRule).count() == 0:
            countries = [
                ("India", 10, "+91", "INR"), ("Singapore", 8, "+65", "SGD"),
                ("USA", 10, "+1", "USD"), ("UK", 11, "+44", "GBP"),
                ("Australia", 9, "+61", "AUD"), ("Canada", 10, "+1", "CAD"),
                ("Germany", 10, "+49", "EUR"), ("France", 9, "+33", "EUR"),
                ("Japan", 10, "+81", "JPY"), ("China", 11, "+86", "CNY"),
                ("Brazil", 11, "+55", "BRL"), ("UAE", 9, "+971", "AED"),
                ("South Africa", 9, "+27", "ZAR"), ("Nigeria", 10, "+234", "NGN"),
                ("Kenya", 9, "+254", "KES"), ("Mexico", 10, "+52", "MXN"),
                ("Russia", 10, "+7", "RUB"), ("South Korea", 10, "+82", "KRW"),
                ("Italy", 10, "+39", "EUR"), ("Turkey", 10, "+90", "TRY"),
                ("Poland", 9, "+48", "PLN"), ("Norway", 8, "+47", "NOK"),
                ("Sweden", 9, "+46", "SEK"), ("Ghana", 9, "+233", "GHS"),
                ("Senegal", 9, "+221", "XOF"), ("Burkina Faso", 8, "+226", "XOF"),
                ("Morocco", 9, "+212", "MAD"), ("Algeria", 9, "+213", "DZD"),
                ("Saudi Arabia", 9, "+966", "SAR"), ("Pakistan", 10, "+92", "PKR"),
                ("Bangladesh", 10, "+880", "BDT"), ("Czech Republic", 9, "+420", "CZK"),
                ("Greece", 10, "+30", "EUR"), ("Ireland", 9, "+353", "EUR"),
                ("Portugal", 9, "+351", "EUR"), ("Netherlands", 9, "+31", "EUR"),
                ("Spain", 9, "+34", "EUR"),
            ]
            for country, digits, prefix, currency in countries:
                db.add(CountryRule(country=country, phone_digits=digits, phone_prefix=prefix, currency=currency))
            db.commit()
            print("Country rules seeded.")
    except Exception as e:
        print(f"Country seeding warning: {e}")
        db.rollback()
    finally:
        db.close()

try:
    _seed_countries()
except Exception as e:
    print(f"Seeding skipped: {e}")

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
