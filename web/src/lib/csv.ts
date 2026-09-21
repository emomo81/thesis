import Papa from "papaparse";
import type { HistoryRun, PredictionResult } from "./types";
import { safeCell } from "./validation";
export function parseStudentCsv(text: string) {
  if (new TextEncoder().encode(text).length > 256 * 1024)
    throw new Error("Upload a CSV of at most 256 KB.");
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
    delimitersToGuess: [",", ";"],
  });
  if (parsed.errors.length)
    throw new Error("Could not read the CSV. Check commas/semicolons, quotes, and UTF-8 encoding.");
  if (parsed.data.length < 2) throw new Error("Include a header and at least one student row.");
  const headers = parsed.data[0].map((h) =>
    h.trim() === "Nacionality" ? "Nationality" : h.trim(),
  );
  if (headers.some((h) => !h) || new Set(headers).size !== headers.length)
    throw new Error("Column names must be non-empty and unique.");
  const values = parsed.data.slice(1);
  if (values.length > 250) throw new Error("Upload at most 250 profiles per batch.");
  return values.map((row, i) => {
    if (row.length !== headers.length)
      throw new Error(`Student row ${i + 1} has ${row.length} fields; expected ${headers.length}.`);
    return Object.fromEntries(headers.map((name, index) => [name, row[index]]));
  });
}
export function resultsCsv(
  data: Pick<PredictionResult, "stage" | "results" | "model_version"> | HistoryRun,
) {
  return (
    "\uFEFF" +
    Papa.unparse(
      data.results
        .map((row) => ({
          "Student row": row.row,
          "Prediction stage": data.stage,
          "Predicted outcome": row.outcome,
          "P(Dropout)": row.probabilities.Dropout,
          "P(Enrolled)": row.probabilities.Enrolled,
          "P(Graduate)": row.probabilities.Graduate,
          "Model version": data.model_version,
        }))
        .map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([k, v]) => [k, typeof v === "string" ? safeCell(v) : v]),
          ),
        ),
    )
  );
}
export function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
