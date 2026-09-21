import { authenticated } from "@/lib/api";
import { redirect } from "next/navigation";
import { Overview } from "@/components/overview";
import type { HistoryRun } from "@/lib/types";
export default async function Dashboard() {
  const auth = await authenticated();
  if (!auth) redirect("/login");
  const [recent, stats] = await Promise.all([
    auth.supabase
      .from("prediction_runs")
      .select("id,created_at,stage,row_count,model_version,results,warnings")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    auth.supabase.rpc("prediction_summary"),
  ]);
  return (
    <Overview
      name={String(auth.user.user_metadata.full_name || "Researcher")}
      runs={(recent.data || []) as HistoryRun[]}
      count={stats.data?.runs || 0}
      rows={stats.data?.profiles || 0}
      error={
        recent.error || stats.error
          ? "Your history could not be loaded. Check that the Supabase migration has been applied."
          : undefined
      }
    />
  );
}
