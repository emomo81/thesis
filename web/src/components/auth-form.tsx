"use client";
import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, LockKeyhole } from "lucide-react";
import { authenticate, updatePassword, type AuthState } from "@/lib/auth-actions";
export function AuthForm({
  kind,
  configured,
}: {
  kind: "login" | "signup" | "forgot";
  configured: boolean;
}) {
  const [state, action, pending] = useActionState(authenticate.bind(null, kind), {} as AuthState);
  return (
    <form action={action} className="auth-form">
      {!configured && (
        <div className="notice">
          Account services aren’t connected in this preview yet.{" "}
          <Link href="/demo">Explore the sample workspace</Link> while deployment is configured.
        </div>
      )}
      {kind === "signup" && (
        <label>
          Full name
          <input
            name="name"
            placeholder="Your name"
            autoComplete="name"
            minLength={2}
            maxLength={80}
            required
          />
        </label>
      )}
      <label>
        Email address
        <input
          name="email"
          type="email"
          placeholder="you@institution.edu"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      {kind !== "forgot" && (
        <label>
          <span className="label-row">
            Password{kind === "login" && <Link href="/forgot-password">Forgot password?</Link>}
          </span>
          <input
            name="password"
            type="password"
            placeholder={kind === "signup" ? "At least 12 characters" : "Enter your password"}
            autoComplete={kind === "signup" ? "new-password" : "current-password"}
            minLength={kind === "signup" ? 12 : 1}
            maxLength={128}
            required
          />
        </label>
      )}
      {kind === "signup" && (
        <label className="check-label">
          <input name="terms" type="checkbox" required />
          <span>
            I agree to the <Link href="/privacy">privacy & responsible-use terms</Link>. I
            understand this is a research prototype.
          </span>
        </label>
      )}
      {state.error && (
        <div className="error-message" role="alert">
          {state.error}
        </div>
      )}
      {state.message && (
        <div className="success-message" role="status">
          {state.message}
        </div>
      )}
      <button className="button button-dark full" disabled={pending || !configured}>
        {pending ? (
          <LoaderCircle className="spin" size={18} />
        ) : kind === "signup" ? (
          "Create account"
        ) : kind === "forgot" ? (
          "Send reset link"
        ) : (
          "Sign in to your workspace"
        )}
        <ArrowRight size={17} />
      </button>
      <div className="auth-secure">
        <LockKeyhole size={13} /> Secured with Supabase Authentication
      </div>
    </form>
  );
}
export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, {} as AuthState);
  return (
    <form action={action} className="auth-form">
      <label>
        New password
        <input
          name="password"
          type="password"
          minLength={12}
          maxLength={128}
          required
          autoComplete="new-password"
        />
      </label>
      <label>
        Confirm new password
        <input
          name="confirm"
          type="password"
          minLength={12}
          maxLength={128}
          required
          autoComplete="new-password"
        />
      </label>
      {state.error && (
        <div role="alert" className="error-message">
          {state.error}
        </div>
      )}
      {state.message && (
        <div role="status" className="success-message">
          {state.message}
        </div>
      )}
      <button className="button button-dark" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
        <ArrowRight size={17} />
      </button>
    </form>
  );
}
