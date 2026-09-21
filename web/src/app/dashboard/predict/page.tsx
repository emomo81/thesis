import { PredictionWorkspace } from "@/components/prediction-workspace";
export const metadata = { title: "New prediction" };
export default async function Predict({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  return <PredictionWorkspace initialMode={(await searchParams).mode} />;
}
