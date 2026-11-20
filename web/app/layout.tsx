import "./globals.css";
import type { ReactNode } from "react";
import localFont from "next/font/local";

// Self-hosted (SIL Open Font License) so the build and the demo never depend on the network.
const sans = localFont({ src: "./fonts/PlusJakartaSans-latin.woff2", weight: "200 800", variable: "--font-sans", display: "swap" });
const mono = localFont({ src: "./fonts/JetBrainsMono-latin.woff2", weight: "100 800", variable: "--font-mono", display: "swap" });

export const metadata = {
  title: "New Lease",
  description: "Find a place that fits you. Rank what matters, see how sure you can be, and what would tip the answer.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`dark ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
