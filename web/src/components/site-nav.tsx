import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";
import { Brand } from "./brand";
export function SiteNav() {
  return (
    <header className="site-header">
      <div className="container nav-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#features">Features</Link>
          <Link href="/model">The model</Link>
        </nav>
        <div className="nav-actions">
          <Link href="/login" className="login-link">
            Log in
          </Link>
          <Link href="/signup" className="button button-dark small">
            Get started <ArrowUpRight size={16} />
          </Link>
        </div>
        <details className="mobile-nav">
          <summary aria-label="Open navigation">
            <Menu />
          </summary>
          <nav>
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/#features">Features</Link>
            <Link href="/model">The model</Link>
            <Link href="/login">Log in</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer container">
      <div>
        <Brand />
        <p>Better insight. Human-centered support.</p>
      </div>
      <div className="footer-links">
        <Link href="/model">Model & limitations</Link>
        <Link href="/privacy">Privacy & responsible use</Link>
        <a href="https://doi.org/10.24432/C5MC89" target="_blank" rel="noreferrer">
          Dataset source ↗
        </a>
      </div>
      <small>© {new Date().getFullYear()} Academa. A research prototype.</small>
    </footer>
  );
}
