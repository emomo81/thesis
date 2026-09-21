import { NextRequest, NextResponse } from "next/server";
import { authenticated, jsonError } from "@/lib/api";
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticated();
    if (!auth) return jsonError("Sign in to view your history.", 401);
    const page = Math.max(
      0,
      Math.min(10000, Math.floor(Number(request.nextUrl.searchParams.get("page")) || 0)),
    );
    const { data, error, count } = await auth.supabase
      .from("prediction_runs")
      .select("id,created_at,stage,row_count,model_version,results,warnings", { count: "exact" })
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .range(page * 20, page * 20 + 19);
    if (error)
      return jsonError("Could not load history. Check the database connection and migration.", 503);
    return NextResponse.json(
      { runs: data, count },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return jsonError("History is temporarily unavailable.", 503);
  }
}
