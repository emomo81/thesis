import data from "./model-catalog.json";
import type { ModelInfo, Stage } from "./types";
export const catalog = data as Record<Stage, ModelInfo>;
export const stages: Stage[] = ["enrollment", "semester1", "semester2"];
export const stageLabels: Record<Stage, string> = {
  enrollment: "At enrollment",
  semester1: "After 1st semester",
  semester2: "After 2nd semester",
};
export const outcomeColors = { Graduate: "#43986b", Enrolled: "#bd8c38", Dropout: "#cd6464" };
