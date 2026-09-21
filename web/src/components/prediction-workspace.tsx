"use client";
import { useState, useRef } from "react";
import Papa from "papaparse";
import {
  ScanLine,
  FileSpreadsheet,
  UploadCloud,
  Download,
  ArrowRight,
  LoaderCircle,
  Info,
  ChevronDown,
} from "lucide-react";
import { catalog, stages, stageLabels } from "@/lib/catalog";
import type { PredictionResult, Stage } from "@/lib/types";
import { downloadText, parseStudentCsv } from "@/lib/csv";
import { PredictionResults } from "./prediction-results";
function defaults(stage: Stage) {
  return Object.fromEntries(catalog[stage].features.map((f) => [f.name, String(f.default)]));
}
export function PredictionWorkspace({ initialMode = "single" }: { initialMode?: string }) {
  const [stage, setStage] = useState<Stage>("enrollment");
  const [mode, setMode] = useState(initialMode === "batch" ? "batch" : "single");
  const [inputs, setInputs] = useState(defaults("enrollment"));
  const [reviewed, setReviewed] = useState(false);
  const [save, setSave] = useState(false);
  const [filename, setFilename] = useState("");
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const model = catalog[stage];
  function changeStage(value: Stage) {
    setStage(value);
    setInputs(defaults(value));
    setRows(null);
    setFilename("");
    setReviewed(false);
    setResult(null);
    setError("");
    if (uploadRef.current) uploadRef.current.value = "";
  }
  async function loadFile(file?: File) {
    setRows(null);
    setFilename("");
    setError("");
    setResult(null);
    setReviewed(false);
    if (!file) return;
    if (file.size > 256 * 1024) {
      setError("Choose a CSV of at most 256 KB.");
      return;
    }
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      const parsed = parseStudentCsv(text);
      const missing = model.features.filter((f) => !(f.name in parsed[0])).map((f) => f.name);
      if (missing.length)
        throw new Error(
          `Missing required columns: ${missing.join(", ")}. Download the template for this stage.`,
        );
      // Deliberately exclude extra identifiers and Target from the request.
      setRows(
        parsed.map((row) => Object.fromEntries(model.features.map((f) => [f.name, row[f.name]]))),
      );
      setFilename(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the file.");
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!reviewed) {
      setError("Review the inputs and confirm that you are authorized to process these records.");
      return;
    }
    const records = mode === "batch" ? rows : [inputs];
    if (!records?.length) {
      setError("Upload a valid CSV first.");
      return;
    }
    for (let index = 0; index < records.length; index++) {
      for (const field of model.features) {
        const raw = records[index][field.name];
        const value = Number(raw);
        if (
          raw === undefined ||
          raw.trim() === "" ||
          !Number.isFinite(value) ||
          (field.kind !== "number" && !Number.isInteger(value)) ||
          (field.options && !field.options.includes(value)) ||
          (field.min !== undefined && value < field.min) ||
          (field.max !== undefined && value > field.max)
        ) {
          setError(
            `Student row ${index + 1}: check ${field.name}. A valid, non-empty ${field.kind === "category" ? "category code" : field.kind === "integer" ? "whole number" : "number"} is required.`,
          );
          return;
        }
      }
    }
    setPending(true);
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, rows: records, save }),
        signal: AbortSignal.timeout(55000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Prediction could not be completed.");
      setResult(data);
      setTimeout(
        () => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        80,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "The request failed. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">FROM PROFILE TO PERSPECTIVE</span>
          <h1>Make a prediction.</h1>
          <p>Your model is already trained. Start with information you have.</p>
        </div>
        <span className="ready-badge">
          <i className="status-dot" /> Packaged models ready
        </span>
      </div>
      <div className="notice safety-note">
        <Info size={18} />
        <span>
          Research estimates, not decisions. Use authorized data, avoid direct identifiers, and
          always review results in context.
        </span>
      </div>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={pending} className="prediction-fieldset">
          <section className="card stage-selector">
            <div>
              <span className="step-label">01</span>
              <h3>When are you predicting?</h3>
            </div>
            <p>
              Only choose a stage the student has completed. Semester models require actual results.
            </p>
            <div className="stage-options">
              {stages.map((s, i) => (
                <button
                  type="button"
                  key={s}
                  className={stage === s ? "selected" : ""}
                  onClick={() => changeStage(s)}
                >
                  <span className="radio-dot" />
                  <div>
                    <strong>{stageLabels[s]}</strong>
                    <small>{catalog[s].features.length} input features</small>
                  </div>
                  <span className="stage-number">0{i + 1}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="card inputs-card">
            <div className="card-heading">
              <div className="step-heading">
                <span className="step-label">02</span>
                <h3>Add the student information</h3>
              </div>
              <div className="segmented">
                <button
                  type="button"
                  className={mode === "single" ? "selected" : ""}
                  onClick={() => {
                    setMode("single");
                    setResult(null);
                    setError("");
                    setReviewed(false);
                  }}
                >
                  <ScanLine size={16} /> Single student
                </button>
                <button
                  type="button"
                  className={mode === "batch" ? "selected" : ""}
                  onClick={() => {
                    setMode("batch");
                    setResult(null);
                    setError("");
                    setReviewed(false);
                  }}
                >
                  <FileSpreadsheet size={16} /> Batch CSV
                </button>
              </div>
            </div>
            {mode === "single" ? (
              <>
                <div className="input-note">
                  Values are prefilled with training-set medians or modes—not this student’s
                  information. Review every field before predicting.
                </div>
                {Array.from(new Set(model.features.map((f) => f.group))).map((group, index) => (
                  <details className="input-group" key={`${stage}-${group}`} open={index === 0}>
                    <summary>
                      <span>
                        <b>0{index + 1}</b>
                        {group}
                        <small>
                          {model.features.filter((f) => f.group === group).length} fields
                        </small>
                      </span>
                      <ChevronDown size={18} />
                    </summary>
                    <div className="field-grid">
                      {model.features
                        .filter((f) => f.group === group)
                        .map((field) => (
                          <label key={field.name}>
                            {field.name}
                            {field.kind === "category" ? (
                              <select
                                value={inputs[field.name]}
                                onChange={(e) => {
                                  setInputs({ ...inputs, [field.name]: e.target.value });
                                  setReviewed(false);
                                }}
                              >
                                {field.options?.map((value) => (
                                  <option key={value} value={value}>
                                    {value} — {field.labels[String(value)]}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="number"
                                inputMode="decimal"
                                value={inputs[field.name]}
                                min={field.min}
                                max={field.max}
                                step={field.kind === "integer" ? 1 : "any"}
                                onChange={(e) => {
                                  setInputs({ ...inputs, [field.name]: e.target.value });
                                  setReviewed(false);
                                }}
                              />
                            )}
                            <small>{field.description}</small>
                          </label>
                        ))}
                    </div>
                  </details>
                ))}
              </>
            ) : (
              <div className="batch-input">
                <div className="batch-directions">
                  <div>
                    <h3>A clean template. A smoother upload.</h3>
                    <p>
                      Use numeric category codes. All {model.features.length} columns are required.
                      Extra columns are ignored and not sent to the model.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button button-outline small"
                    onClick={() =>
                      downloadText(
                        "\uFEFF" + Papa.unparse([defaults(stage)]),
                        `academa-${stage}-template.csv`,
                      )
                    }
                  >
                    <Download size={16} /> Download template
                  </button>
                </div>
                <label className="upload-zone">
                  <UploadCloud size={35} />
                  <strong>{filename || "Choose a CSV to get started"}</strong>
                  <span>
                    {rows
                      ? `${rows.length} profiles loaded · Ready for review`
                      : "UTF-8 · Comma or semicolon separated · Up to 250 profiles / 256 KB"}
                  </span>
                  <input
                    ref={uploadRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => loadFile(e.target.files?.[0])}
                  />
                </label>
                {rows && (
                  <div className="upload-confirm">
                    <FileSpreadsheet size={18} />
                    <span>
                      {filename} · {rows.length} profiles. Row numbers in the results follow this
                      file’s order.
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>
          <section className="card submit-card">
            <div className="step-heading">
              <span className="step-label">03</span>
              <h3>Review and predict</h3>
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              <span>
                I have reviewed these inputs and am authorized to process them. I understand the
                model provides estimates requiring human review.
              </span>
            </label>
            <label className="check-label">
              <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
              <span>
                Save outcome probabilities to my private history.
                <small>
                  Raw input profiles are not stored. You can delete saved results anytime.
                </small>
              </span>
            </label>
            {error && (
              <div role="alert" className="error-message">
                {error}
              </div>
            )}
            <div className="submit-footer">
              <small>
                {stageLabels[stage]} · {model.estimator}
                <br />
                Model ID {model.version.slice(0, 12)}
              </small>
              <button type="submit" className="button button-dark">
                {pending ? (
                  <>
                    <LoaderCircle size={18} className="spin" /> Predicting…
                  </>
                ) : (
                  <>
                    Predict {mode === "batch" && rows ? `${rows.length} profiles` : "outcome"}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </section>
        </fieldset>
      </form>
      <div ref={resultRef}>{result && <PredictionResults data={result} />}</div>
    </>
  );
}
