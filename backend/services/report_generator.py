"""Report generation: CSV files, PDF summary, chunking, country segmentation."""
from __future__ import annotations
import os
import io
import zipfile
from datetime import datetime
import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT


def generate_validated_csv(valid_df: pd.DataFrame) -> bytes:
    # UTF-8 BOM so Excel opens it correctly without encoding issues
    return valid_df.to_csv(index=False).encode("utf-8-sig")


def generate_error_csv(errors: list[dict]) -> bytes:
    if not errors:
        df = pd.DataFrame(columns=["row_number", "order_id", "error_type", "error_field", "error_message"])
    else:
        df = pd.DataFrame(errors)
    return df.to_csv(index=False).encode()


def generate_master_csv(all_rows: list[dict]) -> bytes:
    df = pd.DataFrame(all_rows)
    return df.to_csv(index=False).encode()


def generate_chunks(valid_df: pd.DataFrame, chunk_size: int = 50000) -> list[tuple[str, bytes]]:
    chunks = []
    for i, start in enumerate(range(0, len(valid_df), chunk_size), 1):
        chunk = valid_df.iloc[start:start + chunk_size]
        chunks.append((f"chunk_{i}.csv", chunk.to_csv(index=False).encode()))
    return chunks


def generate_country_files(valid_df: pd.DataFrame, country_col: str = "country") -> list[tuple[str, bytes]]:
    files = []
    if country_col not in valid_df.columns:
        return files
    for country in valid_df[country_col].dropna().unique():
        subset = valid_df[valid_df[country_col] == country]
        safe_name = str(country).replace(" ", "_").replace("/", "-")
        files.append((f"{safe_name}.csv", subset.to_csv(index=False).encode()))
    return files


def generate_summary_pdf(
    file_name: str,
    profile: dict,
    quality_score: dict,
    readiness: dict,
    insights: list[dict],
    analytics: dict,
    error_summary: dict,
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            topMargin=1.5*cm, bottomMargin=1.5*cm,
                            leftMargin=2*cm, rightMargin=2*cm)

    styles = getSampleStyleSheet()
    BLUE = colors.HexColor("#1d4ed8")
    LIGHT_BLUE = colors.HexColor("#eff6ff")
    GREEN = colors.HexColor("#16a34a")
    RED = colors.HexColor("#dc2626")
    ORANGE = colors.HexColor("#ea580c")
    GRAY = colors.HexColor("#6b7280")

    h1 = ParagraphStyle("h1", parent=styles["Heading1"], textColor=BLUE,
                         fontSize=20, spaceAfter=6, alignment=TA_CENTER)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=BLUE,
                         fontSize=14, spaceAfter=4, spaceBefore=12)
    body = ParagraphStyle("body", parent=styles["Normal"], fontSize=10, spaceAfter=4)
    sub = ParagraphStyle("sub", parent=styles["Normal"], fontSize=9, textColor=GRAY)

    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(Paragraph("Validation Platform", h1))
    story.append(Paragraph("Data Quality &amp; Validation Summary Report",
                            ParagraphStyle("sub2", parent=styles["Normal"], alignment=TA_CENTER, textColor=GRAY, fontSize=11)))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(f"File: {file_name} &nbsp;|&nbsp; Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", sub))
    story.append(HRFlowable(width="100%", thickness=2, color=BLUE))
    story.append(Spacer(1, 0.4*cm))

    # ── Dataset Statistics ────────────────────────────────────────────────────
    story.append(Paragraph("1. Dataset Statistics", h2))
    stats_data = [
        ["Metric", "Value"],
        ["Total Rows", f"{profile.get('total_rows', 0):,}"],
        ["Total Columns", str(profile.get('total_columns', 0))],
        ["Missing Values", f"{profile.get('missing_values', 0):,}"],
        ["Duplicate Records", f"{profile.get('duplicate_count', 0):,}"],
        ["Unique Countries", str(profile.get('unique_countries', 0))],
        ["Completeness", f"{profile.get('completeness_pct', 0):.1f}%"],
    ]
    if profile.get("date_range"):
        dr = profile["date_range"]
        stats_data.append(["Date Range", f"{dr['min']} → {dr['max']}"])
    t = Table(stats_data, colWidths=[9*cm, 7*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_BLUE, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.5*cm))

    # ── Quality Score ─────────────────────────────────────────────────────────
    story.append(Paragraph("2. Data Quality Score", h2))
    qs = quality_score
    q_data = [
        ["Dimension", "Score"],
        ["Overall Quality", f"{qs.get('overall', 0):.1f} / 100"],
        ["Completeness", f"{qs.get('completeness', 0):.1f}%"],
        ["Accuracy", f"{qs.get('accuracy', 0):.1f}%"],
        ["Validity", f"{qs.get('validity', 0):.1f}%"],
        ["Consistency", f"{qs.get('consistency', 0):.1f}%"],
        ["Uniqueness", f"{qs.get('uniqueness', 0):.1f}%"],
    ]
    t2 = Table(q_data, colWidths=[9*cm, 7*cm])
    t2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_BLUE, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t2)
    story.append(Spacer(1, 0.5*cm))

    # ── Readiness ─────────────────────────────────────────────────────────────
    story.append(Paragraph("3. Client Readiness Assessment", h2))
    r_color = {"green": GREEN, "yellow": ORANGE, "orange": ORANGE, "red": RED}.get(
        readiness.get("color", "red"), RED)
    r_data = [
        ["Assessment", "Value"],
        ["Readiness Score", f"{readiness.get('score', 0):.1f} / 100"],
        ["Status", readiness.get("label", "—")],
        ["Recommendation", readiness.get("description", "—")],
    ]
    t3 = Table(r_data, colWidths=[5*cm, 11*cm])
    t3.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_BLUE, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("TEXTCOLOR", (1, 2), (1, 2), r_color),
        ("FONTNAME", (1, 2), (1, 2), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("WORDWRAP", (1, 3), (1, 3), True),
    ]))
    story.append(t3)
    story.append(Spacer(1, 0.5*cm))

    # ── Insights ──────────────────────────────────────────────────────────────
    if insights:
        story.append(Paragraph("4. AI-Powered Insights &amp; Recommendations", h2))
        for ins in insights:
            story.append(Paragraph(
                f"<b>{ins.get('icon','')} {ins.get('title','')}</b> — {ins.get('message','')}",
                body))

    # ── Error analysis ────────────────────────────────────────────────────────
    if error_summary:
        story.append(Spacer(1, 0.4*cm))
        story.append(Paragraph("5. Error Analysis", h2))
        err_data = [["Error Type", "Count"]] + [
            [k, str(v)] for k, v in sorted(error_summary.items(), key=lambda x: -x[1])[:15]
        ]
        t4 = Table(err_data, colWidths=[12*cm, 4*cm])
        t4.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BLUE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_BLUE, colors.white]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ("ALIGN", (1, 0), (1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t4)

    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=GRAY))
    story.append(Paragraph(
        "Generated by Validation Platform — Enterprise Data Onboarding &amp; Processing",
        ParagraphStyle("footer", parent=styles["Normal"], fontSize=8, textColor=GRAY, alignment=TA_CENTER)))

    doc.build(story)
    return buf.getvalue()


def build_zip(files: list[tuple[str, bytes]]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in files:
            zf.writestr(name, data)
    return buf.getvalue()
