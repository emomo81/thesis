import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Academa — A clearer view of student outcomes", template: "%s · Academa" },
  description:
    "A research-informed workspace for predicting student academic outcomes. Understand model estimates, review results, and keep people at the center.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
