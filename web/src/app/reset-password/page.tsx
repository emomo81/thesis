import Link from "next/link";
import { redirect } from "next/navigation";
import { authenticated } from "@/lib/api";
import { SiteNav, Footer } from "@/components/site-nav";
import { PasswordForm } from "@/components/auth-form";
export default async function Reset() {
  if (!(await authenticated())) redirect("/forgot-password");
  return (
    <>
      <SiteNav />
      <main className="container narrow section">
        <span className="eyebrow">ACCOUNT RECOVERY</span>
        <h1 className="page-title">Choose a new password.</h1>
        <PasswordForm />
        <Link href="/dashboard" className="text-button">
          Return to your workspace →
        </Link>
      </main>
      <Footer />
    </>
  );
}
