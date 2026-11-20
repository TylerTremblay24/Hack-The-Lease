"use client";
import type { AnchorId } from "@/lib/types";

export type Rhythm = Record<AnchorId, { days: number; late: boolean }>;

const ROWS: { id: AnchorId; label: string }[] = [
  { id: "central", label: "Central Campus" },
  { id: "north", label: "North Campus" },
  { id: "kerrytown", label: "Kerrytown" },
  { id: "medical", label: "Michigan Medicine" },
  { id: "downtown", label: "Downtown" },
];

type Props = {
  rhythm: Rhythm;
  notes: Partial<Record<AnchorId, string>>; // e.g. "ME labs + design studio" from the persona
  onChange: (id: AnchorId, next: { days: number; late: boolean }, label: string) => void;
};

/** Where you go each week and which days run late. Feeds the commute and late-night chips. */
export function RhythmEditor({ rhythm, notes, onChange }: Props) {
  const total = ROWS.reduce((a, r) => a + rhythm[r.id].days, 0);
  return (
    <section className="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm">
      <h2 className="font-semibold text-slate-100">My week</h2>
      <p className="text-xs text-slate-500">How many days you head to each place. "Late" means you get home after about 11 PM. This drives your commute and late-night walk scores.</p>
      {ROWS.map((r) => {
        const v = rhythm[r.id];
        return (
          <div key={r.id} className="space-y-0.5">
            <div className="flex items-baseline justify-between">
              <span className={v.days === 0 ? "text-slate-500" : "text-slate-200"}>{r.label}</span>
              <b className="text-slate-100">{v.days === 0 ? "not going" : `${v.days} ${v.days === 1 ? "day" : "days"}/week`}</b>
            </div>
            {notes[r.id] && v.days > 0 && <div className="text-[11px] text-slate-500">{notes[r.id]}</div>}
            <input type="range" aria-label={`${r.label} days per week`} min={0} max={7} step={1} value={v.days} className="w-full"
              onChange={(e) => {
                const days = Number(e.target.value);
                onChange(r.id, { days, late: days === 0 ? false : v.late }, days === 0 ? `You're not going to ${r.label}.` : `${r.label} ${days} ${days === 1 ? "day" : "days"} a week.`);
              }} />
            {v.days > 0 && (
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={v.late}
                  onChange={(e) => onChange(r.id, { ...v, late: e.target.checked }, e.target.checked ? `You get home late from ${r.label}.` : `You no longer get home late from ${r.label}.`)} />
                Some of those days run late
              </label>
            )}
          </div>
        );
      })}
      <p className="text-xs text-slate-500">{total} trips a week in total.</p>
    </section>
  );
}
