"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Download,
  Trash2,
  History,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  LoaderCircle,
} from "lucide-react";
import type { HistoryRun } from "@/lib/types";
import { stageLabels } from "@/lib/catalog";
import { downloadText, resultsCsv } from "@/lib/csv";
import { OutcomeBadge } from "./probabilities";
import { PredictionResults } from "./prediction-results";
export function HistoryWorkspace() {
  const [runs, setRuns] = useState<HistoryRun[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<HistoryRun | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/history?page=${page}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRuns(data.runs);
      setCount(data.count);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load history.");
    } finally {
      setLoading(false);
    }
  }, [page]);
  useEffect(() => {
    void load();
  }, [load]);
  async function remove(run: HistoryRun) {
    if (
      !window.confirm(`Delete this saved run (${run.row_count} profiles)? This cannot be undone.`)
    )
      return;
    setBusy(run.id);
    setError("");
    try {
      const response = await fetch(`/api/history/${run.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (selected?.id === run.id) setSelected(null);
      if (runs.length === 1 && page > 0) setPage(page - 1);
      else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR RESULTS, IN ONE PLACE</span>
          <h1>Prediction history.</h1>
          <p>Revisit, download, or delete the results you chose to save.</p>
        </div>
        <button className="button button-outline" onClick={load} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      <section className="card history-card">
        <div className="card-heading">
          <h3>Saved predictions</h3>
          <span className="subtle-pill">{count} runs</span>
        </div>
        {loading ? (
          <div className="empty-state" role="status">
            <LoaderCircle className="spin" />
            <p>Loading your history…</p>
          </div>
        ) : runs.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Run / date</th>
                    <th>Stage</th>
                    <th>Profiles</th>
                    <th>Outcome</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td>
                        <button className="table-link" onClick={() => setSelected(run)}>
                          Run {run.id.slice(0, 8)}
                        </button>
                        <small className="table-date">
                          {new Date(run.created_at).toLocaleString()}
                        </small>
                      </td>
                      <td>{stageLabels[run.stage]}</td>
                      <td>{run.row_count}</td>
                      <td>
                        {run.row_count === 1 ? (
                          <OutcomeBadge outcome={run.results[0].outcome} />
                        ) : (
                          <span className="subtle-pill">Multiple outcomes</span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="icon-button"
                            title="Download results"
                            aria-label={`Download run ${run.id.slice(0, 8)}`}
                            onClick={() =>
                              downloadText(resultsCsv(run), `academa-${run.id.slice(0, 8)}.csv`)
                            }
                          >
                            <Download size={17} />
                          </button>
                          <button
                            className="icon-button danger"
                            aria-label={`Delete run ${run.id.slice(0, 8)}`}
                            title="Delete results"
                            disabled={busy === run.id}
                            onClick={() => remove(run)}
                          >
                            {busy === run.id ? (
                              <LoaderCircle className="spin" size={17} />
                            ) : (
                              <Trash2 size={17} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>
                Page {page + 1} of {Math.max(1, Math.ceil(count / 20))}
              </span>
              <div>
                <button
                  className="icon-button"
                  aria-label="Previous page"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Next page"
                  disabled={(page + 1) * 20 >= count}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <span>
              <History size={30} />
            </span>
            <h3>No saved predictions yet.</h3>
            <p>
              Select “Save outcome probabilities” when making a prediction.
              <br />
              Your history will appear here, visible only to your account.
            </p>
            <Link href="/dashboard/predict" className="button button-dark small">
              Make a prediction →
            </Link>
          </div>
        )}
      </section>
      {selected && (
        <PredictionResults
          data={{
            stage: selected.stage,
            model_version: selected.model_version,
            results: selected.results,
            warnings: selected.warnings,
            saved: true,
            id: selected.id,
          }}
        />
      )}
      <p className="fine-print">
        Only outcomes, probabilities, stage, model version and timestamps are saved. Raw student
        profiles are not retained in history.
      </p>
    </>
  );
}
