import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Tipping Point", description: "How sure should you be about your apartment pick?" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-900 px-6 py-3">
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          <span className="font-semibold text-slate-100">Tipping Point</span>
          <span className="text-xs text-slate-500">Rank by your priorities. See what would flip the answer.</span>
        </header>
        {children}
        <footer className="px-6 py-4 text-xs text-slate-500">
          Demo data: listings are synthetic. Costs and travel times are estimates with ranges.
        </footer>
      </body>
    </html>
  );
}
