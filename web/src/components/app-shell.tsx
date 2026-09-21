"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScanLine,
  History,
  Settings2,
  LogOut,
  ArrowUpRight,
  BookOpen,
  ShieldCheck,
  CircleHelp,
} from "lucide-react";
import { Brand } from "./brand";
import { signOut } from "@/lib/auth-actions";
export function AppShell({
  children,
  name = "Your workspace",
  email,
  demo = false,
}: {
  children: React.ReactNode;
  name?: string;
  email?: string;
  demo?: boolean;
}) {
  const path = usePathname();
  const links = [
    { href: demo ? "/demo" : "/dashboard", label: "Overview", Icon: LayoutDashboard },
    { href: demo ? "/signup" : "/dashboard/predict", label: "New prediction", Icon: ScanLine },
    {
      href: demo ? "/demo?view=history" : "/dashboard/history",
      label: "Prediction history",
      Icon: History,
    },
    { href: "/model", label: "Model information", Icon: BookOpen },
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">
          <span className="workspace-icon">A</span>
          <div>
            <strong>{demo ? "Sample workspace" : "My workspace"}</strong>
            <small>{demo ? "Interactive product preview" : "Student outcome research"}</small>
          </div>
        </div>
        <span className="sidebar-section">WORKSPACE</span>
        <nav className="sidebar-nav">
          {links.map(({ href, label, Icon }) => (
            <Link key={label} href={href} className={path === href ? "active" : ""}>
              <Icon size={18} />
              {label}
              {label === "New prediction" && <span className="nav-plus">+</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="small-icon">
            <ShieldCheck size={21} />
          </span>
          <strong>Perspective, not certainty.</strong>
          <p>Use predictions alongside human judgment and local context.</p>
          <Link href="/model">
            Understand the model <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <Link href={demo ? "/signup" : "/dashboard/settings"}>
            <Settings2 size={18} /> Account settings
          </Link>
          <Link href="/privacy">
            <CircleHelp size={18} /> Privacy & responsible use
          </Link>
          {!demo && (
            <form action={signOut}>
              <button>
                <LogOut size={17} /> Sign out
              </button>
            </form>
          )}
        </div>
        <div className="sidebar-person">
          <div className="avatar">{demo ? "D" : name.charAt(0).toUpperCase()}</div>
          <div>
            <strong>{demo ? "Demo visitor" : name}</strong>
            <small>{demo ? "No account required" : email}</small>
          </div>
        </div>
      </aside>
      <div className="app-content">
        <header className="app-topbar">
          <div>
            <span className="topbar-dot" />
            {demo ? "Product preview" : "Student insight workspace"}
            <span className="topbar-divider">/</span>
            <strong>Academic outcomes</strong>
          </div>
          {demo ? (
            <Link href="/signup" className="button button-dark small">
              Create account <ArrowUpRight size={15} />
            </Link>
          ) : (
            <Link
              href="/dashboard/settings"
              className="account-chip"
              aria-label="Open account settings"
            >
              {name.charAt(0).toUpperCase()}
            </Link>
          )}
        </header>
        {demo && (
          <div className="demo-banner">
            You’re exploring sample data. These are precomputed predictions for synthetic
            profiles—not live student records. <Link href="/signup">Create your workspace →</Link>
          </div>
        )}
        <main className="workspace-main">{children}</main>
        <footer className="workspace-footer">
          <span>Academa · Research prototype</span>
          <Link href="/privacy">Privacy & responsible use</Link>
        </footer>
      </div>
    </div>
  );
}
