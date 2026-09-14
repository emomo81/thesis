"""Shared utilities for the Student Dropout & Academic Success dashboard."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import streamlit as st

from dashboard.schema import MAPPINGS

# --------------------------------------------------------------------------- #
# Paths
# --------------------------------------------------------------------------- #
REPO_ROOT = Path(__file__).resolve().parents[1]
RAW_DATA_PATH = REPO_ROOT / "data" / "raw" / "data.csv"
CLEAN_DATA_PATH = REPO_ROOT / "data" / "students.csv"


def short(label: str, width: int = 34) -> str:
    """Truncate long category labels for chart axes."""
    return label if len(label) <= width else label[: width - 1] + "…"


def with_labels(df: pd.DataFrame, column: str) -> pd.Series:
    """Map an integer-coded column to readable labels (codes without an
    entry in the mapping fall back to the raw code)."""
    mapping = MAPPINGS.get(column)
    if mapping is None:
        return df[column]
    return df[column].map(mapping).fillna(df[column].astype(str))


# --------------------------------------------------------------------------- #
# Loading
# --------------------------------------------------------------------------- #
@st.cache_data
def load_data() -> pd.DataFrame:
    """Load the cleaned dataset (see scripts/prepare_data.py)."""
    if CLEAN_DATA_PATH.exists():
        df = pd.read_csv(CLEAN_DATA_PATH)
    elif RAW_DATA_PATH.exists():
        df = _clean_raw(pd.read_csv(RAW_DATA_PATH, sep=";"))
    else:  # pragma: no cover - network fallback
        df = _fetch_ucirepo()
    return df


def _clean_raw(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.strip() for c in df.columns]
    df = df.rename(columns={"Nacionality": "Nationality"})
    return df


def _fetch_ucirepo() -> pd.DataFrame:  # pragma: no cover
    from ucimlrepo import fetch_ucirepo

    ds = fetch_ucirepo(id=697)
    df = pd.concat([ds.data.features, ds.data.targets], axis=1)
    return df.rename(columns={"Nacionality": "Nationality"})
