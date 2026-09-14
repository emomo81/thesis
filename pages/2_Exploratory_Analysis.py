"""Exploratory Analysis page."""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from dashboard.data import (
    BINARY_FEATURES,
    CATEGORICAL_FEATURES,
    FEATURE_GROUPS,
    MAPPINGS,
    TARGET_COLORS,
    TARGET_ORDER,
    short,
    with_labels,
    load_data,
)

st.set_page_config(page_title="Exploratory Analysis — Thesis Dashboard", page_icon="📊", layout="wide")

df = load_data()
OUTCOME = "Target"

st.title("📊 Exploratory Analysis")
st.markdown(
    "Who drops out? Compare outcomes across demographics, socioeconomic status, "
    "academic path and first-year performance."
)

# ----------------------------------------------------------------- 1. Outcome
st.subheader("1 · Outcome distribution")
t1, t2 = st.columns(2)
with t1:
    counts = df[OUTCOME].value_counts().reindex(TARGET_ORDER)
    fig = px.bar(
        x=counts.index, y=counts.values,
        color=counts.index, color_discrete_map=TARGET_COLORS,
        labels={"x": "Outcome", "y": "Students"}, text=counts.values,
    )
    fig.update_layout(showlegend=False, height=320, margin=dict(t=20, b=0))
    st.plotly_chart(fig, width="stretch")
with t2:
    rate = df.groupby(OUTCOME)["Admission grade"].median().reindex(TARGET_ORDER)
    rows = []
    for t in TARGET_ORDER:
        sub = df[df[OUTCOME] == t]
        rows.append({
            "Outcome": t, "Students": len(sub), "Share": f"{len(sub)/len(df):.1%}",
            "Median admission grade": f"{sub['Admission grade'].median():.1f}",
            "Median age": f"{sub['Age at enrollment'].median():.0f}",
            "% with scholarship": f"{sub['Scholarship holder'].mean():.0%}",
            "% fees up to date": f"{sub['Tuition fees up to date'].mean():.0%}",
        })
    st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch")

st.divider()

# ----------------------------------------------------------------- 2. Grouped outcomes
st.subheader("2 · Outcomes across demographic & socioeconomic groups")
group_choice = st.selectbox(
    "Group students by",
    ["Course", "Marital status", "Gender", "Daytime/evening attendance",
     "Displaced", "Scholarship holder", "Debtor", "Tuition fees up to date",
     "Educational special needs", "International", "Nationality",
     "Application mode", "Mother's qualification", "Father's occupation"],
    index=0,
)
use_short = st.checkbox("Only show groups with ≥ 30 students", value=True)

lab = with_labels(df, group_choice)
ct = (
    pd.crosstab(lab, df[OUTCOME], normalize="index")[TARGET_ORDER] * 100
)
sizes = lab.value_counts()
if use_short:
    keep = sizes[sizes >= 30].index
    ct = ct.loc[ct.index.isin(keep)]
ct = ct.sort_values("Dropout", ascending=False)
ct.index = [short(str(i)) for i in ct.index]
ct.index.name = group_choice

fig = px.bar(
    ct.reset_index().melt(id_vars=group_choice, var_name="Outcome", value_name="% of group"),
    x="% of group", y=group_choice, color="Outcome",
    color_discrete_map=TARGET_COLORS, orientation="h",
    category_orders={"Outcome": TARGET_ORDER},
)
fig.update_layout(height=460, legend_title_text=None, margin=dict(t=10, b=0),
                  yaxis=dict(automargin=True))
fig.update_traces(texttemplate="%{x:.0f}%", textposition="inside")
st.plotly_chart(fig, width="stretch")
st.caption(
    "Percentages are computed within each group (rows). Groups with fewer than 30 "
    "students can be hidden with the checkbox to avoid noisy estimates."
)

st.divider()

# ----------------------------------------------------------------- 3. Age & grades
st.subheader("3 · Age and academic performance")
v1, v2 = st.columns(2)
with v1:
    fig = px.histogram(
        df, x="Age at enrollment", color=OUTCOME, nbins=40, barmode="overlay",
        color_discrete_map=TARGET_COLORS, category_orders={OUTCOME: TARGET_ORDER},
    )
    fig.update_traces(opacity=0.65)
    fig.update_layout(height=380, margin=dict(t=10), legend_title_text=None)
    fig.update_xaxes(title="Age at enrollment")
    st.plotly_chart(fig, width="stretch")
