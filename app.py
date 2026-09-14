"""Prediction-only Streamlit entry point. No dataset loading or fitting."""
import streamlit as st
import pandas as pd

from dashboard.inference import (
    InputError, export_csv, load_manifest, load_model, predict, read_csv, template,
)
from dashboard.schema import FEATURE_GROUPS, MAPPINGS, VARIABLE_DESCRIPTIONS

st.set_page_config(page_title="Student Outcome Predictor", page_icon="🎓", layout="wide")


@st.cache_resource(show_spinner="Loading packaged prediction model…")
def packaged_model(scope, manifest):
    return load_model(scope, manifest)


st.title("🎓 Student Outcome Predictor")
st.write("Enter a student profile or upload a CSV. Your model is already trained and ready to predict.")

try:
    manifest = load_manifest()
except RuntimeError as exc:
    st.error(str(exc))
    st.stop()

with st.sidebar:
    st.header("Prediction stage")
    scope = st.selectbox(
        "What information is available?", list(manifest["models"]), index=0,
        format_func=lambda key: {"enrollment": "At enrollment", "semester1": "After 1st semester",
                                 "semester2": "After 2nd semester"}[key],
    )
    st.caption("Choose only a stage the student has completed. Later-stage models require actual semester results.")
    info = manifest["models"][scope]
    st.success("Packaged model · Ready")
    st.caption(f"{len(info['features'])} inputs · Dropout / Enrolled / Graduate")
    with st.expander("Model information"):
        st.write(info["estimator"])
        st.write(f"Held-out accuracy: {info['test_metrics']['accuracy']:.1%}")
        st.write(f"Held-out macro F1: {info['test_metrics']['macro_f1']:.3f}")
        st.caption(f"{manifest['evaluation']['test_rows']} held-out UCI records; not a guarantee for your institution. "
                   "Selected using cross-validation on the training partition, not on the test set.")
        st.caption(f"Bundle date: {manifest['created_at'][:10]} · Model ID: {info['sha256'][:12]}")
    st.caption("Uploads are processed in server memory, not saved by this app. Avoid names or other direct identifiers. "
               "Use a private deployment for student records.")

try:
    model = packaged_model(scope, manifest)
except RuntimeError as exc:
    st.error(str(exc))
    st.stop()

st.warning("Decision support only—not a determination of a student's future. These estimates come from one "
           "Portuguese institution and are not locally validated or calibrated. Use human review and never "
           "use them alone to deny admission, funding, or support.")

single, batch_tab = st.tabs(["👤 Single student", "📁 Batch prediction"])
with single:
    st.caption("Prefilled values are training-set medians/modes, not this student's information. "
               "Review and replace them before predicting. All fields are required.")
    with st.form(f"student-{scope}"):
        inputs = {}
        for group, cols in FEATURE_GROUPS.items():
            cols = [col for col in cols if col in info["features"]]
            if not cols:
                continue
            st.subheader(group)
            columns = st.columns(3)
            for index, col in enumerate(cols):
                spec = info["schema"][col]
                widget = columns[index % 3]
                key = f"{scope}-{col}"
                help_text = VARIABLE_DESCRIPTIONS.get(col, "Observed student performance; use completed semester records.")
                if spec["kind"] == "category":
                    options = spec["options"]
                    inputs[col] = widget.selectbox(
                        col, options, index=options.index(spec["default"]), key=key, help=help_text,
                        format_func=lambda value, c=col: f"{value} — {MAPPINGS.get(c, {}).get(value, 'Other documented code')}",
                    )
                else:
                    cast = int if spec["kind"] == "integer" else float
                    inputs[col] = widget.number_input(
                        col, value=cast(spec["default"]),
                        min_value=cast(spec["min"]) if "min" in spec else None,
                        max_value=cast(spec["max"]) if "max" in spec else None,
                        step=1 if cast is int else 0.1, key=key, help=help_text,
                    )
        reviewed = st.checkbox("I have reviewed the prefilled values for this student.")
        submitted = st.form_submit_button("Predict outcome", type="primary", width="stretch")
    if submitted:
        st.session_state.pop(f"single-result-{scope}", None)
        if not reviewed:
            st.error("Please review the prefilled values and tick the confirmation before predicting.")
        else:
            try:
                st.session_state[f"single-result-{scope}"] = predict(pd.DataFrame([inputs]), model, info)
            except InputError as exc:
                st.error(str(exc))
            except Exception:
                st.error("Prediction failed. Please restart the dashboard or restore the original model package.")
    result = st.session_state.get(f"single-result-{scope}")
    if result is not None:
        out, warnings = result
        st.subheader(f"Predicted outcome: {out['Predicted outcome'].iloc[0]}")
        st.caption("Last submitted profile. Form edits do not change this result until you press Predict outcome again.")
        cols = st.columns(3)
        for col, label in zip(cols, info["classes"]):
            col.metric(f"{label} probability", f"{out[f'P({label})'].iloc[0]:.1%}")
        for warning in warnings:
            st.warning(warning)
        st.download_button("Download prediction (CSV)", export_csv(out), "student_prediction.csv", "text/csv")
        with st.expander("Profile used for this prediction"):
            st.dataframe(out[info["features"]].T.rename(columns={0: "Value"}), width="stretch")

