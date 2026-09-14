"""Model training & evaluation for the thesis dashboard."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    cohen_kappa_score,
    confusion_matrix,
    f1_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from dashboard.schema import ALL_FEATURES, TARGET_COL

MODELS = {
    "Logistic Regression": "logreg",
    "Random Forest": "rf",
    "Hist Gradient Boosting": "hgb",
}


def make_xy(
    df: pd.DataFrame,
    feature_cols: list[str] | None = None,
    target_mode: str = "3-class",
) -> tuple[pd.DataFrame, pd.Series, list[str]]:
    """Build X/y. `target_mode` is '3-class' or 'binary' (Dropout vs rest)."""
    feature_cols = feature_cols or ALL_FEATURES
    X = df[feature_cols].copy()
    if target_mode == "binary":
        y = np.where(df[TARGET_COL] == "Dropout", "Dropout", "No dropout")
        y = pd.Series(y, index=df.index, name=TARGET_COL)
        classes = ["Dropout", "No dropout"]
    else:
        y = df[TARGET_COL].copy()
        classes = ["Dropout", "Enrolled", "Graduate"]
    return X, y, classes


def _make_pipelines(seed: int) -> dict[str, object]:
    return {
        "logreg": make_pipeline(
            StandardScaler(),
            LogisticRegression(max_iter=5000, C=1.0, class_weight="balanced"),
        ),
        "rf": RandomForestClassifier(
            n_estimators=300,
            min_samples_leaf=2,
            class_weight="balanced_subsample",
            n_jobs=-1,
            random_state=seed,
        ),
        "hgb": HistGradientBoostingClassifier(random_state=seed),
    }


def train_and_evaluate(
    df: pd.DataFrame,
    feature_cols: list[str],
    target_mode: str = "3-class",
    test_size: float = 0.2,
    seed: int = 42,
) -> dict:
    """Train all models and collect metrics, predictions and importances."""
    X, y, classes = make_xy(df, feature_cols, target_mode)
    strat = y if y.value_counts().min() >= 2 else None
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=test_size, random_state=seed, stratify=strat
    )

    results: dict[str, dict] = {}
    for display_name, key in MODELS.items():
        pipe = _make_pipelines(seed)[key]
        pipe.fit(X_tr, y_tr)
        y_pred = pipe.predict(X_te)
        proba = pipe.predict_proba(X_te) if hasattr(pipe, "predict_proba") else None
        try:
            auc = (
                roc_auc_score(y_te, proba, multi_class="ovr", average="macro")
                if proba is not None
                else np.nan
            )
        except ValueError:
            auc = np.nan
        results[display_name] = {
            "key": key,
            "model": pipe,
            "classes": classes,
            "features": list(X.columns),
            "y_test": y_te,
            "y_pred": pd.Series(y_pred, index=y_te.index),
            "proba": proba,
            "metrics": {
                "Accuracy": accuracy_score(y_te, y_pred),
                "Balanced accuracy": balanced_accuracy_score(y_te, y_pred),
                "Macro F1": f1_score(y_te, y_pred, average="macro"),
                "ROC AUC (OvR macro)": auc,
                "Cohen's kappa": cohen_kappa_score(y_te, y_pred),
            },
            "confusion_matrix": confusion_matrix(
                y_te, y_pred, labels=classes
            ),
        }

    # Permutation importance on the held-out split (multiclass → macro F1 drop)
    perm = permutation_importance(
        results["Random Forest"]["model"],
        X_te,
        y_te,
        scoring="f1_macro",
        n_repeats=5,
        random_state=seed,
        n_jobs=1,
    )
    importance = (
        pd.Series(perm.importances_mean, index=X.columns)
        .sort_values(ascending=False)
    )
    results["permutation_importance"] = importance

    # Standardised coefficients for the logistic regression (linear effect size)
    try:
        scaler = results["Logistic Regression"]["model"].steps[0][1]
        clf = results["Logistic Regression"]["model"].steps[-1][1]
        coefs = np.abs(clf.coef_).mean(axis=0) * np.abs(scaler.scale_)
        results["logreg_coefficients"] = (
            pd.Series(coefs, index=X.columns).sort_values(ascending=False)
        )
    except Exception:
        results["logreg_coefficients"] = None

    return results
