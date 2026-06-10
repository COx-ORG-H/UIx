import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "radix-app fixture",
  description:
    "hx-ui CI fixture (ITSMx conventions): proves @hx/tokens CSS resolution and composite compilation.",
};

// Dark convention for this fixture: data-theme="dark" on <html>.
// Light is the default (attribute absent); ThemeToggle sets/removes it client-side.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
