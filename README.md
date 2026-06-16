# Validation Platform

**Enterprise Transaction Data Validation & Processing Platform**

A production-grade platform for uploading, validating, auto-correcting, and analysing transaction datasets. Built for enterprise implementation teams.

---

## Features

| Feature | Details |
|---|---|
| **File Upload** | CSV, XLSX, XLS · Drag & drop · Progress indicator |
| **Column Auto-Detection** | 100+ aliases per field — no renaming needed |
| **7-Stage Validation** | Schema → Phone → Date → Payment → Numeric → Duplicate → Integrity |
| **Auto-Correction** | Phone normalization, country name, date format, text whitespace |
| **Audit Logs** | Every correction stored with before/after values |
| **Data Quality Score** | 0–100 across Completeness, Accuracy, Validity, Consistency, Uniqueness |
| **Client Readiness Score** | Ready / Minor Cleanup / Major Cleanup / Not Ready |
| **AI Insights** | Rule-based pattern recognition — no external AI API |
| **SQL Analytics** | Revenue by country, payment distribution, error heatmaps, daily volume |
| **Reports** | validated.csv, error.csv, master.csv, summary.pdf, country files, chunks, ZIP |
| **REST API** | Full Swagger/OpenAPI at `/docs` |

---

## Tech Stack

- **Frontend**: React 18 · TypeScript · TailwindCSS · Recharts · React Query
- **Backend**: FastAPI (Python 3.11) · SQLAlchemy · Pydantic
- **Database**: MySQL 8
- **Processing**: Pandas · NumPy · OpenPyXL
- **Reports**: ReportLab (PDF)
- **Deployment**: Docker · Docker Compose

---

## Quick Start (Docker)

```bash
# 1. Clone / extract the project
cd validation-platform

# 2. Copy environment file
cp .env.example .env
# Edit .env and set MYSQL_ROOT_PASSWORD

# 3. Start all services
docker-compose up --build -d

# 4. Open in browser
# Frontend:  http://localhost:3000
# API Docs:  http://localhost:8000/docs
```

---

## Local Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set env vars
export DATABASE_URL="mysql+pymysql://root:password@localhost:3306/validation_platform"

# Run MySQL first (via docker or local install)
docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=validation_platform mysql:8.0
# Wait ~30s then run the schema
mysql -h 127.0.0.1 -u root -ppassword validation_platform < ../mysql/init.sql

uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
# Opens on http://localhost:3000
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/upload` | Upload CSV or XLSX file |
| GET | `/api/status/{jobId}` | Poll job status |
| GET | `/api/results/{jobId}` | Full validation results |
| GET | `/api/transactions/{jobId}` | Paginated transaction records |
| GET | `/api/analytics` | Platform-wide SQL analytics |
| GET | `/api/history` | Processing history |
| GET | `/api/logs` | Processing logs |
| GET | `/api/download/zip/{jobId}` | Download ZIP package |
| GET | `/api/download/report/{jobId}` | Download PDF report |
| GET | `/api/download/validated/{jobId}` | Download validated CSV |
| GET | `/api/download/errors/{jobId}` | Download error CSV |
| GET | `/api/download/master/{jobId}` | Download master CSV |
| GET | `/api/reports/{jobId}` | List all generated report files |

Full Swagger UI: `http://localhost:8000/docs`

---

## Validation Stages

1. **Schema Validation** — Required columns, aliases, unexpected columns
2. **Phone Validation** — Country-specific digit rules from `country_rules` DB table
3. **Date Validation** — Accepts `yyyy-MM-dd`, `dd/MM/yyyy`, `dd-MMM-yyyy` and more
4. **Payment Validation** — Card, Cash, UPI, Wallet, Net Banking (with alias normalisation)
5. **Numeric Validation** — Quantity, Unit Price, Order Amount must be > 0
6. **Duplicate Detection** — Order ID + Transaction Reference deduplication
7. **Data Integrity** — Missing values, invalid formats, corrupted rows

---

## Column Aliases (examples)

The system auto-maps these to canonical fields — no header renaming needed:

| Canonical | Accepted Aliases |
|---|---|
| `order_id` | OrderID, order no, sale_id, invoice_id, ref_id |
| `customer_phone` | phone, mobile, mobile_number, contact, telephone, cell |
| `order_amount` | amount, total, revenue, grand_total, sale_amount |
| `payment_mode` | payment_method, pay_mode, payment_type, mode |
| `order_date` | date, sale_date, transaction_date, invoice_date, created_at |
| `transaction_ref` | reference, txn_id, ref_no, txn_ref, reference_number |

---

## Sample Dataset

`sample_data/sample_transactions.csv` — 30 rows with intentional errors:
- Missing phone, invalid phone formats
- Mixed date formats
- Country name variations (india → India, usa → USA)
- Duplicate Order ID and Transaction Reference
- Negative Order Amount
- Invalid payment mode

---

## Database Schema

| Table | Purpose |
|---|---|
| `country_rules` | Phone digit rules per country (configurable) |
| `uploads` | File upload metadata |
| `transactions` | Normalised transaction records |
| `validation_results` | Per-row errors and corrections |
| `processing_history` | Job summary with scores |
| `processing_logs` | Timestamped event log |
| `generated_reports` | Paths to generated output files |

---

## Project Structure

```
validation-platform/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── database.py              # SQLAlchemy engine + session
│   ├── models.py                # ORM models
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── routers/
│   │   ├── upload.py            # POST /api/upload
│   │   ├── results.py           # GET /api/results, /api/transactions
│   │   ├── analytics.py         # GET /api/analytics
│   │   ├── history.py           # GET /api/history
│   │   ├── logs.py              # GET /api/logs
│   │   └── download.py          # GET /api/download/*
│   └── services/
│       ├── pipeline.py          # ETL orchestrator
│       ├── column_mapper.py     # 100+ alias mapping
│       ├── validator.py         # 7-stage validation
│       ├── autocorrect.py       # Phone/country/date correction
│       ├── profiler.py          # Dataset profiling
│       ├── scoring.py           # Quality + readiness scores
│       ├── insights.py          # Rule-based AI insights
│       └── report_generator.py  # CSV, PDF, ZIP generation
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/client.ts        # Axios API layer
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Upload.tsx
│   │   │   ├── Results.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── History.tsx
│   │   │   ├── Logs.tsx
│   │   │   └── Reports.tsx
│   │   └── components/
│   │       ├── Layout.tsx
│   │       ├── StatCard.tsx
│   │       └── ScoreRing.tsx
│   ├── Dockerfile
│   └── nginx.conf
├── mysql/
│   └── init.sql                 # Full MySQL schema
├── sample_data/
│   └── sample_transactions.csv
├── docker-compose.yml
├── .env.example
└── README.md
```

---

*Built as an enterprise-grade internship assignment demonstrating Python, SQL, REST API, ETL pipeline, and data engineering skills.*
