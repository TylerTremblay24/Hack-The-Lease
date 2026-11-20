"use client";
import { motion } from "framer-motion";
import type { CriterionId, DecisionResult, Listing, UserPlace } from "@/lib/types";
import { criterionLabel } from "@/lib/engine/explain";
import { Icon, SectionTitle, label, panel } from "./ui";
import { Ring } from "./Ring";
import { VERDICT } from "./ChangeStrip";

const spring = { type: "spring", stiffness: 160, damping: 22 } as const;
const MEANING: Record<DecisionResult["verdict"], string> = {
  robust: "Wins clearly across the weightings that respect your order.",
  leaning: "Usually wins, but some reasonable weightings pick another.",
  "toss-up": "Close call: small changes in what you value flip it.",
  "only-option": "The only listing that passes every rule.",
  none: "Nothing passes every rule.",
};

/** Why the ranking came out this way: how often #1 wins, the weights the order implies, and what separates #1 from #2. */
export function WhyPanel({ result, listings, places, group }: { result: DecisionResult; listings: Listing[]; places: UserPlace[]; group?: boolean }) {
  const name = (id: string | null) => listings.find((l) => l.id === id)?.name ?? "";
  const win = result.evaluations.find((e) => e.listingId === result.winnerId);
  const w = (Object.entries(result.weightsROC) as [CriterionId, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const maxW = Math.max(0.0001, ...w.map(([, v]) => v));
  const maxDelta = Math.max(0.001, ...(result.whyWinner ?? []).map((d) => Math.abs(d.delta)));
  return (
    <section className={`${panel} p-4 md:p-5`}>
      <SectionTitle icon={<Icon name="bars" className="text-leader" />}>Why these results?</SectionTitle>
      {win && (
        <div className="mt-4 flex items-center gap-4 border-b border-line pb-4">
          <Ring value={win.rankAcceptability[0]} size={104} stroke={9} label={`${name(win.listingId)} is #1 in ${Math.round(win.rankAcceptability[0] * 100)}% of weightings`} />
          <div className="min-w-0">
            <div className="font-bold">{VERDICT[result.verdict]}</div>
            <p className="mt-1 text-xs text-ink-muted">{MEANING[result.verdict]} {name(win.listingId)} is #1 in this share of {result.samples.toLocaleString("en-US")} draws <span className="num">(±{(result.monteCarloSE * 100).toFixed(0)} pt)</span>.</p>
          </div>
        </div>
      )}

      {w.length > 0 && (
        <div className="mt-4">
          <div className={`${label} mb-2.5`}>{group ? "Weights the group implies" : "Weights your order implies"}</div>
          <div className="space-y-2.5">
            {w.slice(0, 8).map(([c, v]) => (
              <div key={c}>
                <div className="mb-1 flex justify-between text-xs"><span>{criterionLabel(c, places)}</span><span className="num">{Math.round(v * 100)}%</span></div>
                <div className="h-1 rounded-full bg-line"><motion.div className="h-full rounded-full bg-leader" initial={false} animate={{ width: `${(v / maxW) * 100}%` }} transition={spring} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.whyWinner && result.winnerId && result.runnerUpId && (
        <div className="mt-5">
          <div className={label}>Why #1 beats #2</div>
          <p className="mb-2.5 mt-0.5 text-xs text-ink-faint">{name(result.winnerId)} vs {name(result.runnerUpId)}</p>
          <div className="space-y-1.5">
            {result.whyWinner.map((d) => (
              <div key={d.criterion} className="grid grid-cols-[minmax(0,7.5rem)_1fr] items-center gap-2 text-xs">
                <span className="truncate text-ink-muted">{criterionLabel(d.criterion, places)}</span>
                <div className="relative h-2 rounded-sm bg-line">
                  <div className="absolute -inset-y-1 left-1/2 border-l border-line-strong" />
                  <motion.div className={`absolute h-2 rounded-sm ${d.delta >= 0 ? "left-1/2 bg-leader" : "right-1/2 bg-against"}`}
                    initial={false} animate={{ width: `${(Math.abs(d.delta) / maxDelta) * 50}%` }} transition={spring} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-micro text-ink-faint"><span>← favors #2</span><span>favors #1 →</span></div>
        </div>
      )}
    </section>
  );
}
