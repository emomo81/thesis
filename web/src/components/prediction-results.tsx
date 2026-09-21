"use client";
import { Download, CheckCircle2, History } from "lucide-react";
import Link from "next/link";
import { Probabilities, OutcomeBadge } from "./probabilities";
import type { PredictionResult } from "@/lib/types";
import { downloadText, resultsCsv } from "@/lib/csv";
import { stageLabels } from "@/lib/catalog";
export function PredictionResults({ data }: { data: PredictionResult }) {
  return (
    <section className="card results-card" aria-live="polite">
      <div className="card-heading">
        <div>
          <span className="eyebrow">
            <CheckCircle2 size={14} /> PREDICTION COMPLETE
          </span>
          <h2>
            {data.results.length === 1
              ? "A new perspective."
              : `${data.results.length} profiles, ready to review.`}
          </h2>
          <p>{stageLabels[data.stage]} · Results from your last submission</p>
        </div>
        <button
          className="button button-outline small"
          onClick={() => downloadText(resultsCsv(data), "academa-predictions.csv")}
        >
          <Download size={16} /> Download CSV
        </button>
      </div>
      {data.saveError && <div className="notice">{data.saveError}</div>}
      {data.saved ? (
        <p className="save-status">
          <CheckCircle2 size={15} /> Saved to your private history{" "}
          <Link href="/dashboard/history">
            <History size={14} /> View history
          </Link>
        </p>
      ) : (
        !data.saveError && (
          <p className="save-status">Not saved. Download your results before leaving this page.</p>
        )
      )}
      {data.warnings.map((warning, index) => (
        <div key={index} className="notice">
          {warning}
        </div>
      ))}
      {data.results.length === 1 ? (
        <div className="single-result">
          <div>
            <span className="eyebrow">MOST LIKELY OUTCOME</span>
            <h2>{data.results[0].outcome}</h2>
            <p>
              This is a model estimate—not a determination of this student’s future. Review all
              three probabilities and the available context.
            </p>
          </div>
          <Probabilities probabilities={data.results[0].probabilities} />
        </div>
      ) : (
        <div className="table-scroll result-table">
          <table>
            <thead>
              <tr>
                <th>Student row</th>
                <th>Outcome</th>
                <th>P(Dropout)</th>
                <th>P(Enrolled)</th>
                <th>P(Graduate)</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((row) => (
                <tr key={row.row}>
                  <td>{row.row}</td>
                  <td>
                    <OutcomeBadge outcome={row.outcome} />
                  </td>
                  {["Dropout", "Enrolled", "Graduate"].map((label) => (
                    <td key={label}>
                      {(row.probabilities[label as keyof typeof row.probabilities] * 100).toFixed(
                        1,
                      )}
                      %
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <small className="model-hash">
        Model version: {data.model_version.slice(0, 12)} · Uncalibrated probabilities · Human review
        required
      </small>
    </section>
  );
}
