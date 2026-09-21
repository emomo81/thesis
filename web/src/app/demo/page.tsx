import { AppShell } from "@/components/app-shell";
import { DemoWorkspace } from "@/components/demo-workspace";
export const metadata = { title: "Explore the sample workspace" };
export default async function Demo({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  return (
    <AppShell demo>
      <DemoWorkspace history={params.view === "history"} />
    </AppShell>
  );
}
