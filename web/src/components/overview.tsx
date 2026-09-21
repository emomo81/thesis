import Link from "next/link";
import {
  ArrowUpRight,
  ScanLine,
  FileSpreadsheet,
  ChevronRight,
  History,
  Layers3,
  Users,
  BookmarkCheck,
  Sparkles,
} from "lucide-react";
import { OutcomeBadge } from "./probabilities";
import { stages, stageLabels, catalog } from "@/lib/catalog";
import type { HistoryRun } from "@/lib/types";
export function Overview({
  name,
  runs,
  count,
  rows,
  error,
  demo = false,
}: {
  name: string;
  runs: HistoryRun[];
  count: number;
  rows: number;
  error?: string;
  demo?: boolean;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR INSIGHT WORKSPACE</span>
          <h1>
            {demo ? "A little insight. A clearer picture." : `Welcome, ${name.split(" ")[0]}.`}
          </h1>
          <p>Explore academic outcomes. Keep the bigger picture in mind.</p>
        </div>
        <Link className="button button-dark" href={demo ? "/signup" : "/dashboard/predict"}>
          <span>+</span> New prediction
        </Link>
      </div>
      {error && (
        <div role="alert" className="error-message">
          {error}
        </div>
      )}
      <div className="summary-grid">
        <div className="stat-card">
          <div>
            <span>Saved prediction runs</span>
            <BookmarkCheck size={19} />
          </div>
          <strong>{error ? "—" : count.toLocaleString()}</strong>
          <small>
            {demo ? "Synthetic examples for this preview" : "Results you chose to keep"}
          </small>
        </div>
        <div className="stat-card">
          <div>
            <span>Profiles in saved results</span>
            <Users size={19} />
          </div>
          <strong>{error ? "—" : rows.toLocaleString()}</strong>
          <small>Across individual and batch runs</small>
        </div>
        <div className="stat-card">
          <div>
            <span>Prediction stages</span>
            <Layers3 size={19} />
          </div>
          <strong>
            3<span className="stat-tag">READY</span>
          </strong>
          <small>Enrollment through second semester</small>
        </div>
      </div>
      <div className="workspace-two-col">
        <section className="get-started-card">
          <span className="eyebrow">
            <Sparkles size={13} /> TURN INFORMATION INTO PERSPECTIVE
          </span>
          <h2>
            Ready for your
            <br />
            next prediction?
          </h2>
          <p>Choose a stage, review the details, and let the packaged model do the rest.</p>
          <div className="prediction-shortcuts">
            <Link href={demo ? "/signup" : "/dashboard/predict"}>
              <span>
                <ScanLine size={22} />
              </span>
              <div>
                <strong>Single student</strong>
                <small>Enter a profile with guided inputs</small>
              </div>
              <ArrowUpRight size={19} />
            </Link>
            <Link href={demo ? "/signup" : "/dashboard/predict?mode=batch"}>
              <span>
                <FileSpreadsheet size={22} />
              </span>
              <div>
                <strong>Batch prediction</strong>
                <small>Upload a CSV · Up to 250 profiles</small>
              </div>
              <ArrowUpRight size={19} />
            </Link>
          </div>
        </section>
        <section className="card stages-card">
          <div className="card-heading">
            <h3>The right model for the moment</h3>
            <Layers3 size={18} />
          </div>
          <p>Use only information the student has already generated.</p>
          {stages.map((stage, index) => (
            <div className="stage-summary" key={stage}>
              <span>0{index + 1}</span>
              <div>
                <strong>{stageLabels[stage]}</strong>
                <small>
                  {catalog[stage].features.length} inputs ·{" "}
                  {(catalog[stage].accuracy * 100).toFixed(1)}% held-out accuracy
                </small>
              </div>
              <i className="status-dot" />
            </div>
          ))}
          <Link href="/model" className="text-button">
            See evaluation & limitations <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>
      <section className="card recent-card">
        <div className="card-heading">
          <div>
            <h3>Recent predictions</h3>
            <p>
              {demo
                ? "Illustrative results from synthetic profiles"
                : "Your most recently saved results"}
            </p>
          </div>
          <Link href={demo ? "/demo?view=history" : "/dashboard/history"} className="text-button">
            View history <ChevronRight size={16} />
          </Link>
        </div>
        {runs.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Prediction</th>
                  <th>Stage</th>
                  <th>Profiles</th>
                  <th>Outcome</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run, index) => (
                  <tr key={run.id}>
                    <td>
                      <span className="table-icon">
                        <ScanLine size={15} />
                      </span>
                      {demo ? `Sample profile ${index + 1}` : `Run ${run.id.slice(0, 8)}`}
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
                      {demo
                        ? "Example"
                        : new Date(run.created_at).toLocaleDateString("en", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            timeZone: "UTC",
                          })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <span>
              <History size={29} />
            </span>
            <h3>A fresh start.</h3>
            <p>
              Your saved predictions will appear here.
              <br />
              Make a prediction and choose to save its results.
            </p>
            <Link href="/dashboard/predict" className="text-button">
              Make your first prediction <ArrowRightIcon />
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
function ArrowRightIcon() {
  return <ChevronRight size={16} />;
}
