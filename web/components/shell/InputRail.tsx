"use client";
import type { ReactNode } from "react";
import { Disclosure } from "../Disclosure";
import { label, panel, type IconName } from "../ui";

export type RailTab = "week" | "rules" | "budget" | "group" | "tune";
export interface RailSection { id: RailTab; title: string; icon: IconName; summary: ReactNode; changed?: boolean; content: ReactNode }

/** Your situation as an accordion: each section shows a one-line summary while closed, one opens at a time. */
export function InputRail({ open, onOpen, sections }: { open: RailTab | null; onOpen: (t: RailTab | null) => void; sections: RailSection[] }) {
  return (
    <aside id="inputs" className={`${panel} scroll-mt-4 self-start overflow-hidden`} aria-label="Your situation">
      <div className={`${label} px-4 pb-1 pt-4`}>Your situation</div>
      {sections.map((s) => (
        <Disclosure key={s.id} variant="row" icon={s.icon} title={s.title} summary={s.summary} dot={s.changed}
          open={open === s.id} onOpenChange={(o) => onOpen(o ? s.id : null)} className="border-t border-line first-of-type:border-t-0">
          {s.content}
        </Disclosure>
      ))}
    </aside>
  );
}
