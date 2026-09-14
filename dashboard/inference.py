"""Inference-only API. Loads trusted bundled pipelines; never trains or reads data/.

Joblib uses pickle: never accept a user-uploaded model. The checksum detects
accidental corruption, not malicious replacement of both model and manifest.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
from importlib.metadata import version
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from threadpoolctl import threadpool_limits

ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"
MAX_ROWS = 10_000
MAX_BYTES = 10 * 1024 * 1024


class InputError(ValueError):
    """An actionable input error suitable for displaying in the dashboard."""


def load_manifest(directory: Path = ARTIFACTS) -> dict:
    try:
        manifest = json.loads((directory / "manifest.json").read_text())
        if manifest["format_version"] != 1 or not manifest["models"]:
            raise ValueError("Unsupported manifest")
        for package, expected in manifest["versions"].items():
            if version(package) != expected:
                raise ValueError(f"{package} must be {expected}; installed {version(package)}")
        return manifest
    except (OSError, ValueError, KeyError) as exc:
        raise RuntimeError(f"The packaged models are unavailable or incompatible. "
                           f"Restore artifacts/ and install requirements.lock. Details: {exc}") from exc


def load_model(scope: str, manifest: dict, directory: Path = ARTIFACTS):
    try:
        info = manifest["models"][scope]
        filename = info["file"]
        if Path(filename).name != filename:
            raise ValueError("Invalid artifact path")
        path = directory / filename
        if hashlib.sha256(path.read_bytes()).hexdigest() != info["sha256"]:
            raise ValueError("Model checksum mismatch")
        model = joblib.load(path)
        if list(model.classes_) != info["classes"] or list(model.feature_names_in_) != info["features"]:
            raise ValueError("Model and input schema do not match")
        return model
    except Exception as exc:
        raise RuntimeError("Could not load the packaged prediction model. Restore the original "
                           f"artifacts/ folder; no automatic training will occur. Details: {exc}") from exc


def normalize_columns(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    frame.columns = [str(c).strip().removeprefix("\ufeff") for c in frame.columns]
    frame = frame.rename(columns={"Nacionality": "Nationality"})
    if frame.columns.duplicated().any() or "" in frame.columns:
        raise InputError("CSV headers must be non-empty and unique (including after normalization).")
    return frame


def read_csv(content: bytes) -> pd.DataFrame:
    if len(content) > MAX_BYTES:
        raise InputError("CSV is too large. Upload at most 10 MB and 10,000 student rows.")
    try:
        text = content.decode("utf-8-sig")
        dialect = csv.Sniffer().sniff(text[:65536], delimiters=",;")
        # Inspect headers before pandas can silently rename duplicate columns.
        reader = csv.reader(io.StringIO(text), dialect, strict=True)
        header = next(reader)
        normalize_columns(pd.DataFrame(columns=header))
        rows = 0
        for record in reader:
            if not record:  # Like pandas, ignore genuinely blank lines.
                continue
            rows += 1
            if rows > MAX_ROWS:
                raise InputError("Upload at most 10,000 student rows at a time.")
            if len(record) != len(header):
                raise InputError(f"Student row {rows} has {len(record)} fields; expected {len(header)}. "
                                 "Check delimiters and quoting.")
        frame = pd.read_csv(io.StringIO(text), sep=dialect.delimiter, nrows=MAX_ROWS + 1)
    except InputError:
        raise
    except (UnicodeError, csv.Error, StopIteration, pd.errors.ParserError, pd.errors.EmptyDataError, ValueError) as exc:
        raise InputError("Could not read the CSV. Use UTF-8, a header row, and comma or semicolon separators.") from exc
    if frame.empty:
        raise InputError("The CSV contains no student rows.")
    if len(frame) > MAX_ROWS:
        raise InputError("Upload at most 10,000 student rows at a time.")
    return normalize_columns(frame)


def template(info: dict) -> pd.DataFrame:
    return pd.DataFrame([{col: info["schema"][col]["default"] for col in info["features"]}])


def validate_inputs(frame: pd.DataFrame, info: dict) -> tuple[pd.DataFrame, list[str]]:
    frame = normalize_columns(frame)
    if frame.empty or len(frame) > MAX_ROWS:
        raise InputError("Provide between 1 and 10,000 student rows.")
    missing = [col for col in info["features"] if col not in frame]
    if missing:
        raise InputError("Missing required columns: " + ", ".join(missing) +
                         ". Use the template for the selected prediction stage.")
    result = pd.DataFrame(index=frame.index)
    errors, warnings = [], []
    for col in info["features"]:
        spec = info["schema"][col]
        values = pd.to_numeric(frame[col], errors="coerce")
        bad = ~np.isfinite(values)
        if spec["kind"] == "category":
            bad |= ~values.isin(spec["options"])
            reason = "use a supported numeric category code"
        else:
            if spec["kind"] == "integer":
                bad |= values.mod(1).ne(0)
            if "min" in spec:
                bad |= values.lt(spec["min"])
            if "max" in spec:
                bad |= values.gt(spec["max"])
            reason = "use a finite number within the allowed range"
            if spec["kind"] == "integer":
                reason += " (whole numbers only)"
            outside = values.lt(spec["observed_min"]) | values.gt(spec["observed_max"])
            if outside.any() and not bad.any():
                warnings.append(f"{col}: {int(outside.sum())} value(s) outside the training range "
                                f"{spec['observed_min']:g}–{spec['observed_max']:g}; predictions may be less reliable.")
        if bad.any():
            rows = ", ".join(str(i + 1) for i in np.flatnonzero(bad.to_numpy())[:5])
            errors.append(f"{col} — {reason}; missing values are not allowed (student row(s) {rows}).")
        result[col] = values
    for semester in ("1st", "2nd"):
        prefix = f"Curricular units {semester} sem"
        enrolled = f"{prefix} (enrolled)"
        if enrolled not in result:
            continue
        for suffix in ("approved", "without evaluations"):
            col = f"{prefix} ({suffix})"
            if (result[col] > result[enrolled]).any():
                if suffix == "approved":
                    errors.append(f"{col} cannot exceed {enrolled}.")
                else:
                    # Three original UCI records have this inconsistency. Flag
                    # it for review rather than imposing a false hard domain rule.
                    warnings.append(f"{col} exceeds {enrolled} in some rows. Verify the source records.")
    if errors:
        raise InputError("\n".join(errors[:12]) + ("\nMore errors omitted; check all required fields." if len(errors) > 12 else ""))
    return result[info["features"]], warnings


def predict(frame: pd.DataFrame, model, info: dict) -> tuple[pd.DataFrame, list[str]]:
    x, warnings = validate_inputs(frame, info)
    with threadpool_limits(limits=2):
        probabilities = model.predict_proba(x)
    if probabilities.shape != (len(x), len(info["classes"])) or not np.isfinite(probabilities).all():
        raise RuntimeError("The model returned invalid probabilities.")
    output = normalize_columns(frame)
    output["Predicted outcome"] = np.asarray(info["classes"])[probabilities.argmax(axis=1)]
    for i, label in enumerate(info["classes"]):
        output[f"P({label})"] = probabilities[:, i]
    return output, warnings


def export_csv(frame: pd.DataFrame) -> bytes:
    """Prevent formula execution when uploaded text/headers are opened in Excel."""
    def safe(value):
        if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@")):
            return "'" + value
        return value
    result = frame.map(safe)
    result.columns = [safe(str(col)) for col in result.columns]
    return result.to_csv(index=False).encode("utf-8-sig")
