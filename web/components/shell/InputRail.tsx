"use client";
import type { ReactNode } from "react";
import { Icon, panel, type IconName } from "../ui";

export type RailTab = "week" | "places" | "rules" | "budget" | "group" | "tune";
const TABS: { id: RailTab; label: string; icon: IconName }[] = [
  { id: "week", label: "Week", icon: "week" },
  { id: "places", label: "Places", icon: "pin" },
  { id: "rules", label: "Rules", icon: "rules" },
  { id: "budget", label: "Budget", icon: "money" },
  { id: "group", label: "Roommates", icon: "group" },
  { id: "tune", label: "Assumptions", icon: "tune" },
];

/** Inputs live here, one tab at a time, so the decision stays in view. */
export function InputRail({ tab, onTab, badges, children }: { tab: RailTab; onTab: (t: RailTab) => void; badges?: Partial<Record<RailTab, ReactNode>>; children: ReactNode }) {
  return (
    <aside id="inputs" className={`${panel} self-start overflow-hidden`} aria-label="Your inputs">
      <div role="tablist" aria-label="Input sections" className="m-3 grid grid-cols-2 gap-1 rounded-ctl border border-line bg-bg p-1">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} aria-controls="rail-panel" onClick={() => onTab(t.id)}
            className={`relative flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-semibold transition-colors duration-fast ${
              tab === t.id ? "bg-surface-2 text-ink" : "text-ink-muted hover:text-ink"}`}>
            <Icon name={t.icon} size={16} className={tab === t.id ? "text-leader" : ""} />
            {t.label}
            {badges?.[t.id] && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-flip" aria-label="changed" />}
          </button>
        ))}
      </div>
      <div id="rail-panel" role="tabpanel">{children}</div>
    </aside>
  );
}
