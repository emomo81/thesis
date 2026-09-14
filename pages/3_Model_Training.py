"""Model Training & Evaluation page."""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from sklearn.metrics import classification_report, roc_curve
from sklearn.preprocessing import label_binarize

from dashboard.data import FEATURE_SCOPES, TARGET_COLORS, load_data
from dashboard.modeling import MODELS, train_and_evaluate

st.set_page_config(page_title="Model Training — Thesis Dashboard", page_icon="🤖", layout="wide")

df = load_data()


@st.cache_resource(show_spinner="Training models …")
def fit_models(features_key, target_mode, test_size, seed):
    feature_cols = FEATURE_SCOPES[features_key]
    return train_and_evaluate(df, feature_cols, target_mode, test_size, seed)


st.title("🤖 Model Training & Evaluation")
st.markdown(
    "Train, compare and inspect classifiers for the student-outcome task. "
    "Models are trained on an 80/20 stratified split and evaluated on the held-out split."
)

# ----------------------------------------------------------------- Sidebar
with st.sidebar:
    st.header("Experiment settings")
    target_mode = st.radio(
        "Target formulation",
        ["3-class (Dropout / Enrolled / Graduate)", "Binary (Dropout vs rest)"],
        index=0,
    )
    mode_key = "3-class" if target_mode.startswith("3-class") else "binary"

    features_key = st.select_slider(
        "Feature scope (how early can we predict?)",
        options=list(FEATURE_SCOPES),
        value=list(FEATURE_SCOPES)[0],
    )
    test_size = st.slider("Test split size", 0.1, 0.4, 0.2, 0.05)
    seed = st.number_input("Random seed", 0, 9999, 42)

results = fit_models(features_key, mode_key, test_size, seed)
classes = results["Logistic Regression"]["classes"]

st.caption(
    f"Features used: **{len(results['Logistic Regression']['features'])}** · "
    f"Training rows: **{len(df) - len(results['Logistic Regression']['y_test']):,}** · "
    f"Test rows: **{len(results['Logistic Regression']['y_test']):,}** · Target: **{mode_key}**"
)

# ----------------------------------------------------------------- Comparison
st.subheader("Model comparison (held-out split)")
comp = pd.DataFrame({name: r["metrics"] for name, r in results.items() if name in MODELS}).T
comp_fmt = comp.copy()
for c in comp.columns:
    comp_fmt[c] = comp[c].map(lambda v: "—" if pd.isna(v) else f"{v:.3f}")
st.dataframe(comp_fmt, width="stretch")

best_model = comp["Macro F1"].idxmax()
chosen = st.radio(
    "Inspect model", list(MODELS), index=list(MODELS).index(best_model),
    horizontal=True,
)
res = results[chosen]
y_test, y_pred, proba = res["y_test"], res["y_pred"], res["proba"]
cls = res["classes"]

t_col, i_col = st.columns([3, 2])

# ----------------------------------------------------------------- Confusion matrix
with t_col:
    st.markdown(f"#### Confusion matrix — {chosen}")
    cm = res["confusion_matrix"]
    fig = px.imshow(
        cm, x=cls, y=cls, text_auto=True, aspect="equal",
        color_continuous_scale="Blues", labels=dict(x="Predicted", y="Actual"),
    )
    fig.update_layout(height=380, margin=dict(t=10))
    st.plotly_chart(fig, width="stretch")

# ----------------------------------------------------------------- Report
with i_col:
    st.markdown("#### Classification report")
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    rep_df = pd.DataFrame(report).T.drop(columns="support")
    rep_df["support"] = pd.DataFrame(report).T["support"].astype(int)
    st.dataframe(rep_df.round(3), width="stretch")

# ----------------------------------------------------------------- ROC curves
st.markdown("#### ROC curves (one-vs-rest)")
fig = go.Figure()
fig.add_shape(type="line", x0=0, y0=0, x1=1, y1=1,
              line=dict(dash="dash", color="grey"))
for i, c in enumerate(cls):
    y_bin = (y_test == c).astype(int)
    fpr, tpr, _ = roc_curve(y_bin, proba[:, i])
    fig.add_trace(go.Scatter(
        x=fpr, y=tpr, name=f"{c} (AUC={np.trapezoid(tpr, fpr):.2f})",
        line=dict(color=TARGET_COLORS.get(c)),
    ))
fig.update_layout(
    height=400, xaxis_title="False positive rate", yaxis_title="True positive rate",
    legend=dict(x=0.55, y=0.05), margin=dict(t=10),
)
st.plotly_chart(fig, width="stretch")

# ----------------------------------------------------------------- Importance
st.markdown("#### What drives the predictions?")
perm = results["permutation_importance"].head(15).sort_values()
fig = px.bar(
    x=perm.values, y=perm.index, orientation="h",
    labels={"x": "Mean drop in macro F1 when shuffled", "y": ""},
)
fig.update_layout(height=430, margin=dict(t=10))
st.plotly_chart(fig, width="stretch")

if results.get("logreg_coefficients") is not None:
    with st.expander("Logistic regression — standardized coefficient magnitudes"):
        coefs = results["logreg_coefficients"].head(15).sort_values()
        fig = px.bar(x=coefs.values, y=coefs.index, orientation="h",
                     labels={"x": "|coefficient| × feature scale", "y": ""})
        fig.update_layout(height=430, margin=dict(t=10))
        st.plotly_chart(fig, width="stretch")

st.divider()
st.caption(
    "Permutation importance is computed on the held-out split for the Random Forest "
    "(5 shuffles per feature, scoring = macro F1). Semester-performance features leak "
    "progress information — restrict the feature scope to *Enrollment only* for a "
    "realistic early-warning scenario."
)
