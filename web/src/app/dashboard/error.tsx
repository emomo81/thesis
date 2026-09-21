"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="card empty-state">
      <h2>Your workspace couldn’t load.</h2>
      <p>
        Please check your connection or try again. If this continues, contact your deployment
        administrator.
      </p>
      <button onClick={reset} className="button button-dark">
        Try again
      </button>
    </div>
  );
}
