# Student Dropout & Academic Success — Thesis Dashboard (Streamlit)

Interactive **Streamlit** dashboard for the UCI Machine Learning Repository dataset
[*“Predict Students’ Dropout and Academic Success”* (id 697)](https://archive.ics.uci.edu/dataset/697) —
4,424 undergraduate records from a Portuguese higher-education institution
(academic years 2008/09–2018/19), 36 attributes, 3-class target
(*Dropout / Enrolled / Graduate*).

## Pages

| Page | What it does |
|---|---|
| 🎓 **Overview** (`app.py`) | Dataset card, KPIs, outcome distribution |
| 📋 **Data Explorer** | Filterable record table, variable dictionary, per-variable profiling, CSV export |
| 📊 **Exploratory Analysis** | Outcome gaps across demographics/socioeconomics, age & grades, macroeconomic context, correlation heatmap |
| 🤖 **Model Training** | Logistic Regression vs Random Forest vs Hist Gradient Boosting; comparison metrics, confusion matrix, ROC curves, permutation importance; 3-class or binary (Dropout vs rest); feature scopes for early-prediction scenarios |
| 🔮 **Predict Student** | Score a single student profile from an interactive form, or batch-score an uploaded CSV |

## Run it

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/streamlit run app.py
```

Then open http://localhost:8501.

## Data pipeline

```bash
.venv/bin/python scripts/prepare_data.py
```

Reads `data/raw/data.csv` (semicolon-separated, as distributed on UCI — already
committed here) and writes the normalized `data/students.csv` used by the app.
If the raw file is missing, the script re-fetches the dataset via
`ucimlrepo.fetch_ucirepo(id=697)`.

**Provenance:** Realinho, V.; Machado, J.; Baptista, L.; Martins, M.V.
“Predicting Student Dropout and Academic Success”, *Data* 2022, 7(11), 146 —
DOI [10.24432/C5MC89](https://doi.org/10.24432/C5MC89), licensed **CC BY 4.0**.
Category code → label dictionaries follow the official dataset documentation.

Citation for the dataset paper:
M.V. Martins, D. Tolledo, J. Machado, L.M.T. Baptista, V. Realinho (2021),
“Early prediction of student’s performance in higher education: a case study”,
*Trends and Applications in Information Systems and Technologies*, Springer.

## Repository layout

```
├── app.py                    # Streamlit entry point (Overview page)
├── pages/                    # Multipage Streamlit pages (1–4)
├── dashboard/
│   ├── data.py               # Loading, feature groups, code→label mappings
│   └── modeling.py           # Training/evaluation utilities
├── scripts/prepare_data.py   # raw → clean dataset builder
├── data/
│   ├── raw/data.csv          # Original UCI distribution (unmodified)
│   └── students.csv          # Cleaned dataset used by the app
├── .streamlit/config.toml    # Theme & server config
└── requirements.txt
```
