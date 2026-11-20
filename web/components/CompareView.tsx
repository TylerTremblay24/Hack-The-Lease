"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { CriterionId, DecisionResult, Listing, ListingEvaluation, UserPlace } from "@/lib/types";
import { criterionLabel } from "@/lib/engine/explain";
import { Badge, Icon, label } from "./ui";

type Col = { listing: Listing; ev: ListingEvaluation };
type Row = { label: string; cells: (string | number)[]; nums?: (number | null)[]; better?: "lower" | "higher" };

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

type Props = { open: boolean; onClose: () => void; cols: Col[]; result: DecisionResult; places: UserPlace[]; hasLate: boolean; onUnpin: (id: string) => void };

/** Side-by-side for the listings you pinned, in a slide-over drawer. The best value in each row is highlighted. */
export function CompareView({ open, onClose, cols, result, places, hasLate, onUnpin }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  const num = (f: (c: Col) => number) => cols.map(f);
  const rows: Row[] = [
    { label: "Chance of finishing #1", cells: cols.map((c) => (c.ev.feasible ? `${Math.round(c.ev.rankAcceptability[0] * 100)}%` : "out")), nums: cols.map((c) => (c.ev.feasible ? c.ev.rankAcceptability[0] : null)), better: "higher" },
    { label: "True cost per person", cells: cols.map((c) => `${usd(c.ev.cost.effective.mid)} (${usd(c.ev.cost.effective.lo)}–${usd(c.ev.cost.effective.hi)})`), nums: num((c) => c.ev.cost.effective.mid), better: "lower" },
    { label: "Commute (min/week)", cells: cols.map((c) => Math.round(c.ev.raw.commute)), nums: num((c) => c.ev.raw.commute), better: "lower" },
    ...(hasLate ? [{ label: "Walk home late (min)", cells: cols.map((c) => Math.round(c.ev.raw.lateNight)), nums: num((c) => c.ev.raw.lateNight), better: "lower" as const }] : []),
    { label: "Laundry", cells: cols.map((c) => ({ in_unit: "In unit", in_building: "In building", none: "None" })[c.listing.laundry]), nums: num((c) => c.ev.raw.laundry), better: "higher" },
    { label: "Space per person (sq ft)", cells: cols.map((c) => Math.round(c.ev.raw.space)), nums: num((c) => c.ev.raw.space), better: "higher" },
    { label: "Bathrooms per person", cells: cols.map((c) => c.ev.raw.bathroom.toFixed(2)), nums: num((c) => c.ev.raw.bathroom), better: "higher" },
    { label: "Noise (1 quiet, 5 loud)", cells: cols.map((c) => c.listing.noiseLevel), nums: num((c) => c.listing.noiseLevel), better: "lower" },
    { label: "Grocery walk (min)", cells: cols.map((c) => c.listing.groceryWalkMin), nums: num((c) => c.listing.groceryWalkMin), better: "lower" },
    { label: "Parking", cells: cols.map((c) => (c.listing.parking.available ? `Yes, ${usd(c.listing.parking.monthly)}/mo` : "No")), nums: num((c) => (c.listing.parking.available ? 1 : 0)), better: "higher" },
    { label: "Lease (months)", cells: cols.map((c) => c.listing.leaseMonths) },
    ...places.map((p) => ({
      label: `Walk to ${p.name} (min)`,
      cells: cols.map((c) => Math.round(c.ev.raw[`place:${p.id}`])),
      nums: num((c) => c.ev.raw[`place:${p.id}`]),
      better: "lower" as const,
    })),
  ];

  // The three criteria that add the most to this listing's score at your weights.
  const topReasons = (ev: ListingEvaluation) =>
    (Object.entries(result.weightsROC) as [CriterionId, number][])
      .map(([c, w]) => [c, w * (ev.value[c] ?? 0)] as const)
      .sort((a, b) => b[1] - a[1]).slice(0, 3).filter((x) => x[1] > 0.005).map(([c]) => criterionLabel(c, places));

  const best = (r: Row, i: number) => {
    if (!r.nums || !r.better || cols.length < 2) return false;
    const vals = r.nums.filter((x): x is number => x != null);
    if (vals.length < 2) return false;
    const target = r.better === "lower" ? Math.min(...vals) : Math.max(...vals);
    return r.nums[i] === target && vals.filter((v) => v === target).length < vals.length;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="scrim" className="fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
          <motion.aside key="drawer" role="dialog" aria-modal="true" aria-label="Compare pinned listings"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col border-l border-line-strong bg-surface shadow-e2"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}>
            <header className="flex items-center gap-3 border-b border-line px-5 py-4">
              <Icon name="compare" className="text-leader" />
              <h2 className="text-base font-bold">Compare</h2>
              <span className={label}>{cols.length} of 3 pinned</span>
              <button ref={closeRef} onClick={onClose} aria-label="Close compare" className="ml-auto grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink">
                <Icon name="close" size={16} />
              </button>
            </header>
            <div className="flex-1 overflow-auto p-5">
              {cols.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">
                  Nothing pinned yet. Press <b className="text-ink">Compare</b> on up to three listings to see them side by side.
                </div>
              ) : (
                <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
                  <thead>
                    <tr>
                      <th className="w-44" />
                      {cols.map((c) => (
                        <th key={c.listing.id} className="px-2 pb-3 align-top font-semibold">
                          {c.listing.name}
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-normal text-ink-muted">
                            {c.listing.neighborhood}
                            {c.listing.source ? <Badge kind="web">WEB</Badge> : <Badge kind="synth">SYNTHETIC</Badge>}
                          </div>
                          <button onClick={() => onUnpin(c.listing.id)} className="mt-1 text-xs font-normal text-ink-faint underline hover:text-against">unpin</button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.label} className="border-t border-line">
                        <td className="py-2 pr-2 text-xs text-ink-muted">{r.label}</td>
                        {r.cells.map((cell, i) => (
                          <td key={i} className={`num px-2 py-2 ${best(r, i) ? "rounded bg-leader/10 font-semibold text-leader" : "text-ink"}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                    <tr className="border-t border-line">
                      <td className="py-2 pr-2 align-top text-xs text-ink-muted">Strongest for you</td>
                      {cols.map((c) => <td key={c.listing.id} className="px-2 py-2 align-top text-xs">{c.ev.feasible ? topReasons(c.ev).join(", ") || "none stand out" : "n/a"}</td>)}
                    </tr>
                    <tr className="border-t border-line">
                      <td className="py-2 pr-2 align-top text-xs text-ink-muted">What would flip it</td>
                      {cols.map((c) => {
                        const tips = result.tippingPoints.filter((t) => t.listingId === c.listing.id);
                        return (
                          <td key={c.listing.id} className="px-2 py-2 align-top text-xs text-ink-muted">
                            {!c.ev.feasible ? c.ev.eliminatedBecause.map((x) => x.text).join("; ") : tips.length ? tips.map((t, i) => <div key={i} className="mb-1 text-flip">{t.text}</div>) : "Nothing nearby changes its rank."}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              )}
              <p className="mt-4 text-xs text-ink-faint">Listings are synthetic or collected from public pages; travel times are estimated. Green marks the best value in a row.</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
