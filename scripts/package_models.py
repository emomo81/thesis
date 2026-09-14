#!/usr/bin/env python3
"""Offline model selection and packaging. Never imported by the dashboard."""
from __future__ import annotations

import os
os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "2")

import hashlib
import json
import platform
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, balanced_accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from threadpoolctl import threadpool_limits

from dashboard.schema import FEATURE_SCOPES, MAPPINGS, TARGET_COL

SCOPE_IDS = ["enrollment", "semester1", "semester2"]


def feature_schema(frame):
    result = {}
    for col in frame:
        s = frame[col]
        categorical = col in MAPPINGS
        integer = categorical or col in {"Application order", "Age at enrollment"} or (
            col.startswith("Curricular units") and not col.endswith("(grade)")
        )
        spec = {
            "kind": "category" if categorical else "integer" if integer else "number",
            "default": int(s.mode().iloc[0]) if categorical else float(s.median()),
            "observed_min": float(s.min()), "observed_max": float(s.max()),
        }
        if categorical:
            spec["options"] = sorted(set(MAPPINGS[col]) | set(map(int, s.unique())))
        elif col in {"Previous qualification (grade)", "Admission grade"}:
            spec.update(min=0, max=200)
        elif col.endswith("(grade)"):
            spec.update(min=0, max=20)
        elif col == "Application order":
            spec.update(min=0, max=9)
        elif col == "Age at enrollment":
            spec.update(min=1, max=120)
        elif col.startswith("Curricular units"):
            spec.update(min=0)
        elif col == "Unemployment rate":
            spec.update(min=0, max=100)
        if integer:
            spec["default"] = int(round(spec["default"]))
        result[col] = spec
    return result


def candidates(features):
    cats = [c for c in features if c in MAPPINGS]
    nums = [c for c in features if c not in MAPPINGS]
    estimators = {
        "Logistic Regression": LogisticRegression(max_iter=3000, class_weight="balanced", random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=200, min_samples_leaf=2,
            class_weight="balanced_subsample", n_jobs=2, random_state=42),
        "Hist Gradient Boosting": HistGradientBoostingClassifier(random_state=42),
    }
    return {name: Pipeline([
        ("preprocessing", ColumnTransformer([
            ("categories", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cats),
            ("numbers", StandardScaler(), nums),
        ])), ("classifier", model),
    ]) for name, model in estimators.items()}


def main():
    path = ROOT / "data/students.csv"
    df = pd.read_csv(path)
    train, test = train_test_split(df, test_size=0.2, stratify=df[TARGET_COL], random_state=42)
    dest = ROOT / "artifacts"
    dest.mkdir(exist_ok=True)
    manifest = {
        "format_version": 1, "created_at": datetime.now(timezone.utc).isoformat(),
        "python_version": platform.python_version(),
        "versions": {"scikit-learn": sklearn.__version__, "numpy": np.__version__,
                     "pandas": pd.__version__, "joblib": joblib.__version__},
        "dataset": {"name": "UCI Predict Students’ Dropout and Academic Success (697)",
                    "doi": "10.24432/C5MC89", "license": "CC BY 4.0",
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "rows": len(df)},
        "evaluation": {"seed": 42, "training_rows": len(train), "test_rows": len(test),
            "selection": "3-fold stratified CV macro F1 on training partition only",
            "packaged_fit": "80% training partition; the 20% test partition is never fitted"},
        "models": {},
    }
    for scope_id, (label, features) in zip(SCOPE_IDS, FEATURE_SCOPES.items()):
        print(f"\n{label}", flush=True)
        pipes = candidates(features)
        comparison = {}
        cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
        for name, pipe in pipes.items():
            scores = cross_val_score(pipe, train[features], train[TARGET_COL], cv=cv, scoring="f1_macro", n_jobs=1)
            comparison[name] = {"cv_macro_f1": float(scores.mean()), "cv_std": float(scores.std())}
            print(f"  {name}: {scores.mean():.4f}", flush=True)
        winner = max(comparison, key=lambda name: comparison[name]["cv_macro_f1"])
        model = pipes[winner].fit(train[features], train[TARGET_COL])
        predicted = model.predict(test[features])
        classes = list(model.classes_)
        artifact = dest / f"{scope_id}.joblib"
        joblib.dump(model, artifact, compress=3)
        info = {
            "label": label, "estimator": winner, "file": artifact.name,
            "sha256": hashlib.sha256(artifact.read_bytes()).hexdigest(),
            "features": features, "classes": classes, "schema": feature_schema(train[features]),
            "comparison": comparison,
            "test_metrics": {"accuracy": accuracy_score(test[TARGET_COL], predicted),
                "balanced_accuracy": balanced_accuracy_score(test[TARGET_COL], predicted),
                "macro_f1": f1_score(test[TARGET_COL], predicted, average="macro"),
                "classification_report": classification_report(test[TARGET_COL], predicted, output_dict=True),
                "confusion_matrix": confusion_matrix(test[TARGET_COL], predicted, labels=classes).tolist()},
        }
        manifest["models"][scope_id] = info
        print(f"  Packaged {winner}; held-out accuracy {info['test_metrics']['accuracy']:.4f}", flush=True)
    (dest / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print("\nPackaged all models and input schemas in artifacts/", flush=True)


if __name__ == "__main__":
    with threadpool_limits(limits=2):
        main()
