"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Disclosure } from "./Disclosure";
import type { DecisionResult, TippingPoint, UserPlace } from "@/lib/types";
import { Icon, SectionTitle, btnFlip, panel } from "./ui";
import { mateDot } from "./GroupPanel";

const KIND: Record<TippingPoint["kind"], string> = { price: "PRICE LEVER", swap: "PRIORITY LEVER", constraint: "RULE LEVER" };
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

type Props = { result: DecisionResult; places?: UserPlace[]; onApply?: (t: TippingPoint) => void; members?: { id: string; name: string }[] };

/** Each tipping point is a lever: what kind it is, the change, and (where the page can make the change) Apply. */
export function TippingPoints({ result, onApply, members = [] }: Props) {
  const [all, setAll] = useState(false);
  // Collapsed, show the first lever plus the first one the page can Apply, so a one-click change is always in view.
  const tps = result.tippingPoints;
  const firstApply = tps.findIndex((t) => t.apply && onApply);
  const keep = new Set([0, firstApply > 0 ? firstApply : 1]);
  const shown = all ? tps : tps.filter((_, i) => keep.has(i));
  const more = tps.length - tps.filter((_, i) => keep.has(i)).length;
  return (
    <section className={`${panel} p-4 md:p-5`}>
      <SectionTitle icon={<Icon name="lever" className="text-flip" />}>Tipping points</SectionTitle>
      <p className="mt-1 text-xs text-ink-muted">The smallest changes that would flip your pick.</p>
      {result.tippingPoints.length === 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-line-strong p-3 text-xs text-ink-muted">None at these settings. Nothing nearby would flip the top pick.</p>
      )}
      <ul className="mt-3 space-y-2.5">
        <AnimatePresence initial={false}>
          {shown.map((t) => {
            const who = t.apply && "member" in t.apply ? members.findIndex((m) => m.id === (t.apply as { member: string }).member) : -1;
            const applicable = !!(t.apply && onApply);
            return (
              <motion.li key={t.text} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                className={`rounded-xl border p-3 ${applicable ? "border-flip/35 bg-flip/5" : "border-line bg-surface-2"}`}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="font-mono text-micro font-semibold text-flip">{KIND[t.kind]}</span>
                  {who >= 0 && <span className="flex items-center gap-1 text-xs text-ink-muted"><span className={`h-2 w-2 rounded-full ${mateDot(who)}`} />{members[who].name}</span>}
                  {t.kind === "price" && t.amount != null && <span className="num ml-auto text-lg font-semibold text-flip">−{usd(t.amount)}<span className="text-xs">/mo</span></span>}
                  {applicable && <button onClick={() => onApply!(t)} className={`${btnFlip} ml-auto`}>Apply</button>}
                </div>
                <p className="text-sm text-ink">{t.text}</p>
                {t.kind === "price" && <p className="mt-1 text-xs text-ink-faint">A rent negotiation, not a setting.</p>}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {more > 0 && (
        <button onClick={() => setAll((a) => !a)} aria-expanded={all} className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full border border-line-strong py-1.5 text-xs font-semibold text-ink-muted transition-colors duration-fast hover:text-ink">
          {all ? "Show fewer" : `Show ${more} more ${more === 1 ? "lever" : "levers"}`}<Icon name="chevron" size={12} className={`transition-transform duration-base ${all ? "-rotate-90" : "rotate-90"}`} />
        </button>
      )}

      <Disclosure title="How these numbers are calculated" className="mt-4 rounded-xl border border-dashed border-line-strong p-3 text-xs text-ink-muted">
        <ol className="mt-3 list-decimal space-y-2 pl-4 leading-relaxed">
          <li><b className="text-ink">Your order becomes weights.</b> Rank-order centroid turns your list into weights that sum to 100%, so the top chip counts most. Tied chips split their share.</li>
          <li><b className="text-ink">Each listing is scored 0 to 1 per priority</b> on a fixed scale (for example, cost is 1 near your target and falls to 0 at your cap; commute is 1 at zero minutes and 0 at ten hours a week), then multiplied by those weights and added up.</li>
          <li><b className="text-ink">Price tipping point:</b> we search (bisection) for the smallest cut in a rival&apos;s rent per person that lifts its total score above the current leader&apos;s. If no cut is enough, we say so.</li>
          <li><b className="text-ink">Priority tipping point:</b> we swap two neighboring chips, recompute the weights, and rescore everyone. If a different listing wins, that swap is shown.</li>
          <li><b className="text-ink">Rule tipping point:</b> a listing that missed one rule by a small gap is re-scored with that rule relaxed. If it would then lead, we report how much to relax.</li>
          <li><b className="text-ink">The % bars</b> come from {result.samples.toLocaleString("en-US")} random weight sets that all respect your order. The % is how often a listing finishes #1 (±{(result.monteCarloSE * 100).toFixed(0)} pt).</li>
        </ol>
      </Disclosure>
    </section>
  );
}
