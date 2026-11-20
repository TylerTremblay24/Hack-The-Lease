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
    <section className="space-y-4 px-4 pb-4 text-sm">
      <div>
        <p className="text-xs text-ink-muted">Days a week you head to each place. &ldquo;Late&rdquo; means home after about 11 PM. This drives your commute and late-night walk scores.</p>
      </div>
      {ROWS.map((r) => {
        const v = rhythm[r.id];
        return (
          <div key={r.id}>
            <div className="flex items-baseline justify-between gap-2">
              <span className={v.days === 0 ? "text-ink-faint" : "font-semibold text-ink"}>{r.label}</span>
              <span className={`num text-xs ${v.days === 0 ? "text-ink-faint" : "text-ink"}`}>{v.days === 0 ? "not going" : `${v.days} ${v.days === 1 ? "day" : "days"}/wk`}</span>
            </div>
            {notes[r.id] && v.days > 0 && <div className="text-xs text-ink-faint">{notes[r.id]}</div>}
            <div className="mt-1 flex items-center gap-2">
              <input type="range" className="slider min-w-0 flex-1" aria-label={`${r.label} days per week`} min={0} max={7} step={1} value={v.days}
                onChange={(e) => {
                  const days = Number(e.target.value);
                  onChange(r.id, { days, late: days === 0 ? false : v.late }, days === 0 ? `You're not going to ${r.label}.` : `${r.label} ${days} ${days === 1 ? "day" : "days"} a week.`);
                }} />
              <button disabled={v.days === 0} aria-pressed={v.late} title="Some of those days run late"
                onClick={() => onChange(r.id, { ...v, late: !v.late }, !v.late ? `You get home late from ${r.label}.` : `You no longer get home late from ${r.label}.`)}
                className={`rounded-full border px-2 py-0.5 font-mono text-micro font-semibold transition-colors duration-fast disabled:opacity-30 ${
                  v.late ? "border-flip/50 bg-flip/10 text-flip" : "border-line-strong text-ink-faint hover:text-ink"}`}>
                LATE
              </button>
            </div>
          </div>
        );
      })}
      <p className="border-t border-line pt-3 text-xs text-ink-faint"><span className="num text-ink">{total}</span> trips a week in total. Press LATE on places where some days run past 11 PM.</p>
    </section>
  );
}
