"use client";
import type { CriterionId, DecisionResult, Listing, ListingEvaluation, UserPlace } from "@/lib/types";
import { criterionLabel } from "@/lib/engine/explain";

type Col = { listing: Listing; ev: ListingEvaluation };
type Row = { label: string; cells: (string | number)[]; nums?: (number | null)[]; better?: "lower" | "higher" };

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

type Props = { cols: Col[]; result: DecisionResult; places: UserPlace[]; hasLate: boolean; onUnpin: (id: string) => void };

/** Side-by-side for the listings you pinned. The best value in each row is highlighted. */
export function CompareView({ cols, result, places, hasLate, onUnpin }: Props) {
  if (cols.length === 0) return null;
  const num = (f: (c: Col) => number) => cols.map(f);
  const rows: Row[] = [
    { label: "Chance of finishing #1", cells: cols.map((c) => (c.ev.feasible ? `${Math.round(c.ev.rankAcceptability[0] * 100)}%` : "out")), nums: cols.map((c) => (c.ev.feasible ? c.ev.rankAcceptability[0] : null)), better: "higher" },
    { label: "True cost per person", cells: cols.map((c) => `${usd(c.ev.cost.effective.mid)} (${usd(c.ev.cost.effective.lo)}-${usd(c.ev.cost.effective.hi)})`), nums: num((c) => c.ev.cost.effective.mid), better: "lower" },
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
    <section className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm">
      <h2 className="mb-2 font-semibold text-slate-100">Compare ({cols.length} of 3 pinned)</h2>
      <table className="w-full min-w-[420px] border-collapse text-left">
        <thead>
          <tr>
            <th className="w-40" />
            {cols.map((c) => (
              <th key={c.listing.id} className="px-2 pb-2 align-top font-semibold text-slate-100">
                {c.listing.name}
                <div className="text-[11px] font-normal text-slate-500">{c.listing.neighborhood}</div>
                <button onClick={() => onUnpin(c.listing.id)} className="text-[11px] font-normal text-slate-500 underline hover:text-rose-400">unpin</button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-slate-800">
              <td className="py-1 pr-2 text-xs text-slate-400">{r.label}</td>
              {r.cells.map((cell, i) => (
                <td key={i} className={`px-2 py-1 ${best(r, i) ? "font-semibold text-emerald-300" : "text-slate-300"}`}>{cell}</td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-slate-800">
            <td className="py-1 pr-2 align-top text-xs text-slate-400">Strongest for you</td>
            {cols.map((c) => <td key={c.listing.id} className="px-2 py-1 text-xs text-slate-300">{c.ev.feasible ? topReasons(c.ev).join(", ") || "none stand out" : "n/a"}</td>)}
          </tr>
          <tr className="border-t border-slate-800">
            <td className="py-1 pr-2 align-top text-xs text-slate-400">What would flip it</td>
            {cols.map((c) => {
              const tips = result.tippingPoints.filter((t) => t.listingId === c.listing.id);
              return (
                <td key={c.listing.id} className="px-2 py-1 align-top text-xs text-slate-400">
                  {!c.ev.feasible ? c.ev.eliminatedBecause.map((x) => x.text).join("; ") : tips.length ? tips.map((t, i) => <div key={i} className="mb-1">{t.text}</div>) : "Nothing nearby changes its rank."}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-slate-500">Listings and travel times are synthetic or estimated. Green marks the best value in a row.</p>
    </section>
  );
}
