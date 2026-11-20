"use client";
import { useMemo, useState } from "react";
import { ASSUMPTIONS, LISTINGS, PERSONAS } from "@/lib/seed";
import { useDecision } from "@/lib/useDecision";
import { CRITERION_LABEL } from "@/lib/engine/explain";
import type { CriterionId, StudentProfile } from "@/lib/types";
import { PriorityChips } from "@/components/PriorityChips";
import { ChangeStrip, VERDICT } from "@/components/ChangeStrip";
import { ListingCard } from "@/components/ListingCard";

interface State { persona: number; tiers: CriterionId[][]; cap: number; away: boolean; laundryReq: boolean; dataU: boolean }
const init = (persona: number): State => ({
  persona, tiers: PERSONAS[persona].priorities, cap: PERSONAS[persona].budget.capMonthly, away: false, laundryReq: false, dataU: true,
});
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export default function Decide() {
  const [s, setS] = useState<State>(init(0));
  const [history, setHistory] = useState<State[]>([]);
  const [what, setWhat] = useState<string | null>(null);

  const base = PERSONAS[s.persona];
  const profile: StudentProfile = useMemo(() => ({
    ...base,
    priorities: s.tiers,
    budget: { ...base.budget, capMonthly: s.cap },
    monthsNeeded: s.away ? 8 : base.monthsNeeded,
    hardConstraints: { ...base.hardConstraints, inUnitLaundryRequired: s.laundryReq || undefined },
  }), [base, s]);

  const { result, prev, diff } = useDecision(profile, LISTINGS, ASSUMPTIONS, s.dataU);
  const prevFirst = (id: string) => prev?.evaluations.find((e) => e.listingId === id)?.rankAcceptability[0] ?? null;

  function edit(next: Partial<State>, label: string) {
    setHistory((h) => [...h, s]);
    setS({ ...s, ...next });
    setWhat(label);
  }
  function undo() {
    const last = history.at(-1);
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setS(last);
    setWhat(null);
  }

  const listing = (id: string) => LISTINGS.find((l) => l.id === id)!;
  const feasible = result.evaluations.filter((e) => e.feasible);
  const out = result.evaluations.filter((e) => !e.feasible);
  const maxDelta = Math.max(0.001, ...(result.whyWinner ?? []).map((d) => Math.abs(d.delta)));

  return (
    <div>
      <ChangeStrip what={what} diff={diff} prev={prev} result={result} listings={LISTINGS} onUndo={history.length ? undo : undefined} />
      <div className="grid grid-cols-[260px_1fr_300px] gap-6 p-6">
        <aside className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold">Demo persona (synthetic)</h2>
            <select className="w-full rounded border bg-white p-2 text-sm" value={s.persona}
              onChange={(e) => { setS(init(Number(e.target.value))); setHistory([]); setWhat(null); }}>
              {PERSONAS.map((p, i) => <option key={i} value={i}>{p.displayName}</option>)}
            </select>
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold">What matters (drag)</h2>
            <PriorityChips tiers={s.tiers} onChange={(t) => edit({ tiers: t }, "You re-ordered your priorities.")} />
          </section>
          <section className="space-y-3 text-sm">
            <h2 className="text-sm font-semibold">Scenario</h2>
            <label className="block">Budget cap: <b>{usd(s.cap)}</b>
              <input type="range" min={900} max={2200} step={25} value={s.cap} className="w-full"
                onChange={(e) => edit({ cap: Number(e.target.value) }, `Cap set to ${usd(Number(e.target.value))}.`)} />
            </label>
            <label className="flex gap-2"><input type="checkbox" checked={s.laundryReq}
              onChange={(e) => edit({ laundryReq: e.target.checked }, e.target.checked ? "In-unit laundry is now required." : "In-unit laundry no longer required.")} />In-unit laundry required</label>
            <label className="flex gap-2"><input type="checkbox" checked={s.away}
              onChange={(e) => edit({ away: e.target.checked }, e.target.checked ? "You'll be away May–Aug (8 months here)." : "You'll be here all 12 months.")} />Away May–Aug</label>
            <label className="flex gap-2"><input type="checkbox" checked={s.dataU}
              onChange={(e) => edit({ dataU: e.target.checked }, e.target.checked ? "Data uncertainty on." : "Data uncertainty off.")} />Include data uncertainty</label>
          </section>
        </aside>

        <main className="space-y-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold">Results</h1>
            <span className="rounded bg-slate-900 px-2 py-0.5 text-xs text-white">{VERDICT[result.verdict]}</span>
            <span className="text-xs text-slate-500">±{(result.monteCarloSE * 100).toFixed(0)} pt · {result.samples.toLocaleString()} draws</span>
          </div>
          {feasible.length === 0 && <p className="rounded border bg-white p-4 text-sm">Nothing fits all your rules. See why below.</p>}
          {feasible.map((e, i) => (
            <ListingCard key={e.listingId} listing={listing(e.listingId)} ev={e} rank={i + 1} prevFirst={prevFirst(e.listingId)} cap={s.cap} />
          ))}
          {out.length > 0 && (
            <details className="rounded border bg-white p-3 text-sm">
              <summary className="cursor-pointer">{out.length} listings didn’t make it (why)</summary>
              <ul className="mt-2 space-y-1">
                {out.map((e) => <li key={e.listingId}><b>{listing(e.listingId).name}</b>: {e.eliminatedBecause.map((x) => x.text).join("; ")}</li>)}
              </ul>
            </details>
          )}
        </main>

        <aside className="space-y-6 text-sm">
          {result.whyWinner && result.winnerId && result.runnerUpId && (
            <section>
              <h2 className="mb-2 font-semibold">Why #1 beats #2</h2>
              <p className="mb-2 text-xs text-slate-500">{listing(result.winnerId).name} vs {listing(result.runnerUpId).name}</p>
              {result.whyWinner.map((d) => (
                <div key={d.criterion} className="mb-1 flex items-center gap-2">
                  <span className="w-28 text-xs">{CRITERION_LABEL[d.criterion]}</span>
                  <div className="relative h-3 flex-1 bg-slate-100">
                    <div className={`absolute h-3 ${d.delta >= 0 ? "bg-emerald-500" : "bg-rose-400"}`}
                      style={{ width: `${(Math.abs(d.delta) / maxDelta) * 50}%`, [d.delta >= 0 ? "left" : "right"]: "50%" }} />
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-500">Green favors #1; red favors #2.</p>
            </section>
          )}
          <section>
            <h2 className="mb-2 font-semibold">Tipping points</h2>
            {result.tippingPoints.length === 0 && <p className="text-xs text-slate-500">None at these settings.</p>}
            <ul className="space-y-2">
              {result.tippingPoints.map((t, i) => <li key={i} className="rounded border bg-white p-2 text-xs">{t.text}</li>)}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
