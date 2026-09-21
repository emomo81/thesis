import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStudentCsv, resultsCsv } from "../src/lib/csv";
import { predictRequest, modelResponse, safeCell } from "../src/lib/validation";
import { catalog } from "../src/lib/catalog";
import type { PredictionResult } from "../src/lib/types";
for (const separator of [",", ";"]) {
  test(`parses UTF-8 CSV using ${separator} and normalizes original UCI header`, () => {
    const rows = parseStudentCsv(
      `\uFEFFNacionality${separator}Age at enrollment\n1${separator}22\n`,
    );
    assert.deepEqual(rows, [{ Nationality: "1", "Age at enrollment": "22" }]);
  });
}
for (const [name, text] of [
  ["empty", ""],
  ["no records", "a,b\n"],
  ["duplicate header", "a, a\n1,2"],
  ["duplicate alias", "Nacionality,Nationality\n1,1"],
  ["ragged rows", "a,b\n1,2\n3,4,5"],
  ["too many rows", "a,b\n" + "1,2\n".repeat(251)],
  ["too many bytes", "x".repeat(256 * 1024 + 1)],
])
  test(`rejects ${name}`, () => assert.throws(() => parseStudentCsv(text)));
test("preserves quoted delimiters", () =>
  assert.equal(parseStudentCsv('a,b\n"x,y",2')[0].a, "x,y"));
test("API request caps and defaults", () => {
  const minimal = { stage: "enrollment", rows: [{ "Age at enrollment": 22 }] };
  assert.equal(predictRequest.parse(minimal).save, false);
  assert.equal(predictRequest.safeParse({ ...minimal, rows: Array(251).fill({}) }).success, false);
  assert.equal(predictRequest.safeParse({ ...minimal, stage: "madeup" }).success, false);
  assert.equal(predictRequest.safeParse({ ...minimal, user_id: "another-user" }).success, false);
  assert.equal(predictRequest.safeParse({ ...minimal, rows: [{ age: Infinity }] }).success, false);
});
test("model response validates probability totals and versions", () => {
  const result = {
    stage: "enrollment",
    model_version: catalog.enrollment.version,
    results: [
      {
        row: 1,
        outcome: "Graduate",
        probabilities: { Graduate: 0.7, Enrolled: 0.2, Dropout: 0.1 },
      },
    ],
    warnings: [],
  };
  assert.equal(modelResponse.safeParse(result).success, true);
  assert.equal(
    modelResponse.safeParse({
      ...result,
      results: [
        { ...result.results[0], probabilities: { Graduate: 0.8, Enrolled: 0.8, Dropout: 0.2 } },
      ],
    }).success,
    false,
  );
});
test("export contains results but no raw inputs", () => {
  const result: PredictionResult = {
    stage: "enrollment",
    model_version: catalog.enrollment.version,
    results: [
      {
        row: 1,
        outcome: "Graduate",
        probabilities: { Graduate: 0.7, Enrolled: 0.2, Dropout: 0.1 },
      },
    ],
    warnings: [],
  };
  const csv = resultsCsv(result);
  assert.match(csv, /P\(Dropout\)/);
  assert.doesNotMatch(csv, /Age at enrollment/);
  assert.equal(safeCell(" =1+1"), "' =1+1");
  assert.equal(safeCell("ordinary"), "ordinary");
});
test("public catalog has no future academic inputs at enrollment", () => {
  assert.equal(catalog.enrollment.features.length, 24);
  assert.equal(catalog.semester1.features.length, 30);
  assert.equal(catalog.semester2.features.length, 36);
  assert.equal(
    catalog.enrollment.features.some((f) => f.name.includes("sem (")),
    false,
  );
  assert.equal(
    catalog.semester1.features.some((f) => f.name.includes("2nd sem")),
    false,
  );
});
