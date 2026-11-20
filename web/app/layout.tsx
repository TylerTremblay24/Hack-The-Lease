import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Tipping Point", description: "How sure should you be about your apartment pick?" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white px-6 py-3 font-semibold">Tipping Point</header>
        {children}
        <footer className="px-6 py-4 text-xs text-slate-500">
          Demo data: listings are synthetic. Costs and travel times are estimates with ranges.
        </footer>
      </body>
    </html>
  );
}
