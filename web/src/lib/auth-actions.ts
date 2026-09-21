"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
import { authConfigured } from "./supabase/config";
import { z } from "zod";
export type AuthState = { error?: string; message?: string };
function siteUrl() {
  const value = process.env.APP_URL;
  if (!value) throw new Error("Set APP_URL before enabling authentication.");
  return new URL(value).origin;
}
export async function authenticate(
  kind: string,
  _state: AuthState,
  form: FormData,
): Promise<AuthState> {
  if (!authConfigured())
    return {
      error:
        "Account services are not connected yet. Connect Supabase using the deployment guide, or explore the sample workspace.",
    };
  const email = z.email().safeParse(String(form.get("email") || "").trim());
  if (!email.success) return { error: "Enter a valid email address." };
  const password = String(form.get("password") || "");
  if (
    kind !== "forgot" &&
    (password.length < (kind === "signup" ? 12 : 1) || password.length > 128)
  )
    return {
      error:
        kind === "signup"
          ? "Use a password between 12 and 128 characters."
          : "Enter your password.",
    };
  let destination = "";
  try {
    const supabase = await supabaseServer();
    if (kind === "signup") {
      const name = String(form.get("name") || "").trim();
      if (name.length < 2 || name.length > 80 || form.get("terms") !== "on")
        return { error: "Enter your name and accept the responsible-use terms." };
      const { data, error } = await supabase.auth.signUp({
        email: email.data,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${siteUrl()}/auth/callback`,
        },
      });
      if (error)
        return { error: "We couldn't create the account. Check your details and try again later." };
      if (data.session) destination = "/dashboard";
      else
        return {
          message:
            "Check your inbox for a confirmation link. If this email already has an account, sign in or reset your password.",
        };
    } else if (kind === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
        redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
      });
      if (error)
        return { error: "We couldn't send a recovery link right now. Please try again later." };
      return {
        message:
          "If this email has an account, a password reset link is on its way. Check your inbox.",
      };
    } else if (kind === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
      if (error)
        return {
          error:
            "Unable to sign in. Check your email and password, and confirm your email address.",
        };
      destination = "/dashboard";
    } else return { error: "Unsupported account action." };
  } catch {
    return {
      error: "Account services are unavailable. Check deployment configuration or try again later.",
    };
  }
  redirect(destination);
}
export async function signOut() {
  if (authConfigured()) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
export async function updatePassword(_state: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") || "");
  if (password.length < 12 || password.length > 128)
    return { error: "Use between 12 and 128 characters." };
  if (password !== form.get("confirm")) return { error: "Passwords do not match." };
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Your link or session expired. Request a new password reset link." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error)
      return {
        error:
          "Password could not be updated. Try a different password or request a new reset link.",
      };
    return { message: "Password updated. You can now return to your workspace." };
  } catch {
    return { error: "Account services are unavailable. Try again later." };
  }
}
