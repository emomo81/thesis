#!/usr/bin/env python3
"""Prepare the UCI id-697 dataset for the dashboard.

Reads ``data/raw/data.csv`` (semicolon-separated, as distributed on the UCI
Machine Learning Repository), normalises column names and writes
``data/students.csv``. If the raw file is missing it is re-fetched with the
``ucimlrepo`` package (``fetch_ucirepo(id=697)``).

Usage:
    python scripts/prepare_data.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
RAW_PATH = REPO_ROOT / "data" / "raw" / "data.csv"
CLEAN_PATH = REPO_ROOT / "data" / "students.csv"

EXPECTED_ROWS = 4424
EXPECTED_COLS = 37  # 36 features + Target


def fetch_raw() -> pd.DataFrame:
    from ucimlrepo import fetch_ucirepo

    print("Raw file missing — fetching from UCI ML Repository (id=697) …")
    ds = fetch_ucirepo(id=697)
    return pd.concat([ds.data.features, ds.data.targets], axis=1)


def main() -> int:
    if RAW_PATH.exists():
        df = pd.read_csv(RAW_PATH, sep=";")
    else:
        df = fetch_raw()

    df.columns = [c.strip() for c in df.columns]
    df = df.rename(columns={"Nacionality": "Nationality"})

    expected = [
        "Marital status", "Application mode", "Application order", "Course",
        "Daytime/evening attendance", "Previous qualification",
        "Previous qualification (grade)", "Nationality",
        "Mother's qualification", "Father's qualification",
        "Mother's occupation", "Father's occupation", "Admission grade",
        "Displaced", "Educational special needs", "Debtor",
        "Tuition fees up to date", "Gender", "Scholarship holder",
        "Age at enrollment", "International",
        "Curricular units 1st sem (credited)", "Curricular units 1st sem (enrolled)",
        "Curricular units 1st sem (evaluations)", "Curricular units 1st sem (approved)",
        "Curricular units 1st sem (grade)", "Curricular units 1st sem (without evaluations)",
        "Curricular units 2nd sem (credited)", "Curricular units 2nd sem (enrolled)",
        "Curricular units 2nd sem (evaluations)", "Curricular units 2nd sem (approved)",
        "Curricular units 2nd sem (grade)", "Curricular units 2nd sem (without evaluations)",
        "Unemployment rate", "Inflation rate", "GDP", "Target",
    ]
    missing = [c for c in expected if c not in df.columns]
    if missing:
        print(f"ERROR: unexpected columns — missing: {missing}", file=sys.stderr)
        return 1

    if df.isna().any().any():
        print("ERROR: dataset contains missing values", file=sys.stderr)
        return 1

    CLEAN_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(CLEAN_PATH, index=False)

    print(f"rows={len(df)} cols={df.shape[1]} (expected {EXPECTED_ROWS}×{EXPECTED_COLS})")
    print(f"target counts: {df['Target'].value_counts().to_dict()}")
    print(f"wrote {CLEAN_PATH.relative_to(REPO_ROOT)}")
    return 0 if (len(df), df.shape[1]) == (EXPECTED_ROWS, EXPECTED_COLS) else 1


if __name__ == "__main__":
    raise SystemExit(main())
