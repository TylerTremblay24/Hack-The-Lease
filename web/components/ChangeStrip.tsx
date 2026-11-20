import type { DecisionResult, Listing } from "@/lib/types";

type Props = { what: string | null; diff: { listingId: string; before: number | null; after: number | null }[]; prev: DecisionResult | null; result: DecisionResult; listings: Listing[]; onUndo?: () => void };

export const VERDICT: Record<DecisionResult["verdict"], string> = {
  robust: "Robust pick", leaning: "Leaning", "toss-up": "Toss-up", "only-option": "Only option", none: "Nothing fits",
};

/** Names the edit and lists whose #1 share moved >= 2 points. Pinned until the next edit. */
export function ChangeStrip({ what, diff, prev, result, listings, onUndo }: Props) {
  if (!what || !prev) return <div className="h-12 border-b border-slate-800 bg-slate-900/60 px-6 py-3 text-sm text-slate-500">Change anything on the left. This strip shows what moved.</div>;
  const name = (id: string) => listings.find((l) => l.id === id)?.name ?? id;
  const pct = (x: number | null) => (x == null ? "out" : `${Math.round(x * 100)}%`);
  return (
    <div className="flex items-center gap-4 border-b border-amber-500/30 bg-amber-500/10 px-6 py-3 text-sm">
      <span className="font-semibold text-amber-200">▶ {what}</span>
      <span className="flex flex-wrap gap-x-4 text-slate-300">
        {diff.length === 0 && <span>No listing moved by 2 points or more.</span>}
        {diff.slice(0, 4).map((d) => (
          <span key={d.listingId}>{name(d.listingId)} {pct(d.before)} → <b className="text-slate-100">{pct(d.after)}</b></span>
        ))}
      </span>
      {prev.verdict !== result.verdict && <span className="rounded bg-slate-800 px-2 py-0.5">{VERDICT[prev.verdict]} → <b>{VERDICT[result.verdict]}</b></span>}
      {onUndo && <button onClick={onUndo} className="ml-auto text-amber-200 underline">Undo</button>}
    </div>
  );
}
