import { NextRequest, NextResponse } from "next/server";
import { authenticated, jsonError, trustedOrigin } from "@/lib/api";
import { z } from "zod";
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!trustedOrigin(request)) return jsonError("Untrusted request origin.", 403);
  try {
    const auth = await authenticated();
    if (!auth) return jsonError("Sign in to manage your history.", 401);
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) return jsonError("Invalid prediction ID.", 400);
    const { data, error } = await auth.supabase
      .from("prediction_runs")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select("id");
    if (error) return jsonError("Could not delete this prediction.", 503);
    if (!data.length) return jsonError("Prediction not found.", 404);
    return NextResponse.json({ deleted: true });
  } catch {
    return jsonError("History is temporarily unavailable.", 503);
  }
}
