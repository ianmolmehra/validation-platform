-- ============================================================
-- Validation Platform — PostgreSQL Schema
-- Compatible with Neon, Railway PostgreSQL
-- ============================================================

-- Country Rules
CREATE TABLE IF NOT EXISTS country_rules (
    id           SERIAL PRIMARY KEY,
    country      VARCHAR(100) NOT NULL UNIQUE,
    phone_digits INTEGER NOT NULL,
    phone_prefix VARCHAR(20),
    currency     VARCHAR(10) DEFAULT 'USD',
    date_format  VARCHAR(50) DEFAULT 'yyyy-MM-dd',
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO country_rules (country, phone_digits, phone_prefix, currency) VALUES
('India',         10, '+91',  'INR'),
('Singapore',      8, '+65',  'SGD'),
('USA',           10, '+1',   'USD'),
('United Kingdom',10, '+44',  'GBP'),
('Australia',      9, '+61',  'AUD'),
('Canada',        10, '+1',   'CAD'),
('Germany',       10, '+49',  'EUR'),
('France',         9, '+33',  'EUR'),
('Japan',         10, '+81',  'JPY'),
('China',         11, '+86',  'CNY'),
('Brazil',        11, '+55',  'BRL'),
('UAE',            9, '+971', 'AED'),
('South Africa',   9, '+27',  'ZAR'),
('Nigeria',       10, '+234', 'NGN'),
('Kenya',          9, '+254', 'KES'),
('Mexico',        10, '+52',  'MXN'),
('Russia',        10, '+7',   'RUB'),
('South Korea',   10, '+82',  'KRW'),
('Italy',         10, '+39',  'EUR'),
('Turkey',        10, '+90',  'TRY'),
('Poland',         9, '+48',  'PLN'),
('Norway',         8, '+47',  'NOK'),
('Sweden',         9, '+46',  'SEK'),
('Ghana',          9, '+233', 'GHS'),
('Senegal',        9, '+221', 'XOF'),
('Burkina Faso',   8, '+226', 'XOF'),
('Morocco',        9, '+212', 'MAD'),
('Algeria',        9, '+213', 'DZD'),
('Saudi Arabia',   9, '+966', 'SAR'),
('Pakistan',      10, '+92',  'PKR'),
('Bangladesh',    10, '+880', 'BDT'),
('Indonesia',     11, '+62',  'IDR'),
('Philippines',   10, '+63',  'PHP'),
('Thailand',       9, '+66',  'THB'),
('Vietnam',        9, '+84',  'VND'),
('Malaysia',       9, '+60',  'MYR'),
('Czech Republic', 9, '+420', 'CZK'),
('Greece',        10, '+30',  'EUR'),
('Ireland',        9, '+353', 'EUR'),
('Portugal',       9, '+351', 'EUR'),
('Netherlands',    9, '+31',  'EUR'),
('Spain',          9, '+34',  'EUR')
ON CONFLICT (country) DO NOTHING;

-- Uploads
CREATE TABLE IF NOT EXISTS uploads (
    id                INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_id            VARCHAR(36) NOT NULL UNIQUE,
    original_filename VARCHAR(500),
    file_path         VARCHAR(1000),
    file_size         BIGINT,
    total_rows        INTEGER DEFAULT 0,
    status            VARCHAR(50) DEFAULT 'pending',
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id                  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_id              VARCHAR(36) NOT NULL REFERENCES uploads(job_id) ON DELETE CASCADE,
    row_number          INTEGER,
    order_id            VARCHAR(200),
    order_date          DATE,
    order_date_raw      VARCHAR(100),
    customer_name       VARCHAR(500),
    customer_phone      VARCHAR(50),
    customer_email      VARCHAR(300),
    customer_address    TEXT,
    country             VARCHAR(200),
    country_raw         VARCHAR(200),
    order_amount        DECIMAL(15,2),
    product_id          VARCHAR(200),
    product_name        VARCHAR(500),
    quantity            INTEGER,
    unit_price          DECIMAL(15,2),
    payment_mode        VARCHAR(100),
    payment_status      VARCHAR(100),
    transaction_ref     VARCHAR(500),
    is_valid            BOOLEAN DEFAULT TRUE,
    is_duplicate        BOOLEAN DEFAULT FALSE,
    was_corrected       BOOLEAN DEFAULT FALSE,
    validation_status   VARCHAR(50) DEFAULT 'valid',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_txn_job_id ON transactions(job_id);
CREATE INDEX IF NOT EXISTS idx_txn_country ON transactions(country);
CREATE INDEX IF NOT EXISTS idx_txn_payment_mode ON transactions(payment_mode);
CREATE INDEX IF NOT EXISTS idx_txn_is_valid ON transactions(is_valid);

-- Validation Results
CREATE TABLE IF NOT EXISTS validation_results (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_id          VARCHAR(36) NOT NULL REFERENCES uploads(job_id) ON DELETE CASCADE,
    transaction_id  INTEGER,
    row_number      INTEGER,
    order_id        VARCHAR(200),
    error_type      VARCHAR(200),
    error_field     VARCHAR(200),
    error_message   TEXT,
    original_value  TEXT,
    corrected_value TEXT,
    severity        VARCHAR(20) DEFAULT 'error',
    was_corrected   BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vr_job_id ON validation_results(job_id);
CREATE INDEX IF NOT EXISTS idx_vr_error_type ON validation_results(error_type);

-- Processing History
CREATE TABLE IF NOT EXISTS processing_history (
    id                      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_id                  VARCHAR(36) NOT NULL UNIQUE REFERENCES uploads(job_id) ON DELETE CASCADE,
    file_name               VARCHAR(500),
    upload_date             TIMESTAMP,
    rows_processed          INTEGER DEFAULT 0,
    valid_rows              INTEGER DEFAULT 0,
    invalid_rows            INTEGER DEFAULT 0,
    corrected_rows          INTEGER DEFAULT 0,
    duplicate_rows          INTEGER DEFAULT 0,
    quality_score           DECIMAL(5,2),
    readiness_score         DECIMAL(5,2),
    readiness_label         VARCHAR(100),
    status                  VARCHAR(50),
    processing_time_seconds DECIMAL(10,3),
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Processing Logs
CREATE TABLE IF NOT EXISTS processing_logs (
    id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_id     VARCHAR(36) NOT NULL REFERENCES uploads(job_id) ON DELETE CASCADE,
    event      VARCHAR(200) NOT NULL,
    message    TEXT,
    level      VARCHAR(20) DEFAULT 'INFO',
    metadata   JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pl_job_id ON processing_logs(job_id);

-- Generated Reports
CREATE TABLE IF NOT EXISTS generated_reports (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_id      VARCHAR(36) NOT NULL REFERENCES uploads(job_id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL,
    file_name   VARCHAR(500),
    file_path   VARCHAR(1000),
    file_size   BIGINT,
    extra_info  JSONB,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gr_job_id ON generated_reports(job_id);
