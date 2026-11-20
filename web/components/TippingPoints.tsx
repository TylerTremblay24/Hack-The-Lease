"use client";
import type { CriterionId, DecisionResult } from "@/lib/types";
import { CRITERION_LABEL } from "@/lib/engine/explain";

const KIND: Record<string, { label: string; color: string }> = {
  price: { label: "PRICE", color: "bg-sky-500/20 text-sky-300" },
  swap: { label: "PRIORITY", color: "bg-violet-500/20 text-violet-300" },
  constraint: { label: "RULE", color: "bg-amber-500/20 text-amber-300" },
};

export function TippingPoints({ result }: { result: DecisionResult }) {
  const w = (Object.entries(result.weightsROC) as [CriterionId, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  return (
    <section>
      <h2 className="mb-2 font-semibold text-slate-100">Tipping points</h2>
      {result.tippingPoints.length === 0 && <p className="text-xs text-slate-500">None at these settings. Nothing nearby would flip the top pick.</p>}
      <ul className="space-y-2">
        {result.tippingPoints.map((t, i) => (
          <li key={i} className="rounded-md border border-slate-800 bg-slate-900 p-2 text-xs text-slate-300">
            <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${KIND[t.kind].color}`}>{KIND[t.kind].label}</span>{t.text}
          </li>
        ))}
      </ul>

      <details className="mt-3 rounded-md border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400" open>
        <summary className="cursor-pointer font-semibold text-slate-200">How these numbers are calculated</summary>
        <ol className="mt-2 list-decimal space-y-2 pl-4">
          <li><b className="text-slate-200">Your order becomes weights.</b> Rank-order centroid turns your list into weights that sum to 100%, so the top chip counts most. Tied chips split their share.</li>
          <li><b className="text-slate-200">Each listing is scored 0 to 1 per priority</b> on a fixed scale (for example, cost is 1 near your target and falls to 0 at your cap; commute is 1 at zero minutes and 0 at ten hours a week), then multiplied by those weights and added up.</li>
          <li><b className="text-slate-200">Price tipping point:</b> we search (bisection) for the smallest cut in a rival's rent per person that lifts its total score above the current leader's. If no cut is enough, we say so.</li>
          <li><b className="text-slate-200">Priority tipping point:</b> we swap two neighboring chips, recompute the weights, and rescore everyone. If a different listing wins, that swap is shown.</li>
          <li><b className="text-slate-200">Rule tipping point:</b> a listing that missed one rule by a small gap is re-scored with that rule relaxed. If it would then lead, we report how much to relax.</li>
          <li><b className="text-slate-200">The % bars</b> come from {result.samples.toLocaleString()} random weight sets that all respect your order. The % is how often a listing finishes #1 (±{(result.monteCarloSE * 100).toFixed(0)} pt).</li>
        </ol>
        {w.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 text-slate-300">Weights your order implies</div>
            {w.map(([c, v]) => (
              <div key={c} className="mb-1 flex items-center gap-2">
                <span className="w-28 truncate">{CRITERION_LABEL[c]}</span>
                <div className="h-2 flex-1 rounded bg-slate-800"><div className="h-2 rounded bg-emerald-500" style={{ width: `${v * 100}%` }} /></div>
                <span className="w-8 text-right">{Math.round(v * 100)}%</span>
              </div>
            ))}
          </div>
        )}
      </details>
    </section>
  );
}
