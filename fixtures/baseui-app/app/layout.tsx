import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Load the real Geist typeface (token default) via next/font; globals.css
// points --uix-font-sans/--uix-font-mono at these variables inside the
// @uix-overrides fence.
const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
