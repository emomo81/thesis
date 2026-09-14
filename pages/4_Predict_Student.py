"""Predict Student page — single profile scoring & batch prediction."""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard.data import (
    ALL_FEATURES,
    CATEGORICAL_FEATURES,
    CONTINUOUS_FEATURES,
    FEATURE_GROUPS,
    FEATURE_SCOPES,
    MAPPINGS,
    TARGET_COLORS,
    with_labels,
    load_data,
)
from dashboard.modeling import train_and_evaluate

st.set_page_config(page_title="Predict Student — Thesis Dashboard", page_icon="🔮", layout="wide")

df = load_data()


@st.cache_resource(show_spinner="Fitting prediction model …")
def fit_model(features_key, target_mode, seed):
    res = train_and_evaluate(df, FEATURE_SCOPES[features_key], target_mode, 0.2, seed)
    entry = res["Hist Gradient Boosting"]
    return entry["model"], entry["classes"]


st.title("🔮 Predict a Student's Outcome")
st.markdown(
    "Set a student profile below and score it with a trained model "
    "(Hist Gradient Boosting on a fresh 80/20 split)."
)

with st.sidebar:
    st.header("Prediction model")
    features_key = st.select_slider(
        "Feature scope",
        options=list(FEATURE_SCOPES),
        value="All features (incl. 2nd semester)",
    )
    target_mode = st.radio(
        "Target formulation",
        ["3-class (Dropout / Enrolled / Graduate)", "Binary (Dropout vs rest)"],
        index=0,
    )
    mode_key = "3-class" if target_mode.startswith("3-class") else "binary"
    seed = st.number_input("Random seed", 0, 9999, 42, key="pred_seed")

model_pipe, classes = fit_model(features_key, mode_key, seed)
features = FEATURE_SCOPES[features_key]

tab_single, tab_batch = st.tabs(["👤 Single student", "📁 Batch (CSV)"])

# ================================================================= Single
with tab_single:
    st.markdown("Defaults reflect the dataset medians/modes. Adjust the profile and press **Predict**.")

    defaults = {}
    inputs: dict[str, object] = {}
    top = st.empty()
    with top.form("student_form"):
        for group, cols in FEATURE_GROUPS.items():
            cols = [c for c in cols if c in features]
            if not cols:
                continue
            st.markdown(f"**{group}**")
            ncols = st.columns(min(3, len(cols)))
            for i, col in enumerate(cols):
                c = ncols[i % len(ncols)]
                if col in CATEGORICAL_FEATURES:
                    options = sorted(df[col].unique())
                    mapping = MAPPINGS[col]
                    idx = options.index(df[col].mode()[0])
                    val = c.selectbox(
                        col, options, index=idx,
                        format_func=lambda v, m=mapping: f"{v} — {m.get(v, v)}",
                    )
                    inputs[col] = int(val)
                elif col in {"Displaced", "Educational special needs", "Debtor",
                             "Tuition fees up to date", "Scholarship holder",
                             "International", "Gender"}:
                    if col == "Gender":
                        options = ["Female", "Male"]
                        default = "Male" if int(df[col].mode()[0]) == 1 else "Female"
                        inputs[col] = int(c.select_slider(col, options=options, value=default) == "Male")
                    else:
                        default = "Yes" if int(df[col].mode()[0]) == 1 else "No"
                        inputs[col] = int(c.select_slider(col, options=["No", "Yes"], value=default) == "Yes")
                else:  # numeric
                    lo = float(np.floor(df[col].min()))
                    hi = float(np.ceil(df[col].max()))
                    step = 0.1 if hi - lo < 30 else 1.0
                    med = float(df[col].median())
                    inputs[col] = c.number_input(
                        col, min_value=lo, max_value=hi, value=med, step=step,
                    )
            st.divider()

        submitted = st.form_submit_button("🔮 Predict outcome", type="primary", width="stretch")

    if submitted:
        x = pd.DataFrame([inputs])[features]
        proba = model_pipe.predict_proba(x)[0]
        pred = classes[int(np.argmax(proba))]

        color = TARGET_COLORS.get(pred, "#457B9D")
        risk = proba[classes.index("Dropout")] if "Dropout" in classes else 0.0
        if "Dropout" in classes:
            badge = ("🔴 HIGH dropout risk" if risk >= 0.5 else
                     "🟠 Moderate dropout risk" if risk >= 0.25 else
                     "🟢 Low dropout risk")
        else:
            badge = "✅ No-dropout" if pred == "No dropout" else "🔴 Dropout"

        st.markdown(
            f"<div style='padding:1rem 1.2rem;border-radius:0.6rem;"
            f"background:{color}22;border:1px solid {color}66;'>"
            f"<span style='font-size:1.35rem;font-weight:700;color:{color};'>"
            f"Predicted outcome: {pred}</span><br>"
            f"<span>{badge} · dropout probability {risk:.0%}</span></div>",
            unsafe_allow_html=True,
        )

        fig = go.Figure(
            go.Bar(
                x=proba, y=classes, orientation="h",
                marker_color=[TARGET_COLORS.get(c, "#457B9D") for c in classes],
                text=[f"{p:.1%}" for p in proba], textposition="outside",
            )
        )
        fig.update_layout(
            height=230, xaxis_title="Predicted probability",
            xaxis_range=[0, 1.15], margin=dict(t=10, b=0),
        )
        st.plotly_chart(fig, width="stretch")

        with st.expander("Profile used for prediction"):
            shown = x.T.rename(columns={0: "Value"})
            shown.index.name = "Feature"
            st.dataframe(shown, width="stretch")

