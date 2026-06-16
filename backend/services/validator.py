"""
7-stage validation engine + auto-correction integration.
"""
from __future__ import annotations
import re
import pandas as pd
import numpy as np
from datetime import datetime, date
from typing import Any, Optional
from services.autocorrect import (
    normalize_country, normalize_phone, normalize_date,
    normalize_text, normalize_payment_mode,
)

VALID_PAYMENT_MODES = {"Card", "Cash", "UPI", "Wallet", "Net Banking"}
DATE_FORMATS = [
    "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y",
    "%d-%b-%Y", "%d-%B-%Y", "%Y/%m/%d",
]
MIN_VALID_DATE = datetime(2000, 1, 1)
MAX_VALID_DATE = datetime(2030, 12, 31)


def _parse_date(val: Any) -> Optional[datetime]:
    if pd.isna(val) or str(val).strip() in ("", "nan", "None", "NaT"):
        return None
    s = str(val).strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def validate_and_correct_row(
    row: pd.Series,
    row_num: int,
    mapping: dict[str, Optional[str]],
    country_rules: dict[str, int],
    country_prefixes: dict[str, str],
    seen_order_ids: set,
    seen_txn_refs: set,
) -> dict:
    errors: list[dict] = []
    corrections: list[dict] = []
    corrected: dict = {}
    is_duplicate = False

    def get(field: str) -> Any:
        col = mapping.get(field)
        if col is None:
            return None
        v = row.get(col)
        return None if pd.isna(v) or str(v).strip() in ("nan", "None", "NaT", "") else v

    def add_error(field, etype, msg, orig=None):
        errors.append({
            "row_number": row_num,
            "order_id": get("order_id"),
            "error_type": etype,
            "error_field": field,
            "error_message": msg,
            "original_value": str(orig) if orig is not None else None,
            "corrected_value": None,
            "severity": "error",
            "was_corrected": False,
        })

    def add_correction(field, etype, msg, orig, fixed):
        corrections.append({
            "row_number": row_num,
            "order_id": get("order_id"),
            "error_type": etype,
            "error_field": field,
            "error_message": msg,
            "original_value": str(orig),
            "corrected_value": str(fixed),
            "severity": "warning",
            "was_corrected": True,
        })

    # ── Stage 1: Duplicate detection ─────────────────────────────────────────
    oid = str(get("order_id") or "").strip()
    txn = str(get("transaction_ref") or "").strip()
    if oid and oid in seen_order_ids:
        is_duplicate = True
        add_error("order_id", "DUPLICATE_ORDER_ID", f"Duplicate Order ID: {oid}", oid)
    elif oid:
        seen_order_ids.add(oid)
    if txn and txn in seen_txn_refs:
        is_duplicate = True
        add_error("transaction_ref", "DUPLICATE_TXN_REF", f"Duplicate Transaction Reference: {txn}", txn)
    elif txn:
        seen_txn_refs.add(txn)

    # ── Stage 2: Missing required fields ─────────────────────────────────────
    required_fields = [
        "order_id", "order_date", "customer_name", "customer_phone",
        "country", "order_amount", "product_id", "product_name",
        "quantity", "unit_price", "payment_mode", "payment_status",
        "transaction_ref",
    ]
    for field in required_fields:
        if get(field) is None:
            add_error(field, "MISSING_VALUE", f"Field '{field}' is missing or empty")

    # ── Stage 3: Country normalisation ───────────────────────────────────────
    raw_country = get("country")
    if raw_country is not None:
        norm_country, country_corrected = normalize_country(str(raw_country))
        corrected["country"] = norm_country
        if country_corrected:
            add_correction("country", "COUNTRY_NORMALIZED", "Country name normalised",
                           raw_country, norm_country)

    # ── Stage 4: Phone validation & correction ────────────────────────────────
    raw_phone = get("customer_phone")
    country_for_rule = corrected.get("country", raw_country)
    expected_digits = None
    phone_prefix = None
    if country_for_rule:
        expected_digits = country_rules.get(str(country_for_rule).strip())
        phone_prefix = country_prefixes.get(str(country_for_rule).strip())
    if raw_phone is not None:
        norm_phone, phone_corrected = normalize_phone(str(raw_phone), expected_digits, phone_prefix)
        corrected["customer_phone"] = norm_phone
        if phone_corrected:
            add_correction("customer_phone", "PHONE_NORMALIZED",
                           "Phone number normalised (country code stripped)", raw_phone, norm_phone)
        digits = re.sub(r"\D", "", norm_phone)
        if expected_digits and len(digits) != expected_digits:
            add_error("customer_phone", "INVALID_PHONE",
                      f"Phone must be {expected_digits} digits for {country_for_rule}, got {len(digits)}",
                      raw_phone)
        elif not expected_digits and country_for_rule:
            # Country exists in data but has no rule configured — flag as unknown
            add_error("customer_phone", "UNKNOWN_COUNTRY_PHONE_RULE",
                      f"No phone rule configured for country '{country_for_rule}'. Cannot validate.",
                      raw_phone)

    # ── Stage 5: Date validation & correction ─────────────────────────────────
    raw_date = get("order_date")
    if raw_date is not None:
        norm_date, date_corrected = normalize_date(str(raw_date))
        corrected["order_date"] = norm_date
        if date_corrected:
            add_correction("order_date", "DATE_NORMALIZED",
                           "Date format normalised to ISO 8601", raw_date, norm_date)
        parsed = _parse_date(norm_date)
        if parsed is None:
            add_error("order_date", "INVALID_DATE",
                      f"Cannot parse date: '{raw_date}'", raw_date)
        else:
            if parsed > datetime.now():
                add_error("order_date", "FUTURE_DATE",
                          f"Order date {norm_date} is in the future", raw_date)
            elif parsed < MIN_VALID_DATE:
                add_error("order_date", "DATE_TOO_OLD",
                          f"Order date {norm_date} is before year 2000, likely incorrect", raw_date)

    # ── Stage 6: Payment mode validation ─────────────────────────────────────
    raw_pm = get("payment_mode")
    if raw_pm is not None:
        norm_pm, pm_corrected = normalize_payment_mode(str(raw_pm))
        corrected["payment_mode"] = norm_pm
        if pm_corrected:
            add_correction("payment_mode", "PAYMENT_NORMALIZED",
                           "Payment mode normalised", raw_pm, norm_pm)
        if norm_pm not in VALID_PAYMENT_MODES:
            add_error("payment_mode", "INVALID_PAYMENT_MODE",
                      f"'{norm_pm}' is not a valid payment mode. Allowed: {', '.join(sorted(VALID_PAYMENT_MODES))}",
                      raw_pm)

    # ── Stage 7: Numeric validation ───────────────────────────────────────────
    for field, label in [("quantity", "Quantity"), ("unit_price", "Unit Price"), ("order_amount", "Order Amount")]:
        val = get(field)
        if val is not None:
            try:
                n = float(str(val).replace(",", ""))
                corrected[field] = n
                if n <= 0:
                    add_error(field, "INVALID_NUMERIC",
                              f"{label} must be > 0, got {n}", val)
            except (ValueError, TypeError):
                add_error(field, "INVALID_NUMERIC",
                          f"{label} is not a valid number: '{val}'", val)

    # ── Text normalisation ────────────────────────────────────────────────────
    for field in ["customer_name", "product_name"]:
        val = get(field)
        if val is not None:
            norm, was = normalize_text(str(val))
            corrected[field] = norm
            if was:
                add_correction(field, "TEXT_NORMALIZED",
                               "Whitespace/formatting corrected", val, norm)

    # Build corrected row dict
    result_row: dict = {}
    for canonical, actual_col in mapping.items():
        if actual_col is not None:
            result_row[canonical] = corrected.get(canonical, get(canonical))
        else:
            result_row[canonical] = None

    all_issues = errors + corrections
    is_valid = not any(e["severity"] == "error" for e in errors)

    return {
        "errors": errors,
        "corrections": corrections,
        "all_issues": all_issues,
        "corrected_row": result_row,
        "is_valid": is_valid,
        "is_duplicate": is_duplicate,
        "was_corrected": bool(corrections),
    }
