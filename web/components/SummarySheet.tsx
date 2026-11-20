"use client";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { CriterionId, DecisionResult, Listing, UserPlace } from "@/lib/types";
import type { GroupExtras } from "@/lib/engine/group";
import { criterionLabel } from "@/lib/engine/explain";
import type { Story } from "@/lib/story";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const LAUNDRY = { in_unit: "In unit", in_building: "In building", none: "None" } as const;
const SRC: Record<string, string> = { osm: "OpenStreetMap, confirmed by you", claude: "Claude estimate, confirmed by you", manual: "entered by you", list: "built-in list (approximate)" };

interface Props {
  story: Story; result: DecisionResult; listings: Listing[]; places: UserPlace[]; extra?: GroupExtras | null;
  who: string; budgetText: string; onClose: () => void;
}

/** A printable one-page summary. "Print or save as PDF" uses the browser, so there is no upload and no server. */
export function SummarySheet({ story, result, listings, places, extra, who, budgetText, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  const name = (id: string) => listings.find((l) => l.id === id)?.name ?? id;
  const top = result.evaluations.filter((e) => e.feasible).slice(0, 3);
  const weights = (Object.entries(result.weightsROC) as [CriterionId, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const tips = result.tippingPoints.slice(0, 3);
  const used = [...new Set(places.map((p) => SRC[p.source ?? "list"]))];
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return createPortal(
    <div id="summary-sheet" className="fixed inset-0 z-50 overflow-auto bg-slate-200 p-4 text-slate-900">
      <div className="no-print mx-auto mb-3 flex max-w-[8.5in] items-center justify-between rounded bg-slate-900 px-3 py-2 text-sm text-slate-100">
        <span>One-page summary. Use "Print" and choose "Save as PDF".</span>
        <span className="flex gap-2">
          <button onClick={() => window.print()} className="rounded bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950">Print or save as PDF</button>
          <button onClick={onClose} className="rounded border border-slate-600 px-3 py-1 text-xs">Close</button>
        </span>
      </div>
      <article className="sheet mx-auto max-w-[8.5in] bg-white p-8 text-[11px] leading-snug shadow">
        <header className="flex items-baseline justify-between border-b-2 border-slate-900 pb-1">
          <h1 className="text-lg font-bold">Tipping Point: apartment summary</h1>
          <span className="text-slate-500">{date}</span>
        </header>
        <p className="mt-1 text-slate-600">{who}. Budget {budgetText}. <b>All listings are SYNTHETIC demo data.</b></p>

        <h2 className="mt-3 text-sm font-bold">{story.headline}</h2>
        <p className="text-slate-700">{story.confidence}</p>
        {story.group && <p className="text-slate-700">{story.group}</p>}

        <h3 className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Why it fits you</h3>
        <ol className="mt-1 space-y-1.5">
          {story.lines.map((l) => (
            <li key={l.criterion}>
              <b>#{l.rank} {l.label}:</b> {l.fact}. <span className="text-slate-500">({l.tone === "strong" ? "strong" : l.tone === "ok" ? "okay" : "weak"})</span>
              {l.quote && <div className="ml-3 border-l-2 border-slate-300 pl-2 italic text-slate-600">"{l.quote}"</div>}
            </li>
          ))}
        </ol>
        {story.tradeoff && <p className="mt-1.5 text-slate-700">{story.tradeoff}</p>}

        <h3 className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Top {top.length} side by side</h3>
        <table className="mt-1 w-full border-collapse text-left">
          <thead><tr className="border-b border-slate-400"><th className="py-0.5 pr-2" />{top.map((e) => <th key={e.listingId} className="px-1 py-0.5">{name(e.listingId)}</th>)}</tr></thead>
          <tbody>
            {([
              ["Chance of #1", (e: typeof top[number]) => `${Math.round(e.rankAcceptability[0] * 100)}%`],
              ["True cost per person", (e) => `${usd(e.cost.effective.mid)} (${usd(e.cost.effective.lo)}-${usd(e.cost.effective.hi)})`],
              ["Commute, min per week", (e) => `${Math.round(e.raw.commute)}`],
              ["Laundry", (e) => LAUNDRY[listings.find((l) => l.id === e.listingId)!.laundry]],
              ["Space per person", (e) => `${Math.round(e.raw.space)} sq ft`],
              ["Noise (1 quiet, 5 loud)", (e) => `${listings.find((l) => l.id === e.listingId)!.noiseLevel}`],
              ...places.slice(0, 3).map((p) => [`Walk to ${p.name}`, (e: typeof top[number]) => `${Math.round(e.raw[`place:${p.id}`])} min`] as const),
            ] as [string, (e: typeof top[number]) => string][]).map(([label, f]) => (
              <tr key={label} className="border-b border-slate-200"><td className="py-0.5 pr-2 text-slate-600">{label}</td>{top.map((e) => <td key={e.listingId} className="px-1 py-0.5">{f(e)}</td>)}</tr>
            ))}
          </tbody>
        </table>

        {extra && (
          <>
            <h3 className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Roommates (score out of 100)</h3>
            <table className="mt-1 w-full border-collapse text-left">
              <thead><tr className="border-b border-slate-400"><th className="py-0.5 pr-2" />{extra.members.map((m) => <th key={m.id} className="px-1 py-0.5">{m.name}</th>)}</tr></thead>
              <tbody>
                {top.map((e) => (
                  <tr key={e.listingId} className="border-b border-slate-200"><td className="py-0.5 pr-2">{name(e.listingId)}</td>
                    {extra.members.map((m) => <td key={m.id} className="px-1 py-0.5">{Math.round(extra.memberScores[e.listingId][m.id] * 100)}</td>)}</tr>
                ))}
              </tbody>
            </table>
            {extra.disagreements.length > 0 && <p className="mt-1 text-slate-700">Biggest splits: {extra.disagreements.map((d) => `${criterionLabel(d.criterion, places)} (${d.high.name} vs ${d.low.name})`).join("; ")}.</p>}
          </>
        )}

        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">What would change the answer</h3>
            <ul className="mt-1 list-disc space-y-1 pl-4">{tips.length ? tips.map((t, i) => <li key={i}>{t.text}</li>) : <li>Nothing nearby flips the top pick.</li>}</ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{extra ? "Weights the group implies" : "Weights your order implies"}</h3>
            <ul className="mt-1 space-y-0.5">{weights.map(([c, v]) => <li key={c} className="flex justify-between"><span>{criterionLabel(c, places)}</span><b>{Math.round(v * 100)}%</b></li>)}</ul>
          </div>
        </div>

        <h3 className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">How to read this, and sources</h3>
        <p className="text-slate-600">
          Your ranking becomes weights (rank-order centroid). Each listing is scored 0 to 1 per priority on a fixed scale, then {result.samples.toLocaleString("en-US")} random weight sets that all respect your
          order are tried (SMAA-2). "Chance of #1" is how often a listing wins. {story.caveats.join(" ")} Costs include rent, bills, parking and fees per person with ranges.
          {used.length > 0 && ` Your places came from: ${used.join("; ")}.`} No demographic data is collected or inferred; nothing leaves your browser except a place search sent to OpenStreetMap.
        </p>
      </article>
    </div>,
    document.body,
  );
}
