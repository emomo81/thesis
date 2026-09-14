# Model card — Student Outcome Predictor

## Intended use

Research-oriented prediction of Dropout / Enrolled / Graduate, to support
human-reviewed student support planning. Not suitable as the sole basis for
admissions, funding, exclusion, or any other consequential educational decision.
“Enrolled” is the dataset's outcome class, not a new check of current enrollment.

## Data and evaluation

UCI 697, DOI 10.24432/C5MC89; 4,424 students from one Portuguese institution,
academic years 2008/09–2018/19. CC BY 4.0. Creators: Realinho, Machado,
Baptista and Martins. See README for attribution. No external or temporal
validation has been performed.

Fixed stratified 80/20 split (seed 42): **3,539 training / 885 held-out test**.
Each stage compares Logistic Regression, Random Forest and Hist Gradient
Boosting using three-fold stratified training-only CV, selected by mean macro
F1. Preprocessing is fitted inside each fold: one-hot encoding for categorical
codes and standard scaling for numerical inputs. No target column is used as
an input. Bundles are fitted only on the training partition; test rows are not
refitted. Schema defaults and observed ranges use training records only;
category options also include the documented UCI codes.

| Stage | Inputs | Selected model | Test accuracy | Test macro F1 |
|---|---:|---|---:|---:|
| Enrollment only (early prediction) | 24 | Logistic Regression | 57.3% | 0.549 |
| Enrollment + 1st semester | 30 | Logistic Regression | 69.9% | 0.659 |
| All features (incl. 2nd semester) | 36 | Logistic Regression | 72.5% | 0.689 |

These are measurements of the shipped models on the fixed test partition,
not guarantees of future performance. Full comparison scores, class-wise
precision/recall/F1, confusion matrices (class order in manifest), dataset
checksum, package date and model checksums are in `artifacts/manifest.json`.
The same test students are used across stages. Stage-specific models avoid
using future semester results for enrollment-only predictions, but source data
does not establish precise timestamps for every financial-status variable.
Use contemporaneous values and validate availability at the intended stage.

## Limitations

- Enrollment-only accuracy is modest; even later-stage predictions make errors.
- Probabilities are **not calibrated** and no clinical/policy risk thresholds
  have been validated. Do not interpret them as certain outcomes.
- A random split from one institution may be optimistic relative to deployment
  in another institution, country, course, or academic year.
- Sensitive attributes (including gender, nationality and financial status)
  are inputs. Subgroup fairness, privacy and legal suitability are not audited.
  Human oversight and local validation are mandatory before consequential use.
- Defaults are example medians/modes, not unknown-value substitutes. Batch
  inputs must be complete. New category codes are rejected; numeric values
  outside training ranges trigger warnings when otherwise valid.
- The source contains three second-semester records with units without
  evaluations exceeding enrolled units. This inconsistency triggers a review
  warning rather than rejection; approved units above enrolled units are rejected.
- One-hot encoders ignore documented categories unseen in their training fold;
  predictions for rare/unseen categories should be treated cautiously.
- The application is not an authenticated multi-user student records system.
  Uploaded records are held in server memory; use an appropriately secured
  deployment, avoid direct identifiers and follow institutional retention rules.

## Packaging and maintenance

Python 3.11 (also supported launcher: 3.12), scikit-learn 1.7.2. Use the included
runtime lockfile. Models are local, trusted joblib pipelines, loaded after
checksum and dependency checks. The dashboard never trains, downloads datasets,
or accepts model uploads. Corrupted or missing bundles fail closed. Revalidate
and regenerate the manifest and lockfile whenever updating dependencies/models.
