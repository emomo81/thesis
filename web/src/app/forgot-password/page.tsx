import { AuthPage } from "@/components/auth-page";
export const metadata = { title: "Reset password" };
export default function Forgot() {
  return <AuthPage kind="forgot" />;
}
