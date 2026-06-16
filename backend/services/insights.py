"""Rule-based AI Insights Engine (no external AI APIs)."""
from __future__ import annotations
from collections import Counter


def generate_insights(
    errors: list[dict],
    total_rows: int,
    valid_rows: int,
    corrected_rows: int,
    duplicate_rows: int,
    country_dist: dict,
    quality_score: float,
) -> list[dict]:
    insights: list[dict] = []

    if total_rows == 0:
        return insights

    error_types = Counter(e["error_type"] for e in errors)
    error_fields = Counter(e["error_field"] for e in errors if e.get("error_field"))
    total_errors = len(errors)
    invalid_rows = total_rows - valid_rows

    # ── Overall quality assessment ─────────────────────────────────────────────
    if quality_score >= 90:
        insights.append({
            "type": "quality", "icon": "✅",
            "title": "Excellent Data Quality",
            "message": f"Quality score {quality_score:.1f}/100 — dataset is clean and production-ready with minimal issues.",
            "severity": "success",
        })
    elif quality_score >= 75:
        insights.append({
            "type": "quality", "icon": "🟢",
            "title": "Good Data Quality",
            "message": f"Quality score {quality_score:.1f}/100 — dataset is mostly clean. Address flagged issues before loading to production.",
            "severity": "success",
        })
    elif quality_score >= 55:
        insights.append({
            "type": "quality", "icon": "🟡",
            "title": "Moderate Data Quality",
            "message": f"Quality score {quality_score:.1f}/100 — {invalid_rows} of {total_rows} rows have errors. Remediation required before production use.",
            "severity": "warning",
        })
    else:
        insights.append({
            "type": "quality", "icon": "🔴",
            "title": "Low Data Quality",
            "message": f"Quality score {quality_score:.1f}/100 — significant issues found in {invalid_rows} rows ({invalid_rows/total_rows*100:.1f}%). Major remediation needed.",
            "severity": "error",
        })

    # ── Phone number analysis ──────────────────────────────────────────────────
    phone_invalid = error_types.get("INVALID_PHONE", 0)
    phone_unknown = error_types.get("UNKNOWN_COUNTRY_PHONE_RULE", 0)
    phone_normalized = error_types.get("PHONE_NORMALIZED", 0)
    if phone_invalid > 0:
        pct = round(phone_invalid / total_rows * 100, 1)
        insights.append({
            "type": "phone", "icon": "📞",
            "title": "Invalid Phone Numbers",
            "message": f"{phone_invalid} records ({pct}%) have phone numbers with incorrect digit count for their country. These rows are marked invalid.",
            "severity": "error" if pct > 10 else "warning",
        })
    if phone_normalized > 0:
        insights.append({
            "type": "phone_fix", "icon": "🔧",
            "title": "Phone Numbers Auto-Corrected",
            "message": f"{phone_normalized} phone numbers were auto-corrected by stripping country dialing codes (e.g. +91, +1). Corrected values are in the validated output.",
            "severity": "info",
        })
    if phone_unknown > 0:
        insights.append({
            "type": "phone_rule", "icon": "🌐",
            "title": "Missing Phone Rules for Countries",
            "message": f"{phone_unknown} records belong to countries with no configured phone-digit rules. Add rules in the country_rules table to enable validation.",
            "severity": "warning",
        })

    # ── Duplicate records ──────────────────────────────────────────────────────
    dup_order = error_types.get("DUPLICATE_ORDER_ID", 0)
    dup_txn = error_types.get("DUPLICATE_TXN_REF", 0)
    if duplicate_rows > 0:
        pct = round(duplicate_rows / total_rows * 100, 1)
        detail = []
        if dup_order:
            detail.append(f"{dup_order} duplicate Order IDs")
        if dup_txn:
            detail.append(f"{dup_txn} duplicate Transaction References")
        insights.append({
            "type": "duplicate", "icon": "🔁",
            "title": "Duplicate Records Detected",
            "message": f"{duplicate_rows} duplicate rows found ({pct}%): {', '.join(detail)}. Implement deduplication upstream at the data source.",
            "severity": "error" if pct > 5 else "warning",
        })

    # ── Auto-corrections applied ───────────────────────────────────────────────
    if corrected_rows > 0:
        pct = round(corrected_rows / total_rows * 100, 1)
        correction_types = []
        if error_types.get("COUNTRY_NORMALIZED"):
            correction_types.append("country names")
        if phone_normalized:
            correction_types.append("phone numbers")
        if error_types.get("DATE_NORMALIZED"):
            correction_types.append("date formats")
        if error_types.get("PAYMENT_NORMALIZED"):
            correction_types.append("payment modes")
        insights.append({
            "type": "correction", "icon": "⚙️",
            "title": "Auto-Corrections Applied",
            "message": f"{corrected_rows} records ({pct}%) were auto-corrected ({', '.join(correction_types) if correction_types else 'various fields'}). Download the validated CSV to see corrected values.",
            "severity": "info",
        })

    # ── Missing values ─────────────────────────────────────────────────────────
    missing_total = error_types.get("MISSING_VALUE", 0)
    if missing_total > 0:
        top_missing = [(f, c) for f, c in error_fields.most_common(5) if
                       any(e["error_field"] == f and e["error_type"] == "MISSING_VALUE" for e in errors)]
        field_detail = ", ".join(f"'{f}' ({c})" for f, c in top_missing[:3]) if top_missing else ""
        insights.append({
            "type": "completeness", "icon": "📋",
            "title": "Missing Required Fields",
            "message": f"{missing_total} missing-value errors detected.{' Top fields: ' + field_detail + '.' if field_detail else ''} Enforce mandatory fields at the data entry point.",
            "severity": "warning",
        })

    # ── Date issues ────────────────────────────────────────────────────────────
    future_dates = error_types.get("FUTURE_DATE", 0)
    old_dates = error_types.get("DATE_TOO_OLD", 0)
    invalid_dates = error_types.get("INVALID_DATE", 0)
    if future_dates > 0:
        insights.append({
            "type": "date", "icon": "📅",
            "title": "Future Order Dates Detected",
            "message": f"{future_dates} records have order dates in the future. These may be pre-orders or data entry errors — review before production load.",
            "severity": "warning",
        })
    if invalid_dates > 0:
        insights.append({
            "type": "date", "icon": "❌",
            "title": "Unparseable Dates",
            "message": f"{invalid_dates} records have dates that could not be parsed in any known format. Standardise to YYYY-MM-DD at the source system.",
            "severity": "error",
        })

    # ── Numeric / amount issues ────────────────────────────────────────────────
    numeric_errors = error_types.get("INVALID_NUMERIC", 0)
    if numeric_errors > 0:
        insights.append({
            "type": "numeric", "icon": "💰",
            "title": "Invalid Numeric Values",
            "message": f"{numeric_errors} records have zero, negative, or non-numeric values in Quantity, Unit Price, or Order Amount. All must be positive numbers.",
            "severity": "error",
        })

    # ── Payment mode issues ────────────────────────────────────────────────────
    payment_errors = error_types.get("INVALID_PAYMENT_MODE", 0)
    payment_fixed = error_types.get("PAYMENT_NORMALIZED", 0)
    if payment_errors > 0:
        insights.append({
            "type": "payment", "icon": "💳",
            "title": "Invalid Payment Modes",
            "message": f"{payment_errors} records have unrecognised payment modes. Allowed: Card, Cash, UPI, Wallet, Net Banking.",
            "severity": "error",
        })

    # ── Geographical distribution ──────────────────────────────────────────────
    if country_dist and len(country_dist) > 1:
        top_country, top_count = max(country_dist.items(), key=lambda x: x[1])
        pct = round(top_count / total_rows * 100, 1)
        num_countries = len(country_dist)
        if pct > 60:
            insights.append({
                "type": "distribution", "icon": "🌍",
                "title": "High Geographic Concentration",
                "message": f"{pct}% of records are from {top_country} across {num_countries} countries. Verify this matches your expected data distribution.",
                "severity": "info",
            })
        else:
            insights.append({
                "type": "distribution", "icon": "🌍",
                "title": "Multi-Country Dataset",
                "message": f"Data spans {num_countries} countries. Top market: {top_country} ({pct}%). Country-specific phone rules are applied per row.",
                "severity": "info",
            })

    # ── Most problematic field ─────────────────────────────────────────────────
    if error_fields:
        top_field, top_field_count = error_fields.most_common(1)[0]
        field_pct = round(top_field_count / total_rows * 100, 1)
        insights.append({
            "type": "field_quality", "icon": "🔍",
            "title": "Most Error-Prone Field",
            "message": f"'{top_field}' has the highest error rate with {top_field_count} issues ({field_pct}% of rows). Prioritise this field for upstream data quality improvement.",
            "severity": "warning" if field_pct > 5 else "info",
        })

    return insights
