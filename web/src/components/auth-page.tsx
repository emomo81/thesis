import Link from "next/link";
import { ArrowLeft, Sparkles, ShieldCheck, Check } from "lucide-react";
import { Brand } from "./brand";
import { AuthForm } from "./auth-form";
import { authConfigured } from "@/lib/supabase/config";
export function AuthPage({
  kind,
  expired = false,
}: {
  kind: "login" | "signup" | "forgot";
  expired?: boolean;
}) {
  const text =
    kind === "signup"
      ? {
          eyebrow: "LET’S GET YOU STARTED",
          title: "A space for better insight.",
          description: "Create your account and start exploring student outcomes.",
        }
      : kind === "forgot"
        ? {
            eyebrow: "LET’S GET YOU BACK IN",
            title: "Forgot your password?",
            description: "Enter your email and we’ll send a secure reset link.",
          }
        : {
            eyebrow: "YOUR WORKSPACE AWAITS",
            title: "Good to see you again.",
            description: "Sign in to continue where you left off.",
          };
  return (
    <div className="auth-layout">
      <aside className="auth-panel">
        <Brand light />
        <div className="auth-panel-copy">
          <span className="eyebrow">
            <Sparkles size={14} /> INSIGHT WITH PERSPECTIVE
          </span>
          <h1>
            Understand
            <br />
            the possibilities.
            <br />
            <em>
              Support
              <br />
              the person.
            </em>
          </h1>
          <p>
            A thoughtful workspace for student outcome predictions. Built on research. Guided by
            people.
          </p>
          <div className="auth-panel-list">
            <span>
              <Check size={17} /> Three prediction stages
            </span>
            <span>
              <Check size={17} /> Individual & batch predictions
            </span>
            <span>
              <Check size={17} /> Private, downloadable results
            </span>
          </div>
        </div>
        <div className="auth-panel-footer">
          <ShieldCheck size={17} /> Decision support. Never a decision-maker.
        </div>
      </aside>
      <main className="auth-main">
        <Link className="back-link" href="/">
          <ArrowLeft size={16} /> Back to home
        </Link>
        <div className="auth-box">
          <span className="eyebrow">{text.eyebrow}</span>
          <h2>{text.title}</h2>
          <p>{text.description}</p>
          {expired && (
            <div className="error-message">
              That confirmation link expired or was already used. Sign in, or request a new password
              reset link.
            </div>
          )}
          <AuthForm kind={kind} configured={authConfigured()} />
          <p className="auth-switch">
            {kind === "login" ? (
              <>
                New to Academa? <Link href="/signup">Create an account</Link>
              </>
            ) : (
              <>
                Already have an account? <Link href="/login">Sign in</Link>
              </>
            )}
          </p>
        </div>
        <div className="auth-bottom">
          <span>© {new Date().getFullYear()} Academa</span>
          <Link href="/privacy">Privacy & responsible use</Link>
        </div>
      </main>
    </div>
  );
}
