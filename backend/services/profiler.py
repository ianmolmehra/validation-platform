"""Dataset profiling engine."""
from __future__ import annotations
import pandas as pd
import numpy as np
from typing import Any


def profile_dataframe(df: pd.DataFrame) -> dict:
    total_rows, total_cols = df.shape
    missing_total = int(df.isnull().sum().sum())
    duplicate_count = int(df.duplicated().sum())

    # Date range
    date_cols = [c for c in df.columns if "date" in c.lower()]
    date_range = None
    for dc in date_cols:
        try:
            parsed = pd.to_datetime(df[dc], errors="coerce", dayfirst=True)
            valid = parsed.dropna()
            if not valid.empty:
                date_range = {
                    "min": valid.min().strftime("%Y-%m-%d"),
                    "max": valid.max().strftime("%Y-%m-%d"),
                }
                break
        except Exception:
            pass

    # Country distribution
    country_col = next(
        (c for c in df.columns if "country" in c.lower()), None
    )
    unique_countries = 0
    country_dist: dict[str, int] = {}
    if country_col:
        vc = df[country_col].value_counts()
        unique_countries = int(vc.count())
        country_dist = {str(k): int(v) for k, v in vc.head(10).items()}

    # Payment distribution
    pm_col = next(
        (c for c in df.columns if "payment" in c.lower() and "mode" in c.lower()), None
    ) or next(
        (c for c in df.columns if "payment" in c.lower()), None
    )
    payment_dist: dict[str, int] = {}
    if pm_col:
        vc2 = df[pm_col].value_counts()
        payment_dist = {str(k): int(v) for k, v in vc2.items()}

    # Column-level profile
    columns_profile = []
    for col in df.columns:
        series = df[col]
        null_count = int(series.isnull().sum())
        unique_count = int(series.nunique())
        dtype = str(series.dtype)
        samples = [
            str(v) for v in series.dropna().head(5).tolist()
            if str(v) not in ("nan", "None", "NaT")
        ]
        columns_profile.append({
            "column": col,
            "data_type": dtype,
            "null_count": null_count,
            "null_pct": round(null_count / total_rows * 100, 2) if total_rows else 0,
            "unique_count": unique_count,
            "sample_values": samples,
        })

    completeness = round((1 - missing_total / max(total_rows * total_cols, 1)) * 100, 2)

    return {
        "total_rows": total_rows,
        "total_columns": total_cols,
        "missing_values": missing_total,
        "duplicate_count": duplicate_count,
        "unique_countries": unique_countries,
        "date_range": date_range,
        "payment_distribution": payment_dist,
        "country_distribution": country_dist,
        "completeness_pct": completeness,
        "columns": columns_profile,
    }