with batch_tab:
    st.subheader("Predict multiple students")
    st.write("1. Download the template for this stage.\n2. Replace the example values with student records.\n"
             "3. Upload and press **Predict uploaded students**.")
    st.caption("CSV: UTF-8, comma or semicolon separated; maximum 10 MB / 10,000 rows. "
               "Use numeric category codes shown in the form. Missing columns, blank values, invalid codes, "
               "and impossible counts are rejected—not silently filled. Extra columns (including Target) "
               "are ignored by the model and retained in the download; existing prediction columns are replaced.")
    st.download_button("Download CSV template", export_csv(template(info)), f"students_{scope}_template.csv", "text/csv")
    upload = st.file_uploader("Upload student CSV", type=["csv"], key=f"upload-{scope}")
    if upload is not None:
        import hashlib
        data = upload.getvalue()
        result_key = f"batch-result-{scope}"
        fingerprint = hashlib.sha256(data).hexdigest()
        if st.session_state.get(f"batch-fingerprint-{scope}") != fingerprint:
            st.session_state.pop(result_key, None)
        try:
            frame = read_csv(data)
        except InputError as exc:
            st.error(str(exc))
        else:
            st.caption(f"{len(frame):,} rows uploaded. Student row numbers in errors start at 1, excluding the header.")
            if st.button("Predict uploaded students", type="primary"):
                st.session_state.pop(result_key, None)
                try:
                    with st.spinner("Predicting…"):
                        st.session_state[result_key] = predict(frame, model, info)
                    st.session_state[f"batch-fingerprint-{scope}"] = fingerprint
                except InputError as exc:
                    st.error(str(exc))
                except Exception:
                    st.error("Prediction failed. Please restart the dashboard or restore the original model package.")
            if result_key in st.session_state:
                out, warnings = st.session_state[result_key]
                for warning in warnings:
                    st.warning(warning)
                st.success(f"{len(out):,} students scored")
                st.dataframe(out, width="stretch", height=360)
                st.download_button("Download predictions (CSV)", export_csv(out), "students_predictions.csv", "text/csv", type="primary")
    else:
        st.session_state.pop(f"batch-result-{scope}", None)
        st.session_state.pop(f"batch-fingerprint-{scope}", None)

st.divider()
st.caption("Dataset: Realinho, Machado, Baptista & Martins · UCI 697 · CC BY 4.0 · DOI: 10.24432/C5MC89. "
           "Predictions use the packaged model only. No training or dataset download occurs in this dashboard.")
