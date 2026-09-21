import { AuthPage } from "@/components/auth-page";
export const metadata = { title: "Sign in" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  return <AuthPage kind="login" expired={params.error === "expired-link"} />;
}