with v2:
    long = df.melt(
        id_vars=[OUTCOME],
        value_vars=["Curricular units 1st sem (grade)", "Curricular units 2nd sem (grade)"],
        var_name="Semester", value_name="Average grade (0–20)",
    )
    long["Semester"] = long["Semester"].str.replace("Curricular units ", "").str.replace(" (grade)", "")
    fig = px.box(
        long, x="Semester", y="Average grade (0–20)", color=OUTCOME,
        color_discrete_map=TARGET_COLORS, category_orders={"Semester": ["1st sem", "2nd sem"], OUTCOME: TARGET_ORDER},
    )
    fig.update_layout(height=380, margin=dict(t=10), legend_title_text=None)
    st.plotly_chart(fig, width="stretch")

c1, c2 = st.columns(2)
with c1:
    fig = px.scatter(
        df.sample(min(1200, len(df)), random_state=0),
        x="Curricular units 1st sem (approved)",
        y="Curricular units 2nd sem (approved)",
        color=OUTCOME, color_discrete_map=TARGET_COLORS,
        category_orders={OUTCOME: TARGET_ORDER}, opacity=0.55, hover_data=["Age at enrollment"],
    )
    fig.update_layout(height=380, margin=dict(t=10), legend_title_text=None)
    fig.update_xaxes(title="Units approved — 1st sem")
    fig.update_yaxes(title="Units approved — 2nd sem")
    st.plotly_chart(fig, width="stretch")
with c2:
    fig = px.box(
        df, x=OUTCOME, y="Admission grade", color=OUTCOME,
        color_discrete_map=TARGET_COLORS, category_orders={OUTCOME: TARGET_ORDER},
    )
    fig.update_layout(height=380, margin=dict(t=10), showlegend=False)
    st.plotly_chart(fig, width="stretch")

st.divider()

# ----------------------------------------------------------------- 4. Macro
st.subheader("4 · Macroeconomic context (cohort year)")
m1, m2, m3 = st.columns(3)
for col, holder, title in [
    ("Unemployment rate", m1, "Unemployment rate (%)"),
    ("Inflation rate", m2, "Inflation rate (%)"),
    ("GDP", m3, "GDP growth (%)"),
]:
    with holder:
        fig = px.box(
            df, x=OUTCOME, y=col, color=OUTCOME,
            color_discrete_map=TARGET_COLORS, category_orders={OUTCOME: TARGET_ORDER},
        )
        fig.update_layout(height=300, margin=dict(t=20, b=0), showlegend=False,
                          title=dict(text=title, font=dict(size=13)))
        st.plotly_chart(fig, width="stretch")
st.caption("Macroeconomic indicators are repeated per student from the enrolment-year series (PORDATA).")

st.divider()

# ----------------------------------------------------------------- 5. Correlations
st.subheader("5 · Correlation heatmap")
encode_target = df[OUTCOME].map({"Dropout": 0, "Enrolled": 1, "Graduate": 2}).rename("Outcome (0=Drop,1=Enr,2=Grad)")
num = pd.concat([df.select_dtypes("number"), encode_target], axis=1)
corr = num.corr()

fig = go.Figure(
    go.Heatmap(
        z=corr.values, x=corr.columns, y=corr.columns,
        zmin=-1, zmax=1, colorscale="RdBu", reversescale=True, colorbar=dict(title="r"),
    )
)
fig.update_layout(height=640, margin=dict(t=10, b=0))
st.plotly_chart(fig, width="stretch")

with st.expander("Strongest absolute correlations (|r| > 0.7)"):
    pairs = (
        corr.where(np.triu(np.ones(corr.shape), 1).astype(bool))
        .stack().rename("r").reset_index()
    )
    pairs.columns = ["Variable A", "Variable B", "r"]
    pairs = pairs[pairs["r"].abs() > 0.7].sort_values("r", key=np.abs, ascending=False)
    st.dataframe(pairs, hide_index=True, width="stretch")
