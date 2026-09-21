import Link from "next/link";
import { SiteNav, Footer } from "@/components/site-nav";
export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="container section empty-state">
        <span className="eyebrow">404 · A SMALL DETOUR</span>
        <h1 className="page-title">This page isn’t here.</h1>
        <p>Let’s get you back to a clearer path.</p>
        <Link href="/" className="button button-dark">
          Back to home →
        </Link>
      </main>
      <Footer />
    </>
  );
}
