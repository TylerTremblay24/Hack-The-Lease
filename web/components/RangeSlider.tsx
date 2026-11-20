"use client";

type Props = { label: string; min: number; max: number; value: [number, number]; onChange: (v: [number, number]) => void; unit?: string; step?: number; format?: (n: number) => string };

/** Two-thumb slider: pick a low and a high value. Equal values mean "exactly this".
 *  If both thumbs overlap, dragging either one pulls the other end apart instead of getting stuck. */
export function RangeSlider({ label, min, max, value, onChange, unit, step = 1, format = String }: Props) {
  const [lo, hi] = value;
  const pct = (x: number) => ((x - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-1 flex justify-between">
        <span>{label}</span>
        <b className="text-slate-100">{lo === hi ? format(lo) : `${format(lo)} to ${format(hi)}`}{unit ? ` ${unit}` : ""}</b>
      </div>
      <div className="range2 relative h-5">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded bg-slate-700" />
        <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-emerald-500" style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }} />
        <input type="range" aria-label={`${label} minimum`} min={min} max={max} step={step} value={lo}
          onChange={(e) => { const v = Number(e.target.value); onChange(v > hi ? [lo, v] : [v, hi]); }} />
        <input type="range" aria-label={`${label} maximum`} min={min} max={max} step={step} value={hi}
          onChange={(e) => { const v = Number(e.target.value); onChange(v < lo ? [v, hi] : [lo, v]); }} />
      </div>
    </div>
  );
}
