import hashlib
import io
import json
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pandas as pd
import pytest
from sklearn.linear_model import LogisticRegression

from dashboard.inference import (
    ARTIFACTS, InputError, export_csv, load_manifest, load_model,
    predict, read_csv, template, validate_inputs,
)


@pytest.fixture(scope="module")
def manifest():
    return load_manifest()


@pytest.mark.parametrize("scope", ["enrollment", "semester1", "semester2"])
def test_packaged_prediction_no_fitting(scope, manifest):
    info = manifest["models"][scope]
    with patch.object(LogisticRegression, "fit", side_effect=AssertionError("Inference must not fit")):
        model = load_model(scope, manifest)
        x = template(info)
        first, _ = predict(x, model, info)
        second, _ = predict(x[info["features"][::-1]], load_model(scope, manifest), info)
    pcols = [f"P({c})" for c in info["classes"]]
    np.testing.assert_allclose(first[pcols], second[pcols])
    assert np.allclose(first[pcols].sum(axis=1), 1)
    assert first["Predicted outcome"].iloc[0] in info["classes"]
    assert len(first) == 1


@pytest.mark.parametrize("scope", ["enrollment", "semester1", "semester2"])
def test_real_data_and_test_metrics(scope, manifest):
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, f1_score
    df = pd.read_csv(Path(__file__).resolve().parents[1] / "data/students.csv")
    _, test = train_test_split(df, test_size=0.2, stratify=df.Target, random_state=42)
    info = manifest["models"][scope]
    out, _ = predict(test, load_model(scope, manifest), info)
    assert accuracy_score(test.Target, out["Predicted outcome"]) == info["test_metrics"]["accuracy"]
    assert f1_score(test.Target, out["Predicted outcome"], average="macro") == info["test_metrics"]["macro_f1"]


@pytest.mark.parametrize("separator", [",", ";"])
def test_csv_roundtrip(separator, manifest):
    info = manifest["models"]["enrollment"]
    x = template(info).rename(columns={"Nationality": "Nacionality"})
    x["reference"] = 'quoted, identifier; with separators'
    parsed = read_csv(x.to_csv(index=False, sep=separator).encode("utf-8-sig"))
    assert "Nationality" in parsed
    assert parsed.reference.iloc[0] == x.reference.iloc[0]
    validate_inputs(parsed, info)


@pytest.mark.parametrize("payload", [b"", b"one,two\n", b"one,one\n1,2\n", b"one, one\n1,2\n", b"\xff\xfe", b"a,b\n1,2,3\n4,5\n"])
def test_bad_csv(payload):
    with pytest.raises(InputError):
        read_csv(payload)


@pytest.mark.parametrize("col,value", [
    ("Gender", 3), ("Gender", 0.5), ("Age at enrollment", -1),
    ("Age at enrollment", 20.5), ("Admission grade", 201),
    ("Admission grade", float("inf")), ("Admission grade", "nope"),
    ("Admission grade", np.nan), ("Age at enrollment", ""),
])
def test_invalid_values(col, value, manifest):
    info = manifest["models"]["enrollment"]
    x = template(info).astype(object)
    x.loc[0, col] = value
    with pytest.raises(InputError, match=col):
        validate_inputs(x, info)


def test_missing_and_extra_columns(manifest):
    info = manifest["models"]["enrollment"]
    x = template(info)
    with pytest.raises(InputError, match="Missing required columns"):
        validate_inputs(x.drop(columns="Course"), info)
    model = load_model("enrollment", manifest)
    baseline, _ = predict(x, model, info)
    x["Target"] = "Anything, ignored"
    x["reference"] = "student-1"
    changed, _ = predict(x, model, info)
    assert changed["P(Dropout)"].iloc[0] == baseline["P(Dropout)"].iloc[0]
    assert changed.reference.iloc[0] == "student-1"


def test_all_or_nothing_and_range_warning(manifest):
    info = manifest["models"]["enrollment"]
    x = pd.concat([template(info)] * 2, ignore_index=True)
    x.loc[1, "Age at enrollment"] = -1
    with pytest.raises(InputError, match=r"student row\(s\) 2"):
        validate_inputs(x, info)
    x.loc[1, "Age at enrollment"] = 100
    _, warnings = validate_inputs(x, info)
    assert any("outside the training range" in w for w in warnings)


def test_impossible_semester_counts(manifest):
    info = manifest["models"]["semester2"]
    x = template(info)
    x.loc[0, "Curricular units 2nd sem (approved)"] = 999
    with pytest.raises(InputError, match="cannot exceed"):
        validate_inputs(x, info)


def test_limits(manifest):
    with pytest.raises(InputError, match="too large"):
        read_csv(b"a" * (10 * 1024 * 1024 + 1))
    with pytest.raises(InputError, match="10,000"):
        read_csv(b"a,b\n" + b"1,2\n" * 10001)
    with pytest.raises(InputError):
        validate_inputs(pd.DataFrame(), manifest["models"]["enrollment"])


def test_corrupt_and_missing_artifacts(tmp_path, manifest):
    with pytest.raises(RuntimeError, match="unavailable"):
        load_manifest(tmp_path)
    with pytest.raises(RuntimeError, match="no automatic training"):
        load_model("enrollment", manifest, tmp_path)
    info = manifest["models"]["enrollment"]
    (tmp_path / info["file"]).write_bytes(b"corrupt model")
    with pytest.raises(RuntimeError, match="checksum"):
        load_model("enrollment", manifest, tmp_path)


def test_incompatible_version(tmp_path, manifest):
    bad = json.loads(json.dumps(manifest))
    bad["versions"]["scikit-learn"] = "0.0.0"
    (tmp_path / "manifest.json").write_text(json.dumps(bad))
    with pytest.raises(RuntimeError, match="must be 0.0.0"):
        load_manifest(tmp_path)


def test_safe_export():
    out = pd.DataFrame({"reference": ["=1+1", " @SUM(1)", "ordinary"], "value": [-2, 3, 4]})
    parsed = pd.read_csv(io.BytesIO(export_csv(out)))
    assert parsed.reference.tolist() == ["'=1+1", "' @SUM(1)", "ordinary"]
    assert parsed.value.tolist() == [-2, 3, 4]


def test_known_uci_count_inconsistency_warns(manifest):
    info = manifest["models"]["semester2"]
    x = template(info)
    x.loc[0, "Curricular units 2nd sem (without evaluations)"] = x.loc[0, "Curricular units 2nd sem (enrolled)"] + 1
    _, warnings = validate_inputs(x, info)
    assert any("Verify the source records" in warning for warning in warnings)
