"use client";
import { AnimatePresence, motion } from "framer-motion";
import type { DecisionResult, Listing } from "@/lib/types";
import { Icon } from "./ui";

type Props = { what: string | null; diff: { listingId: string; before: number | null; after: number | null }[]; prev: DecisionResult | null; result: DecisionResult; listings: Listing[]; onUndo?: () => void };

export const VERDICT: Record<DecisionResult["verdict"], string> = {
  robust: "Robust pick", leaning: "Leaning", "toss-up": "Toss-up", "only-option": "Only option", none: "Nothing fits",
};

/** Sits under the balance: names the edit and lists whose #1 share moved by 2 points or more. Pinned until the next edit. */
export function ChangeStrip({ what, diff, prev, result, listings, onUndo }: Props) {
  const name = (id: string) => listings.find((l) => l.id === id)?.name ?? id;
  const pct = (x: number | null) => (x == null ? "out" : `${Math.round(x * 100)}%`);
  const live = !!(what && prev);
  return (
    <div className={`flex min-h-12 flex-wrap items-center gap-x-4 gap-y-1 rounded-ctl border px-4 py-2.5 text-sm transition-colors duration-base ${
      live ? "border-flip/35 bg-flip/10" : "border-line bg-surface/60"}`} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={live ? what : "idle"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }} className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
          {!live ? (
            <span className="text-ink-muted">Drag a priority, tick a rule or apply a tipping point. The balance moves and this line says what changed.</span>
          ) : (
            <>
              <span className="font-semibold text-flip">▸ {what}</span>
              <span className="flex flex-wrap gap-x-4 text-ink-muted">
                {diff.length === 0 && <span>No listing moved by 2 points or more.</span>}
                {diff.slice(0, 4).map((d) => (
                  <span key={d.listingId}>{name(d.listingId)} <span className="num">{pct(d.before)}</span> → <b className="num text-ink">{pct(d.after)}</b></span>
                ))}
              </span>
              {prev!.verdict !== result.verdict && (
                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs">{VERDICT[prev!.verdict]} → <b className="text-ink">{VERDICT[result.verdict]}</b></span>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
      {onUndo && (
        <button onClick={onUndo} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-flip/40 px-3 py-1 text-xs font-semibold text-flip transition-colors duration-fast hover:bg-flip/10">
          <Icon name="undo" size={14} /> Undo
        </button>
      )}
    </div>
  );
}
