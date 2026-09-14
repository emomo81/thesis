"""Data Explorer page."""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd
import streamlit as st

from dashboard.data import (
    ALL_FEATURES,
    CATEGORICAL_FEATURES,
    CONTINUOUS_FEATURES,
    FEATURE_GROUPS,
    VARIABLE_DESCRIPTIONS,
    MAPPINGS,
    with_labels,
    load_data,
)

st.set_page_config(page_title="Data Explorer — Thesis Dashboard", page_icon="📋", layout="wide")

df = load_data()

st.title("📋 Data Explorer")
st.markdown("Filter the records, browse the variable dictionary and download subsets.")

# ----------------------------------------------------------------- Filters
with st.container(border=True):
    fcol1, fcol2, fcol3, fcol4 = st.columns(4)
    course = fcol1.multiselect(
        "Course", options=sorted(df["Course"].unique()),
        format_func=lambda c: f"{c} — {MAPPINGS['Course'][c]}",
    )
    gender = fcol2.multiselect(
        "Gender", options=sorted(df["Gender"].unique()),
        format_func=lambda g: MAPPINGS["Gender"][g],
    )
    target = fcol3.multiselect("Outcome", options=["Dropout", "Enrolled", "Graduate"])
    age_min, age_max = int(df["Age at enrollment"].min()), int(df["Age at enrollment"].max())
    age = fcol4.slider("Age at enrollment", age_min, age_max, (age_min, age_max))

    show_labels = fcol1.checkbox("Show readable labels instead of codes", value=True)

view = df.copy()
if course:
    view = view[view["Course"].isin(course)]
if gender:
    view = view[view["Gender"].isin(gender)]
if target:
    view = view[view["Target"].isin(target)]
view = view[view["Age at enrollment"].between(*age)]

# ----------------------------------------------------------------- Table
st.markdown(f"**{len(view):,}** of {len(df):,} students shown")
st.dataframe(view, width="stretch", height=420)

st.download_button(
    "⬇️ Download filtered data (CSV)",
    view.to_csv(index=False).encode("utf-8"),
    file_name="students_filtered.csv",
    mime="text/csv",
    type="primary",
)

st.divider()

# ----------------------------------------------------------------- Dictionary
st.subheader("Variable dictionary")
dict_rows = []
for group, cols in FEATURE_GROUPS.items():
    for c in cols:
        kind = (
            "categorical (coded)"
            if c in CATEGORICAL_FEATURES
            else "binary"
            if c in {"Displaced", "Educational special needs", "Debtor",
                     "Tuition fees up to date", "Gender", "Scholarship holder",
                     "International"}
            else "numeric"
        )
        dict_rows.append(
            {"Variable": c, "Group": group, "Type": kind,
             "Notes": VARIABLE_DESCRIPTIONS.get(c, "")}
        )
dict_rows.append({"Variable": "Target", "Group": "Outcome", "Type": "categorical",
                  "Notes": "Dropout / Enrolled / Graduate (end of normal course duration)"})
st.dataframe(pd.DataFrame(dict_rows), width="stretch", hide_index=True)

# ----------------------------------------------------------------- Profile a column
st.subheader("Profile a variable")
cat_vars = ALL_FEATURES + ["Target"]
sel = st.selectbox("Variable", cat_vars, index=cat_vars.index("Admission grade"))

p1, p2 = st.columns([1, 1])
with p1:
    st.metric("Missing", 0)
    st.metric("Unique", int(view[sel].nunique()))
    if pd.api.types.is_numeric_dtype(view[sel]):
        st.metric("Mean", f"{view[sel].mean():.2f}")
        st.metric("Std", f"{view[sel].std():.2f}")
with p2:
    if sel in CATEGORICAL_FEATURES or sel == "Target":
        counts = view[sel].value_counts().head(12)
        if show_labels and sel != "Target":
            counts.index = [MAPPINGS[sel].get(i, i) for i in counts.index]
        st.bar_chart(counts, height=330)
    else:
        st.line_chart(view[sel].value_counts().sort_index(), height=330)
