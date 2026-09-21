import { NextRequest, NextResponse } from "next/server";
import { authenticated, jsonError, limitedJson, trustedOrigin } from "@/lib/api";
import { predictRequest, modelResponse } from "@/lib/validation";
import { catalog } from "@/lib/catalog";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  if (!trustedOrigin(request)) return jsonError("Untrusted request origin.", 403);
  try {
    const auth = await authenticated();
    if (!auth) return jsonError("Sign in to make a prediction.", 401);
    let body;
    try {
      body = predictRequest.parse(await limitedJson(request));
    } catch {
      return jsonError(
        "Use a valid prediction stage and 1–250 complete profiles. Maximum request size: 1 MB.",
        400,
      );
    }
    const url = process.env.MODEL_API_URL;
    const key = process.env.MODEL_API_KEY;
    if (
      !url ||
      !key ||
      key.length < 32 ||
      (process.env.NODE_ENV === "production" && !url.startsWith("https://"))
    )
      return jsonError(
        "The model service has not been connected. Ask your administrator to complete deployment setup.",
        503,
      );
    const { data: allowed, error: quotaError } = await auth.supabase.rpc(
      "consume_prediction_quota",
      { requested_rows: body.rows.length },
    );
    if (quotaError)
      return jsonError(
        "Prediction storage is not ready. Apply the Supabase database migration.",
        503,
      );
    if (!allowed)
      return jsonError(
        "Hourly prediction limit reached (30 runs or 3,000 rows). Please try again later.",
        429,
      );
    let response: Response;
    try {
      response = await fetch(`${url.replace(/\/$/, "")}/v1/predict`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Model-Api-Key": key },
        body: JSON.stringify({ stage: body.stage, rows: body.rows }),
        signal: AbortSignal.timeout(45000),
      });
    } catch {
      return jsonError(
        "The model service did not respond. It may be starting up; please try again shortly.",
        503,
      );
    }
    if (!response.ok) {
      if (response.status === 422) {
        const invalid = await response.json();
        return jsonError(
          typeof invalid.detail === "string" ? invalid.detail : "Check your student inputs.",
          422,
        );
      }
      return jsonError("The prediction service is unavailable. Please try again later.", 503);
    }
    const parsed = modelResponse.safeParse(await response.json());
    if (
      !parsed.success ||
      parsed.data.stage !== body.stage ||
      parsed.data.results.length !== body.rows.length ||
      parsed.data.model_version !== catalog[body.stage].version
    )
      return jsonError(
        "Model response and website schema do not match. Ask your administrator to update both deployments.",
        502,
      );
    const result = parsed.data;
    let id: string | undefined;
    let saveError: string | undefined;
    if (body.save) {
      const { data, error } = await auth.supabase
        .from("prediction_runs")
        .insert({
          user_id: auth.user.id,
          stage: result.stage,
          row_count: result.results.length,
          model_version: result.model_version,
          results: result.results,
          warnings: result.warnings,
        })
        .select("id")
        .single();
      if (error)
        saveError =
          "Prediction succeeded, but history could not be saved. Download these results before leaving.";
      else id = data.id;
    }
    return NextResponse.json(
      { ...result, saved: Boolean(id), id, saveError },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return jsonError("Unable to process this request. Please try again later.", 503);
  }
}