# ================================================================= Batch
with tab_batch:
    st.markdown(
        "Upload a CSV with the same columns as the dataset (semicolon or comma "
        "separated). Missing feature columns are filled with dataset medians/modes; "
        "an extra `Target` column, if present, is ignored for scoring."
    )
    sample = pd.DataFrame([{c: (df[c].mode()[0] if c in MAPPINGS else float(df[c].median()))
                            for c in ALL_FEATURES}]).head(1)
    st.download_button(
        "⬇️ Download a one-row CSV template",
        sample.to_csv(index=False).encode("utf-8"),
        file_name="students_template.csv", mime="text/csv",
    )

    up = st.file_uploader("Upload student records", type=["csv"])
    if up is not None:
        try:
            sep = ";" if up.name.lower().endswith(".csv") and b";" in up.getvalue()[:4096] else ","
            batch = pd.read_csv(up, sep=sep)
        except Exception as e:  # noqa: BLE001
            st.error(f"Could not read the file: {e}")
            st.stop()

        X = batch.reindex(columns=features).copy()
        n_missing = X.isna().all().sum()
        fill = {}
        for col in features:
            if col in MAPPINGS or col in {"Displaced", "Educational special needs",
                                          "Debtor", "Tuition fees up to date",
                                          "Scholarship holder", "International", "Gender"}:
                fill[col] = df[col].mode()[0]
            else:
                fill[col] = float(df[col].median())
        X = X.fillna(fill)

        probas = model_pipe.predict_proba(X)
        preds = [classes[i] for i in probas.argmax(axis=1)]
        out = batch.copy()
        out["Predicted outcome"] = preds
        for i, cls_ in enumerate(classes):
            out[f"P({cls_})"] = probas[:, i].round(3)

        c1, c2, c3 = st.columns(3)
        c1.metric("Rows scored", len(out))
        drop_share = (out["Predicted outcome"] == "Dropout").mean() if "Dropout" in classes else 0.0
        c2.metric("Predicted dropout", f"{drop_share:.0%}")
        c3.metric("Columns auto-filled", int(n_missing))

        st.dataframe(out, width="stretch", height=380)
        st.download_button(
            "⬇️ Download scored records (CSV)",
            out.to_csv(index=False).encode("utf-8"),
            file_name="students_scored.csv", mime="text/csv", type="primary",
        )
