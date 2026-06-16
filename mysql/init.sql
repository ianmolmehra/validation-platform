-- ============================================================
-- DataValidation Platform - MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS validation_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE validation_platform;

-- ============================================================
-- Country Rules (configurable, no code changes needed)
-- ============================================================
CREATE TABLE IF NOT EXISTS country_rules (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    country     VARCHAR(100) NOT NULL UNIQUE,
    phone_digits INT NOT NULL,
    phone_prefix VARCHAR(20),
    currency    VARCHAR(10) DEFAULT 'USD',
    date_format VARCHAR(50) DEFAULT 'yyyy-MM-dd',
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_country (country)
);

INSERT INTO country_rules (country, phone_digits, phone_prefix, currency) VALUES
('India',       10,  '+91',  'INR'),
('Singapore',   8,   '+65',  'SGD'),
('USA',         10,  '+1',   'USD'),
('UK',          11,  '+44',  'GBP'),
('Australia',   9,   '+61',  'AUD'),
('Canada',      10,  '+1',   'CAD'),
('Germany',     10,  '+49',  'EUR'),
('France',      9,   '+33',  'EUR'),
('Japan',       10,  '+81',  'JPY'),
('China',       11,  '+86',  'CNY'),
('Brazil',      11,  '+55',  'BRL'),
('UAE',         9,   '+971', 'AED'),
('South Africa',9,   '+27',  'ZAR'),
('Nigeria',       10,  '+234', 'NGN'),
('Kenya',         9,  '+254', 'KES'),
('Mexico',        10, '+52',  'MXN'),
('Russia',        10, '+7',   'RUB'),
('South Korea',   10, '+82',  'KRW'),
('Italy',         10, '+39',  'EUR'),
('Turkey',        10, '+90',  'TRY'),
('Poland',        9,  '+48',  'PLN'),
('Norway',        8,  '+47',  'NOK'),
('Sweden',        9,  '+46',  'SEK'),
('Ghana',         9,  '+233', 'GHS'),
('Senegal',       9,  '+221', 'XOF'),
('Burkina Faso',  8,  '+226', 'XOF'),
('Morocco',       9,  '+212', 'MAD'),
('Algeria',       9,  '+213', 'DZD'),
('Saudi Arabia',  9,  '+966', 'SAR'),
('Pakistan',      10, '+92',  'PKR'),
('Bangladesh',    10, '+880', 'BDT'),
('Czech Republic',9,  '+420', 'CZK'),
('Greece',        10, '+30',  'EUR'),
('Ireland',       9,  '+353', 'EUR'),
('Portugal',      9,  '+351', 'EUR'),
('Netherlands',   9,  '+31',  'EUR'),
('Spain',         9,  '+34',  'EUR')
ON DUPLICATE KEY UPDATE phone_digits = VALUES(phone_digits), phone_prefix = VALUES(phone_prefix);

-- ============================================================
-- Uploads
-- ============================================================
CREATE TABLE IF NOT EXISTS uploads (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    job_id          VARCHAR(36) NOT NULL UNIQUE,
    original_filename VARCHAR(500) NOT NULL,
    file_size       BIGINT,
    file_type       VARCHAR(20),
    upload_path     VARCHAR(1000),
    status          ENUM('uploaded','profiling','validating','processing','completed','failed') DEFAULT 'uploaded',
    total_rows      INT DEFAULT 0,
    total_columns   INT DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_job_id (job_id),
    INDEX idx_status (status)
);

-- ============================================================
-- Transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    job_id                  VARCHAR(36) NOT NULL,
    `row_number`            INT,
    order_id                VARCHAR(200),
    order_date              DATE,
    order_date_raw          VARCHAR(100),
    customer_name           VARCHAR(500),
    customer_phone          VARCHAR(50),
    customer_phone_raw      VARCHAR(50),
    country                 VARCHAR(200),
    country_raw             VARCHAR(200),
    order_amount            DECIMAL(15,2),
    product_id              VARCHAR(200),
    product_name            VARCHAR(500),
    quantity                INT,
    unit_price              DECIMAL(15,2),
    payment_mode            VARCHAR(100),
    payment_status          VARCHAR(100),
    transaction_ref         VARCHAR(500),
    is_valid                BOOLEAN DEFAULT TRUE,
    is_duplicate            BOOLEAN DEFAULT FALSE,
    was_corrected           BOOLEAN DEFAULT FALSE,
    validation_status       ENUM('valid','invalid','corrected') DEFAULT 'valid',
    created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_job_id (job_id),
    INDEX idx_country (country),
    INDEX idx_payment_mode (payment_mode),
    INDEX idx_order_date (order_date),
    INDEX idx_is_valid (is_valid),
    FOREIGN KEY (job_id) REFERENCES uploads(job_id) ON DELETE CASCADE
);

-- ============================================================
-- Validation Results
-- ============================================================
CREATE TABLE IF NOT EXISTS validation_results (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    job_id          VARCHAR(36) NOT NULL,
    transaction_id  INT,
    `row_number`    INT,
    order_id        VARCHAR(200),
    error_type      VARCHAR(200),
    error_field     VARCHAR(200),
    error_message   TEXT,
    original_value  TEXT,
    corrected_value TEXT,
    severity        ENUM('error','warning','info') DEFAULT 'error',
    was_corrected   BOOLEAN DEFAULT FALSE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_job_id (job_id),
    INDEX idx_error_type (error_type),
    FOREIGN KEY (job_id) REFERENCES uploads(job_id) ON DELETE CASCADE
);

-- ============================================================
-- Processing History
-- ============================================================
CREATE TABLE IF NOT EXISTS processing_history (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    job_id          VARCHAR(36) NOT NULL UNIQUE,
    file_name       VARCHAR(500),
    upload_date     DATETIME,
    rows_processed  INT DEFAULT 0,
    valid_rows      INT DEFAULT 0,
    invalid_rows    INT DEFAULT 0,
    corrected_rows  INT DEFAULT 0,
    duplicate_rows  INT DEFAULT 0,
    quality_score   DECIMAL(5,2),
    readiness_score DECIMAL(5,2),
    readiness_label VARCHAR(100),
    status          VARCHAR(50),
    processing_time_seconds DECIMAL(10,3),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_job_id (job_id),
    INDEX idx_upload_date (upload_date),
    FOREIGN KEY (job_id) REFERENCES uploads(job_id) ON DELETE CASCADE
);

-- ============================================================
-- Processing Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS processing_logs (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    job_id      VARCHAR(36) NOT NULL,
    event       VARCHAR(200) NOT NULL,
    message     TEXT,
    level       ENUM('INFO','WARNING','ERROR','SUCCESS') DEFAULT 'INFO',
    metadata    JSON,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_job_id (job_id),
    INDEX idx_level (level),
    FOREIGN KEY (job_id) REFERENCES uploads(job_id) ON DELETE CASCADE
);

-- ============================================================
-- Generated Reports
-- ============================================================
CREATE TABLE IF NOT EXISTS generated_reports (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    job_id      VARCHAR(36) NOT NULL,
    report_type ENUM('validated_csv','error_csv','master_csv','summary_pdf','zip','country_csv','chunk_csv') NOT NULL,
    file_name   VARCHAR(500),
    file_path   VARCHAR(1000),
    file_size   BIGINT,
    extra_info  JSON,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_job_id (job_id),
    FOREIGN KEY (job_id) REFERENCES uploads(job_id) ON DELETE CASCADE
);
