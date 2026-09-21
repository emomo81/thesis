import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const origin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const next =
    request.nextUrl.searchParams.get("next") === "/reset-password"
      ? "/reset-password"
      : "/dashboard";
  if (code) {
    try {
      const supabase = await supabaseServer();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, origin));
    } catch {
      /* Show an actionable error rather than a server traceback. */
    }
  }
  return NextResponse.redirect(new URL("/login?error=expired-link", origin));
}
