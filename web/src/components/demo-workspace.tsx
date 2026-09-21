"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FlaskConical } from "lucide-react";
import { Overview } from "./overview";
import { Probabilities, OutcomeBadge } from "./probabilities";
import examples from "@/lib/demo-results.json";
import { catalog } from "@/lib/catalog";
import type { HistoryRun, Outcome } from "@/lib/types";
export function DemoWorkspace({ history = false }: { history?: boolean }) {
  const [selected, setSelected] = useState(0);
  const example = examples[selected];
  const runs: HistoryRun[] = examples.map((s, i) => ({
    id: `sample-${i}`,
    created_at: "2026-09-14",
    stage: "semester2",
    row_count: 1,
    model_version: catalog.semester2.version,
    warnings: [],
    results: [{ row: 1, outcome: s.outcome as Outcome, probabilities: s.probabilities }],
  }));
  return (
    <>
      {history ? (
        <>
          <div className="page-heading">
            <div>
              <span className="eyebrow">SAMPLE HISTORY</span>
              <h1>A place to revisit your results.</h1>
              <p>These three runs are synthetic examples, not saved account records.</p>
            </div>
          </div>
          <div className="card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Example</th>
                    <th>Stage</th>
                    <th>Outcome</th>
                    <th>Dropout estimate</th>
                  </tr>
                </thead>
                <tbody>
                  {examples.map((e) => (
                    <tr key={e.label}>
                      <td>{e.label}</td>
                      <td>After 2nd semester</td>
                      <td>
                        <OutcomeBadge outcome={e.outcome} />
                      </td>
                      <td>{(e.probabilities.Dropout * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <Overview name="Demo" runs={runs} count={3} rows={3} demo />
      )}
      <section className="card demo-explorer">
        <div>
          <span className="eyebrow">
            <FlaskConical size={14} /> EXPLORE A SYNTHETIC EXAMPLE
          </span>
          <h2>
            Different information.
            <br />
            Different estimates.
          </h2>
          <p>
            Switch between three prepared profiles to see their actual packaged-model predictions.
            Other inputs use training defaults. This preview does not run new predictions.
          </p>
          <label>
            Example profile
            <select value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
              {examples.map((e, i) => (
                <option key={e.label} value={i}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
          <div className="demo-profile-values">
            <span>
              Units approved <strong>{example.approved}/6</strong>
            </span>
            <span>
              Semester grade <strong>{example.grade}/20</strong>
            </span>
          </div>
          <Link href="/signup" className="text-button">
            Use your own profiles after sign-in <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="demo-result">
          <span className="eyebrow">PREDICTED OUTCOME</span>
          <h2>{example.outcome}</h2>
          <Probabilities probabilities={example.probabilities} />
          <small>After 2nd semester · Research estimate, not a guarantee</small>
        </div>
      </section>
    </>
  );
}
