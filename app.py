"""Home page — Student Dropout & Academic Success dashboard (thesis project)."""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

import pandas as pd
import plotly.express as px
import streamlit as st

from dashboard.data import TARGET_COLORS, TARGET_ORDER, load_data

st.set_page_config(
    page_title="Student Dropout & Success — Thesis Dashboard",
    page_icon="🎓",
    layout="wide",
)

df = load_data()

# ---------------------------------------------------------------- Hero
st.title("🎓 Student Dropout & Academic Success")
st.markdown(
    "An interactive dashboard for the UCI Machine Learning Repository dataset "
    "**“Predict Students’ Dropout and Academic Success”** (id 697) — 4,424 "
    "undergraduate records from a Portuguese higher-education institution "
    "(academic years 2008/09–2018/19), collected to support early identification "
    "of students at risk."
)

# ---------------------------------------------------------------- KPIs
n = len(df)
counts = df["Target"].value_counts()
drop_rate = counts.get("Dropout", 0) / n
grad_rate = counts.get("Graduate", 0) / n

c1, c2, c3, c4, c5 = st.columns(5)
c1.metric("Students", f"{n:,}")
c2.metric("Features", "36")
c3.metric("Dropout", f"{drop_rate:.1%}", f"{counts.get('Dropout', 0):,} students")
c4.metric("Enrolled", f"{counts.get('Enrolled', 0) / n:.1%}",
          f"{counts.get('Enrolled', 0):,} students")
c5.metric("Graduate", f"{grad_rate:.1%}", f"{counts.get('Graduate', 0):,} students")

st.divider()

# ---------------------------------------------------------------- Charts + card
left, right = st.columns([3, 2])

with left:
    st.subheader("Outcome distribution")
    td = (
        df["Target"].value_counts().reindex(TARGET_ORDER).rename_axis("Target")
        .reset_index(name="Students")
    )
    fig = px.pie(
        td,
        names="Target",
        values="Students",
        hole=0.45,
        color="Target",
        color_discrete_map=TARGET_COLORS,
        category_orders={"Target": TARGET_ORDER},
    )
    fig.update_traces(textinfo="label+percent", textfont_size=14)
    fig.update_layout(margin=dict(t=10, b=10, l=10, r=10), height=360,
                      legend_title_text=None)
    st.plotly_chart(fig, width="stretch")

with right:
    st.subheader("About the dataset")
    st.markdown(
        """
| | |
|---|---|
| **Source** | UCI ML Repository — [id 697](https://archive.ics.uci.edu/dataset/697) |
| **Creators** | Realinho, Machado, Baptista & Martins (Polytechnic Institute of Portalegre) |
| **License** | CC BY 4.0 |
| **DOI** | [10.24432/C5MC89](https://doi.org/10.24432/C5MC89) |
| **Instances** | 4,424 students × 36 attributes |
| **Task** | 3-class classification: *Dropout / Enrolled / Graduate* |
| **Data** | Demographics, socioeconomic & macroeconomic factors, academic path at enrolment, 1st & 2nd semester performance |
        """
    )

st.subheader("Explore the dashboard")
nav1, nav2, nav3, nav4 = st.columns(4)
nav1.markdown("### 📋 1 · Data Explorer\nFilter the raw records and browse the variable dictionary.")
nav2.markdown("### 📊 2 · Exploratory Analysis\nDistributions, outcome gaps and correlations.")
nav3.markdown("### 🤖 3 · Model Training\nCompare classifiers, inspect metrics and feature importance.")
nav4.markdown("### 🔮 4 · Predict Student\nScore a single student or a batch upload.")

st.divider()
st.caption(
    "Citation: M.V. Martins, D. Tolledo, J. Machado, L.M.T. Baptista, V. Realinho. "
    "(2021) “Early prediction of student’s performance in higher education: a case study”, "
    "*Trends and Applications in Information Systems and Technologies*, Springer."
)
