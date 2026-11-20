"use client";
import type { Assumptions } from "@/lib/types";
import { Badge, label, linkBtn } from "./ui";

export type TuneKey =
  | "weeklyCommuteZeroAt" | "lateNightBest" | "lateNightWorst" | "spaceWorst" | "spaceBest"
  | "groceryBest" | "groceryWorst" | "costFloorShareOfTarget" | "busTimeSpread";
export type Tune = Partial<Record<TuneKey, number>>;

interface Def { key: TuneKey; label: string; min: number; max: number; step: number; fmt?: (n: number) => string; help: string }
const mins = (n: number) => `${n} min`;
const DEFS: Def[] = [
  { key: "costFloorShareOfTarget", label: "Cost scores full marks at", min: 0.5, max: 1, step: 0.01, fmt: (n) => `${Math.round(n * 100)}% of target`, help: "Cost value is 1 at this share of your target and falls to 0 at your cap." },
  { key: "weeklyCommuteZeroAt", label: "Commute scores 0 at", min: 240, max: 1200, step: 30, fmt: (n) => `${n} min/week`, help: "Commute value is 1 at zero minutes and 0 here." },
  { key: "lateNightBest", label: "Late walk home is ideal at", min: 0, max: 15, step: 1, fmt: mins, help: "Late-night value is 1 at or under this walk." },
  { key: "lateNightWorst", label: "Late walk home scores 0 at", min: 20, max: 60, step: 1, fmt: mins, help: "Late-night value is 0 at or over this walk." },
  { key: "spaceWorst", label: "Space scores 0 at", min: 100, max: 400, step: 10, fmt: (n) => `${n} sq ft/person`, help: "Space value is 0 at or under this." },
  { key: "spaceBest", label: "Space scores full at", min: 400, max: 800, step: 10, fmt: (n) => `${n} sq ft/person`, help: "Space value is 1 at or over this." },
  { key: "groceryBest", label: "Groceries ideal at", min: 0, max: 15, step: 1, fmt: mins, help: "Grocery value is 1 at or under this walk." },
  { key: "groceryWorst", label: "Groceries score 0 at", min: 20, max: 45, step: 1, fmt: mins, help: "Grocery value is 0 at or over this walk." },
  { key: "busTimeSpread", label: "Bus time uncertainty", min: 0, max: 0.5, step: 0.05, fmt: (n) => `±${Math.round(n * 100)}%`, help: "When data uncertainty is on, bus times are drawn within this range." },
];

type Props = { base: Assumptions; tune: Tune; onTune: (k: TuneKey, v: number, label: string) => void; onReset: () => void };

export function valueOf(base: Assumptions, tune: Tune, k: TuneKey): number {
  return tune[k] ?? (k === "busTimeSpread" ? base.busTimeSpread : base.anchors[k]);
}

/** Every number that shapes a score, in one place. Change one and the ranking updates; reset puts them back. */
export function AssumptionsDrawer({ base, tune, onTune, onReset }: Props) {
  const changed = Object.keys(tune).length;
  const u = base.utilitiesPerUnit;
  const range = (r: { lo: number; hi: number }) => `$${r.lo}-${r.hi}`;
  return (
    <section className="space-y-4 p-4 text-sm">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold">Assumptions</h3>
        <Badge kind="est">ESTIMATE</Badge>
        {changed > 0 && <span className="ml-auto font-mono text-micro text-flip">{changed} CHANGED</span>}
      </div>
      <p className="text-xs text-ink-muted">These are our estimates, not facts. Change any of them to see if the answer holds. Scales are fixed, so adding a listing never changes another listing&apos;s score.</p>
      <div className="space-y-3">
        {DEFS.map((d) => {
          const v = valueOf(base, tune, d.key);
          const fmt = d.fmt ?? String;
          return (
            <label key={d.key} className="block" title={d.help}>
              <div className="flex justify-between gap-2 text-xs"><span className="text-ink-muted">{d.label}</span><b className={`num font-medium ${tune[d.key] != null ? "text-flip" : "text-ink"}`}>{fmt(v)}</b></div>
              <input type="range" className="slider w-full" min={d.min} max={d.max} step={d.step} value={v}
                onChange={(e) => onTune(d.key, Number(e.target.value), `${d.label} ${fmt(Number(e.target.value))}.`)} />
            </label>
          );
        })}
      </div>
      {changed > 0 && <button onClick={onReset} className={linkBtn}>Reset all to defaults</button>}
      <div className="space-y-1.5 border-t border-line pt-3 text-xs text-ink-muted">
        <div className={label}>Fixed in the model (read only)</div>
        <p>Utilities per unit: electric {range(u.electric.base)}, heat {range(u.heat.base)}, water {range(u.water.base)}, internet {range(u.internet.base)} a month, plus per bedroom. Shown as low to high ranges.</p>
        <p>Sublet recovery for unused months: {Math.round(base.subletRecovery.lo * 100)}% to {Math.round(base.subletRecovery.hi * 100)}% of rent.</p>
        <p>Walk to your places: straight-line distance × 1.3 for streets at 80 meters a minute. Full marks at 3 minutes or less, zero at 25 or more.</p>
        <p>Late-night trips count walking only. Laundry: in-unit 1, in-building 0.6, none 0.</p>
      </div>
    </section>
  );
}
