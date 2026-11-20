"use client";
import { useMemo, useState } from "react";
import { ASSUMPTIONS, LISTINGS, PERSONAS } from "@/lib/seed";
import { useDecision } from "@/lib/useDecision";
import { CRITERION_LABEL } from "@/lib/engine/explain";
import type { CriterionId, HardConstraints, StudentProfile } from "@/lib/types";
import { PriorityChips } from "@/components/PriorityChips";
import { ChangeStrip, VERDICT } from "@/components/ChangeStrip";
import { ListingCard } from "@/components/ListingCard";
import { TippingPoints } from "@/components/TippingPoints";

interface State {
  persona: number; tiers: CriterionId[][]; cap: number; months: number; occupants: number; hasCar: boolean;
  rules: HardConstraints; dataU: boolean;
}
const init = (persona: number): State => {
  const p = PERSONAS[persona];
  return {
    persona, tiers: p.priorities, cap: p.budget.capMonthly, months: p.monthsNeeded, occupants: p.household.occupants,
    hasCar: p.hasCar, rules: { ...p.hardConstraints }, dataU: true,
  };
};
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const card = "rounded-lg border border-slate-800 bg-slate-900 p-3";
const sel = "rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200";

/** Boolean must-have row. */
function Check({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2 ${disabled ? "opacity-40" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />{label}
    </label>
  );
}
/** "Any" or a numeric limit. */
function Limit({ label, value, options, unit, onChange }: { label: string; value?: number; options: number[]; unit: string; onChange: (v?: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <select className={sel} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}>
        <option value="">Any</option>
        {options.map((o) => <option key={o} value={o}>{o} {unit}</option>)}
      </select>
    </label>
  );
}

export default function Decide() {
  const [s, setS] = useState<State>(init(0));
  const [history, setHistory] = useState<State[]>([]);
  const [what, setWhat] = useState<string | null>(null);

  const base = PERSONAS[s.persona];
  const profile: StudentProfile = useMemo(() => {
    const hc: HardConstraints = {};
    for (const [k, v] of Object.entries(s.rules)) if (v !== undefined && v !== false) (hc as Record<string, unknown>)[k] = v;
    return {
      ...base,
      priorities: s.tiers.length ? s.tiers : [["cost"]],
      budget: { ...base.budget, capMonthly: s.cap, targetMonthly: Math.min(base.budget.targetMonthly, s.cap) },
      household: { occupants: s.occupants },
      monthsNeeded: s.months,
      hasCar: s.hasCar,
      hardConstraints: hc,
    };
  }, [base, s]);

  const { result, prev, diff } = useDecision(profile, LISTINGS, ASSUMPTIONS, s.dataU);
  const prevFirst = (id: string) => prev?.evaluations.find((e) => e.listingId === id)?.rankAcceptability[0] ?? null;

  function edit(next: Partial<State>, label: string) {
    setHistory((h) => [...h, s]);
    setS({ ...s, ...next });
    setWhat(label);
  }
  const rule = (patch: HardConstraints, label: string) => edit({ rules: { ...s.rules, ...patch } }, label);
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
  const r = s.rules;
  const onOff = (v: boolean, a: string, b: string) => (v ? a : b);

  return (
    <div>
      <ChangeStrip what={what} diff={diff} prev={prev} result={result} listings={LISTINGS} onUndo={history.length ? undo : undefined} />
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[320px_1fr_340px]">
        <aside className="space-y-5">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-100">Demo persona (synthetic)</h2>
            <select className={`${sel} w-full`} value={s.persona}
              onChange={(e) => { setS(init(Number(e.target.value))); setHistory([]); setWhat(null); }}>
              {PERSONAS.map((p, i) => <option key={i} value={i}>{p.displayName}</option>)}
            </select>
          </section>

          <section>
            <PriorityChips tiers={s.tiers} onChange={(t, note) => edit({ tiers: t }, note)} />
          </section>

          <section className={`${card} space-y-2 text-sm`}>
            <h2 className="font-semibold text-slate-100">Must-haves</h2>
            <p className="text-xs text-slate-500">Hard rules. A listing that breaks one is out, and the tipping points show near misses.</p>
            <Check label="In-unit laundry" checked={!!r.inUnitLaundryRequired} onChange={(v) => rule({ inUnitLaundryRequired: v, laundryAtLeast: v ? undefined : r.laundryAtLeast }, onOff(v, "In-unit laundry is now required.", "In-unit laundry no longer required."))} />
            <Check label="Some laundry on site" checked={!!r.laundryAtLeast || !!r.inUnitLaundryRequired} disabled={!!r.inUnitLaundryRequired}
              onChange={(v) => rule({ laundryAtLeast: v ? "in_building" : undefined }, onOff(v, "Laundry on site is now required.", "Laundry on site no longer required."))} />
            <Check label="Parking included" checked={!!r.parkingRequired} onChange={(v) => rule({ parkingRequired: v || undefined }, onOff(v, "Parking is now required.", "Parking no longer required."))} />
            <Check label="Pet-friendly" checked={!!r.petFriendly} onChange={(v) => rule({ petFriendly: v || undefined }, onOff(v, "Pet-friendly is now required.", "Pet-friendly no longer required."))} />
            <Check label="Furnished" checked={!!r.furnished} onChange={(v) => rule({ furnished: v || undefined }, onOff(v, "Furnished is now required.", "Furnished no longer required."))} />
            <Check label="Quiet buildings only (noise 2 or lower)" checked={r.maxNoise != null} onChange={(v) => rule({ maxNoise: v ? 2 : undefined }, onOff(v, "Only quiet buildings now.", "Noise no longer limited."))} />
            <Limit label="Groceries within" unit="min walk" options={[5, 8, 12, 15]} value={r.maxGroceryWalkMin}
              onChange={(v) => rule({ maxGroceryWalkMin: v }, v ? `Groceries must be within ${v} min.` : "Grocery distance no longer limited.")} />
            <Limit label="Late walk home under" unit="min" options={[8, 12, 15, 20]} value={r.maxLateWalkMin}
              onChange={(v) => rule({ maxLateWalkMin: v }, v ? `Late walk home must be under ${v} min.` : "Late walk no longer limited.")} />
            <Limit label="Commute at most" unit="min/week" options={[90, 150, 210, 300]} value={r.maxWeeklyCommuteMin}
              onChange={(v) => rule({ maxWeeklyCommuteMin: v }, v ? `Weekly commute capped at ${v} min.` : "Commute no longer capped.")} />
            <Limit label="Lease no longer than" unit="months" options={[9, 10, 12]} value={r.maxLeaseMonths}
              onChange={(v) => rule({ maxLeaseMonths: v }, v ? `Lease capped at ${v} months.` : "Lease length no longer capped.")} />
          </section>

          <section className={`${card} space-y-3 text-sm`}>
            <h2 className="font-semibold text-slate-100">Your situation</h2>
            <label className="block">Budget cap: <b className="text-slate-100">{usd(s.cap)}</b> <span className="text-slate-500">per person</span>
              <input type="range" min={900} max={2200} step={25} value={s.cap} className="w-full"
                onChange={(e) => edit({ cap: Number(e.target.value) }, `Cap set to ${usd(Number(e.target.value))}.`)} />
            </label>
            <label className="flex items-center justify-between gap-2">Months you'll live there
              <select className={sel} value={s.months} onChange={(e) => edit({ months: Number(e.target.value) }, `You'll be there ${e.target.value} months.`)}>
                {[4, 6, 8, 9, 10, 12].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="flex items-center justify-between gap-2">People sharing the unit
              <select className={sel} value={s.occupants} onChange={(e) => edit({ occupants: Number(e.target.value) }, `${e.target.value} people share the unit.`)}>
                {[1, 2, 3, 4].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <Check label="I have a car" checked={s.hasCar} onChange={(v) => edit({ hasCar: v }, onOff(v, "You have a car.", "You don't have a car."))} />
            <Check label="Include data uncertainty" checked={s.dataU} onChange={(v) => edit({ dataU: v }, onOff(v, "Data uncertainty on.", "Data uncertainty off."))} />
          </section>
        </aside>

        <main className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-lg font-semibold text-slate-100">Results</h1>
            <span className="rounded bg-emerald-500 px-2 py-0.5 text-xs font-bold text-slate-950">{VERDICT[result.verdict]}</span>
            <span className="text-xs text-slate-500">±{(result.monteCarloSE * 100).toFixed(0)} pt · {result.samples.toLocaleString()} draws</span>
          </div>
          {feasible.length === 0 && <p className={`${card} text-sm`}>Nothing fits all your rules. Loosen one below to see what comes back.</p>}
          {feasible.map((e, i) => (
            <ListingCard key={e.listingId} listing={listing(e.listingId)} ev={e} rank={i + 1} prevFirst={prevFirst(e.listingId)} cap={s.cap} />
          ))}
          {out.length > 0 && (
            <details className={`${card} text-sm`} open={feasible.length === 0}>
              <summary className="cursor-pointer text-slate-300">{out.length} listings didn’t make it (why)</summary>
              <ul className="mt-2 space-y-1 text-slate-400">
                {out.map((e) => <li key={e.listingId}><b className="text-slate-200">{listing(e.listingId).name}</b>: {e.eliminatedBecause.map((x) => x.text).join("; ")}</li>)}
              </ul>
            </details>
          )}
        </main>

        <aside className="space-y-6 text-sm">
          {result.whyWinner && result.winnerId && result.runnerUpId && (
            <section>
              <h2 className="mb-2 font-semibold text-slate-100">Why #1 beats #2</h2>
              <p className="mb-2 text-xs text-slate-500">{listing(result.winnerId).name} vs {listing(result.runnerUpId).name}</p>
              {result.whyWinner.map((d) => (
                <div key={d.criterion} className="mb-1 flex items-center gap-2">
                  <span className="w-32 text-xs text-slate-300">{CRITERION_LABEL[d.criterion]}</span>
                  <div className="relative h-3 flex-1 rounded bg-slate-800">
                    <div className="absolute left-1/2 h-3 border-l border-slate-600" />
                    <div className={`absolute h-3 ${d.delta >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                      style={{ width: `${(Math.abs(d.delta) / maxDelta) * 50}%`, [d.delta >= 0 ? "left" : "right"]: "50%" }} />
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-500">Green favors #1; red favors #2.</p>
            </section>
          )}
          <TippingPoints result={result} />
        </aside>
      </div>
    </div>
  );
}
