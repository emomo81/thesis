export type Stage = "enrollment" | "semester1" | "semester2";
export type Outcome = "Dropout" | "Enrolled" | "Graduate";
export type Prediction = { row: number; outcome: Outcome; probabilities: Record<Outcome, number> };
export type PredictionResult = {
  stage: Stage;
  model_version: string;
  results: Prediction[];
  warnings: string[];
  saved?: boolean;
  saveError?: string;
  id?: string;
};
export type Field = {
  name: string;
  description: string;
  group: string;
  kind: string;
  default: number;
  observed_min: number;
  observed_max: number;
  min?: number;
  max?: number;
  options?: number[];
  labels: Record<string, string>;
};
export type ModelInfo = {
  label: string;
  features: Field[];
  version: string;
  estimator: string;
  accuracy: number;
  macroF1: number;
};
export type HistoryRun = {
  id: string;
  created_at: string;
  stage: Stage;
  row_count: number;
  model_version: string;
  results: Prediction[];
  warnings: string[];
};
