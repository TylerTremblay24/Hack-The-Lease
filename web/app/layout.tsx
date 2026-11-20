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
          <span className="mr-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold">SYNTHETIC</span>made-up listings and personas for the demo.{" "}
          <span className="mr-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold">ESTIMATE</span>costs, travel and walking times are ranges we modeled.{" "}
          <span className="mr-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold">USER</span>something you entered.{" "}
          <span className="mr-1 rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">CLAUDE ESTIMATE</span>a place location Claude proposed and you confirmed.
        </footer>
      </body>
    </html>
  );
}
