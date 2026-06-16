"""Data Quality Score & Client Readiness Score."""
from __future__ import annotations


def compute_quality_score(
    total_rows: int,
    valid_rows: int,
    corrected_rows: int,
    duplicate_rows: int,
    missing_values: int,
    total_cells: int,
) -> dict:
    if total_rows == 0:
        return {"overall": 0, "completeness": 0, "accuracy": 0,
                "validity": 0, "consistency": 0, "uniqueness": 0}

    completeness = max(0, 100 - (missing_values / max(total_cells, 1)) * 100)
    validity = (valid_rows / total_rows) * 100
    accuracy = min(100, validity + (corrected_rows / total_rows) * 10)
    uniqueness = max(0, 100 - (duplicate_rows / total_rows) * 100)
    consistency = min(100, (valid_rows + corrected_rows) / total_rows * 100)

    overall = round(
        completeness * 0.25 +
        accuracy * 0.25 +
        validity * 0.20 +
        consistency * 0.15 +
        uniqueness * 0.15,
        2
    )
    return {
        "overall": overall,
        "completeness": round(completeness, 2),
        "accuracy": round(accuracy, 2),
        "validity": round(validity, 2),
        "consistency": round(consistency, 2),
        "uniqueness": round(uniqueness, 2),
    }


def compute_readiness_score(quality_score: float, invalid_pct: float, duplicate_pct: float) -> dict:
    score = quality_score - (invalid_pct * 0.5) - (duplicate_pct * 0.3)
    score = max(0, min(100, round(score, 2)))

    if score >= 85:
        label = "Ready for Production"
        color = "green"
        description = "Dataset meets quality thresholds. Safe to load into production systems."
    elif score >= 65:
        label = "Minor Cleanup Required"
        color = "yellow"
        description = "Small number of issues detected. Correct errors before production deployment."
    elif score >= 40:
        label = "Major Cleanup Required"
        color = "orange"
        description = "Significant data quality issues. Manual review and remediation recommended."
    else:
        label = "Not Ready"
        color = "red"
        description = "Dataset has critical quality failures. Do not load to production."

    return {"score": score, "label": label, "color": color, "description": description}
