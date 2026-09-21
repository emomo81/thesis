import type { Outcome } from "@/lib/types";
const labels: Outcome[] = ["Graduate", "Enrolled", "Dropout"];
export function Probabilities({ probabilities }: { probabilities: Record<Outcome, number> }) {
  return (
    <div className="probabilities">
      {labels.map((label) => (
        <div className="probability" key={label}>
          <div>
            <span>
              <i className={`dot ${label.toLowerCase()}`} />
              {label}
            </span>
            <strong>{(probabilities[label] * 100).toFixed(1)}%</strong>
          </div>
          <div className="bar-track">
            <div
              className={`bar-fill ${label.toLowerCase()}`}
              style={{ width: `${probabilities[label] * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
export function OutcomeBadge({ outcome }: { outcome: string }) {
  return (
    <span className={`outcome-badge ${outcome.toLowerCase()}`}>
      <i className="dot" />
      {outcome}
    </span>
  );
}
