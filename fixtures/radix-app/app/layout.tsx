import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Load the real Geist typeface (token default) via next/font; globals.css
// points --uix-font-sans/--uix-font-mono at these variables inside the
// @uix-overrides fence.
const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "radix-app fixture",
  description:
    "uix CI fixture (ITSMx conventions): proves @uix/tokens CSS resolution and composite compilation.",
};

// Dark convention for this fixture: data-theme="dark" on <html>.
// Light is the default (attribute absent); ThemeToggle sets/removes it client-side.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
