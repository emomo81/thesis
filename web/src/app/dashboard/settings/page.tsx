import { redirect } from "next/navigation";
import Link from "next/link";
import { authenticated } from "@/lib/api";
import { PasswordForm } from "@/components/auth-form";
import { signOut } from "@/lib/auth-actions";
import { ShieldCheck, LogOut } from "lucide-react";
export const metadata = { title: "Account settings" };
export default async function Settings() {
  const auth = await authenticated();
  if (!auth) redirect("/login");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR ACCOUNT</span>
          <h1>Make yourself at home.</h1>
          <p>Manage your sign-in and understand how your information is used.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="card">
          <h3>Account details</h3>
          <dl className="account-details">
            <dt>Display name</dt>
            <dd>{String(auth.user.user_metadata.full_name || "Researcher")}</dd>
            <dt>Email address</dt>
            <dd>{auth.user.email}</dd>
            <dt>Authentication</dt>
            <dd>
              <span className="ready-badge">
                <ShieldCheck size={15} /> Supabase Authentication
              </span>
            </dd>
          </dl>
          <form action={signOut}>
            <button className="button button-outline small">
              <LogOut size={16} /> Sign out
            </button>
          </form>
        </section>
        <section className="card">
          <h3>Change your password</h3>
          <p>Use a unique password with at least 12 characters.</p>
          <PasswordForm />
        </section>
        <section className="card settings-privacy">
          <h3>Privacy & saved results</h3>
          <p>
            You choose which prediction results are saved. Raw student inputs are not stored in
            history. You can download or permanently delete individual saved runs from the history
            page.
          </p>
          <p>
            For account deletion, contact your deployment’s administrator using their institutional
            support channel. Removing an account also removes its saved runs from the active
            database.
          </p>
          <Link href="/dashboard/history" className="text-button">
            Manage prediction history →
          </Link>
          <Link href="/privacy" className="text-button">
            Read the data-use policy →
          </Link>
        </section>
      </div>
    </>
  );
}
