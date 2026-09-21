# Student Outcome Predictor

A **prediction-only dashboard with pre-trained models included**. Enter one
student or upload a CSV; receive Dropout / Enrolled / Graduate predictions and
estimated probabilities. No training, data preparation, model selection, or
training-data download is required to use it.

## New: full-stack web application

The repository also includes **Academa**, a Next.js/Node.js website with a landing
page, Supabase email/password accounts, a protected prediction dashboard, CSV
processing, and optional PostgreSQL prediction history.

- Website: `web/` → **Vercel**
- Private Python model API: `service/` → **Render** (`render.yaml`)
- Authentication and PostgreSQL: **Supabase** (`supabase/migrations/`)

Start the public site/sample workspace with `cd web && npm ci && npm run dev`.
Real accounts and predictions require your deployment environment variables and
the database migration. No live accounts or cloud resources are preconfigured.
See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the complete setup and acceptance checklist.

---

## Open the offline Streamlit dashboard

Install **Python 3.11 or 3.12** first. Extract the release ZIP (do not run from
inside the ZIP), then:

- **Windows:** double-click `Start Dashboard.bat`.
- **macOS:** double-click `Start Dashboard.command` (if blocked, use the terminal
  command below; downloaded scripts may require permission).
- **Linux / any terminal:** run `python3 launch.py` inside the extracted folder
  (`python launch.py` on Windows).

The launcher creates a private `.venv`, installs the pinned dependencies on the
first run, verifies the packaged models, and opens **http://localhost:8501**.
First setup requires internet; subsequent launches work offline. Keep the
launcher window open while using the dashboard. **Ctrl+C** stops it.
The download includes model files, not a standalone Python executable.

If the browser does not open automatically, visit http://localhost:8501 yourself.
The dashboard must be started on the computer serving it. The server binds to
`0.0.0.0` for hosted previews; use a firewall/private network for personal use.
For loopback-only manual use, add `--server.address=127.0.0.1` to the Streamlit
command below. Do not expose real student records on an unauthenticated public
server. Authentication/TLS must be provided by your hosting platform or proxy.

### Already have a Python environment?

```bash
python -m pip install -r requirements.lock
python -m streamlit run app.py
```

### Docker (optional, requires Docker)

```bash
docker build -t student-outcome-predictor .
docker run --rm -p 127.0.0.1:8501:8501 student-outcome-predictor
```

## Make predictions

1. Choose **At enrollment**, **After 1st semester**, or **After 2nd semester**.
   Only use information actually available at that time; later stages require
   real completed-semester results.
2. For a single student, replace the example defaults, confirm you reviewed
   them, and click **Predict outcome**.
3. For a batch, download that stage's template, replace the example row(s),
   upload the CSV, and click **Predict uploaded students**.
4. Download the results as CSV, if wanted.

CSV files must be UTF-8 with a header and comma or semicolon separators.
The limit is **10 MB / 10,000 students**. Categorical features use the numeric
codes shown beside the labels in the form. Missing columns/values, invalid
codes, non-finite numbers and impossible counts are rejected, never silently
filled. Errors use student row numbers starting at 1, excluding the header.
Extra columns, including `Target`, are ignored for prediction and retained in
exports. Existing `Predicted outcome` and `P(...)` columns are overwritten.
Exported text is escaped when necessary to avoid spreadsheet formula execution.

Results are based on the **last submitted profile**. Edit and submit again to
update a result. No arbitrary high/low risk thresholds are applied.

## What is packaged?

- `artifacts/*.joblib`: three ready-to-use preprocessing + classifier pipelines.
- `artifacts/manifest.json`: input schemas/defaults, class order, hashes,
  dependency versions, validation comparisons and held-out metrics.
- `app.py` and `dashboard/inference.py`: inference only; never fit a model.
- `requirements.lock`: exact runtime dependencies used for verification.
- `MODEL_CARD.md`: evaluation and limitations.

Only trusted bundled models are loaded. Joblib is pickle-based: **never replace
these files with untrusted uploads**. Checksums catch corruption, not malicious
replacement of both model and manifest. Missing/incompatible models stop with
an actionable error; they are never silently retrained.

The application does not write uploaded records to disk or send them to a
third-party prediction API. Streamlit keeps data in server/session memory for
interaction/download. Avoid direct identifiers and use a private deployment.

## Limitations and attribution

This is a research decision-support tool, **not a validated student screening
system**. Model probabilities are uncalibrated estimates, not guarantees.
The training data includes sensitive demographic and socioeconomic attributes;
local validation, subgroup fairness assessment and human review are required
before real-world use. Never use these outputs alone to deny admission, funding,
or student support. See [MODEL_CARD.md](MODEL_CARD.md).

Dataset: Realinho, V.; Machado, J.; Baptista, L.; Martins, M.V.,
“Predicting Student Dropout and Academic Success”, *Data* 2022, 7(11), 146.
UCI dataset 697, DOI [10.24432/C5MC89](https://doi.org/10.24432/C5MC89),
**CC BY 4.0**. Contains 4,424 records from one Portuguese higher-education
institution, 36 features, and three outcome classes. Dataset headers were
normalized; the release ZIP does not contain student-level training records.

## Maintainers only — not needed to use the dashboard

These commands are for the full source checkout, not the prediction-only ZIP.
The original research pages were removed from the dashboard; offline utilities
and the source data remain in the repository.

```bash
# Optional: regenerate normalized data from the committed raw CSV
python scripts/prepare_data.py
# Offline model comparison, training, evaluation and packaging
python scripts/package_models.py
# Regression tests (also exercises the dashboard)
python -m pip install pytest==8.4.2
python -m pytest -q tests/test_app.py tests/test_inference.py
# Build release/student-outcome-predictor.zip without data or training code
python scripts/build_release.py
# Verify installation and run all three packaged models, without a browser
python launch.py --check
```

Changing model/runtime versions requires regenerating the bundles and updating
`requirements.txt`, `requirements.lock`, and `MODEL_CARD.md` together. Training
uses a fixed stratified 80/20 split. Selection uses three-fold CV macro F1 only
on the training partition. Selected models are fitted on that partition and
packaged **without fitting the held-out test rows**, so reported test metrics
apply to the actual shipped models. See the manifest for full results.
