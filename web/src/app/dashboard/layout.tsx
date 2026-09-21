import { redirect } from "next/navigation";
import { authenticated } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = await authenticated();
  if (!auth) redirect("/login");
  const name = String(auth.user.user_metadata.full_name || "Researcher");
  return (
    <AppShell name={name} email={auth.user.email}>
      {children}
    </AppShell>
  );
}
