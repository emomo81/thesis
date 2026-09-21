import { NextRequest, NextResponse } from "next/server";
import { authConfigured } from "./supabase/config";
import { supabaseServer } from "./supabase/server";
export const jsonError = (error: string, status: number) =>
  NextResponse.json({ error }, { status });
export function trustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  if (process.env.APP_URL) return origin === new URL(process.env.APP_URL).origin;
  // Development only: Next normalizes nextUrl to its bind hostname. Use the
  // browser Host header for localhost and preview origins; production fails closed.
  if (process.env.NODE_ENV !== "development") return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}
export async function authenticated() {
  if (!authConfigured()) return null;
  const supabase = await supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error || !user ? null : { supabase, user };
}
export async function limitedJson(request: NextRequest, max = 1024 * 1024): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new Error("Use JSON");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Empty body");
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) {
      await reader.cancel();
      throw new Error("Body too large");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
