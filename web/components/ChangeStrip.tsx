"use client";
import { AnimatePresence, motion } from "framer-motion";
import type { DecisionResult, Listing } from "@/lib/types";
import { Icon } from "./ui";

type Props = { what: string | null; diff: { listingId: string; before: number | null; after: number | null }[]; prev: DecisionResult | null; result: DecisionResult; listings: Listing[]; onUndo?: () => void };

export const VERDICT: Record<DecisionResult["verdict"], string> = {
  robust: "Robust pick", leaning: "Leaning", "toss-up": "Toss-up", "only-option": "Only option", none: "Nothing fits",
};

/** Lives under the balance: names the last edit and whose #1 share moved by 2 points or more, with Undo.
 *  Fixed height, so nothing below it jumps while a chip is being dragged. */
export function ChangeStrip({ what, diff, prev, result, listings, onUndo }: Props) {
  const name = (id: string) => listings.find((l) => l.id === id)?.name ?? id;
  const pct = (x: number | null) => (x == null ? "out" : `${Math.round(x * 100)}`);
  const live = !!(what && prev);
  const moves = [
    ...diff.slice(0, 3).map((d) => `${name(d.listingId)} ${pct(d.before)}→${pct(d.after)}%`),
    ...(live && prev!.verdict !== result.verdict ? [`${VERDICT[prev!.verdict]} → ${VERDICT[result.verdict]}`] : []),
  ];
  return (
    <div className="flex min-h-11 items-center gap-3" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={live ? what : "idle"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }} className="min-w-0 flex-1">
          {live ? (
            <>
              <div className="truncate text-sm font-semibold text-flip" title={what!}>▸ {what}</div>
              <div className="truncate font-mono text-micro text-ink-muted" title={moves.join(" · ")}>
                {moves.length ? moves.join(" · ") : "No listing moved by 2 points or more."}
              </div>
            </>
          ) : (
            <div className="text-xs text-ink-faint">Drag a chip, tick a rule or pull a lever, and watch it tip.</div>
          )}
        </motion.div>
      </AnimatePresence>
      {onUndo && (
        <button onClick={onUndo} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-flip/40 px-2.5 py-1 text-xs font-semibold text-flip transition-colors duration-fast hover:bg-flip/10">
          <Icon name="undo" size={14} /> Undo
        </button>
      )}
    </div>
  );
}
