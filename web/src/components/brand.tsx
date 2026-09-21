import Link from "next/link";
import { GraduationCap } from "lucide-react";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link className={`brand ${light ? "brand-light" : ""}`} href="/" aria-label="Academa home">
      <span className="brand-mark">
        <GraduationCap size={24} strokeWidth={1.8} />
      </span>
      academa<span className="brand-dot">.</span>
    </Link>
  );
}
