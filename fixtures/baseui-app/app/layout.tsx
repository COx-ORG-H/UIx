import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "baseui-app fixture",
  description:
    "uix CI fixture (DASHx conventions): @uix/tokens CSS resolution + composite compilation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Dark convention (mirrors DASHx): ThemeToggle sets/removes the `dark`
  // class on <html>, so hydration of this attribute must not be strict.
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
