import { AuthPage } from "@/components/auth-page";
export const metadata = { title: "Create account" };
export default function Signup() {
  return <AuthPage kind="signup" />;
}
