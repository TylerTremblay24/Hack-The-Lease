type Props = { shares: number[]; prevFirst?: number | null };

/** Stacked #1 / #2 / #3 share, with a dashed tick where #1 used to be. */
export function AcceptabilityBar({ shares, prevFirst }: Props) {
  const [a, b, c] = shares.map((s) => Math.round(s * 100));
  return (
    <div>
      <div className="relative flex h-3 w-full overflow-hidden rounded bg-slate-200">
        <div className="bg-emerald-600" style={{ width: `${a}%` }} title={`#1 in ${a}% of draws`} />
        <div className="bg-emerald-400" style={{ width: `${b}%` }} title={`#2 in ${b}%`} />
        <div className="bg-emerald-200" style={{ width: `${c}%` }} title={`#3 in ${c}%`} />
        {prevFirst != null && (
          <div className="absolute top-0 h-3 border-l-2 border-dashed border-slate-800" style={{ left: `${Math.round(prevFirst * 100)}%` }} />
        )}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-600">
        <span><b>#1 in {a}%</b>{prevFirst != null && Math.abs(prevFirst * 100 - a) >= 2 ? ` (was ${Math.round(prevFirst * 100)}%)` : ""}</span>
        <span>#2 {b}% · #3 {c}%</span>
      </div>
    </div>
  );
}
