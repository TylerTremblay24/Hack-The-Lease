"use client";
import { useMemo, useState } from "react";
import { MotionConfig } from "framer-motion";
import { ASSUMPTIONS, PERSONAS, PLACES, bankListings, DEMO_LISTINGS, WEB_LISTINGS, LISTINGS as ALL_LISTINGS, type Bank } from "@/lib/seed";
import { useDecision } from "@/lib/useDecision";
import { criterionLabel } from "@/lib/engine/explain";
import type { AnchorId, CriterionId, HardConstraints, ScheduleAnchor, StudentProfile, TippingPoint, UserPlace } from "@/lib/types";
import { applyTipping } from "@/lib/applyTipping";
import { PriorityChips } from "@/components/PriorityChips";
import { ChangeStrip } from "@/components/ChangeStrip";
import { ListingCard } from "@/components/ListingCard";
import { TippingPoints } from "@/components/TippingPoints";
import { RangeSlider } from "@/components/RangeSlider";
import { MyPlaces } from "@/components/MyPlaces";
import { RhythmEditor, type Rhythm } from "@/components/RhythmEditor";
import { CompareView } from "@/components/CompareView";
import { GroupPanel, type GroupState } from "@/components/GroupPanel";
import { GroupResults } from "@/components/GroupResults";
import { StoryCard } from "@/components/StoryCard";
import { SummarySheet } from "@/components/SummarySheet";
import { buildStory } from "@/lib/story";
import { AssumptionsDrawer, type Tune, type TuneKey } from "@/components/AssumptionsDrawer";
import { SideNav, type NavTarget } from "@/components/shell/SideNav";
import { InputRail, type RailTab } from "@/components/shell/InputRail";
import { DecisionHero } from "@/components/DecisionHero";
import { Legend, label, panel } from "@/components/ui";

interface State {
  persona: number; tiers: CriterionId[][]; budget: [number, number]; months: [number, number]; occupants: [number, number]; hasCar: boolean; places: UserPlace[]; rhythm: Rhythm; tune: Tune;
  rules: HardConstraints; dataU: boolean; group: GroupState;
}
const ANCHORS: AnchorId[] = ["central", "north", "kerrytown", "medical", "downtown"];
const rhythmOf = (p: StudentProfile): Rhythm =>
  Object.fromEntries(ANCHORS.map((a) => {
    const f = p.anchors.find((x) => x.anchor === a);
    return [a, { days: f?.daysPerWeek ?? 0, late: f?.lateReturn ?? false }];
  })) as Rhythm;
const init = (persona: number): State => {
  const p = PERSONAS[persona];
  return {
    persona, tiers: p.priorities, budget: [p.budget.targetMonthly, p.budget.capMonthly], months: [p.monthsNeeded, p.monthsNeeded], occupants: [p.household.occupants, p.household.occupants],
    hasCar: p.hasCar, places: [], rhythm: rhythmOf(p), tune: {}, rules: { ...p.hardConstraints }, dataU: true, group: { on: false, active: 0, rule: "average", members: [] },
  };
};
const mid = ([a, b]: [number, number]) => Math.round((a + b) / 2);
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const sel = "rounded-ctl border border-line-strong bg-bg px-2 py-1 text-sm text-ink";
const personaName = (d?: string) => (d ?? "Student").split(" (")[0];
const railSec = "space-y-2.5 border-t border-line p-4 text-sm first:border-t-0";
const railHead = "flex items-center justify-between text-[13px] font-bold text-ink";

/** Boolean must-have row. */
function Check({ label: text, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2.5 py-0.5 ${disabled ? "opacity-40" : ""}`}>
      <input type="checkbox" className="h-4 w-4" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />{text}
    </label>
  );
}
/** "Any" or a numeric limit. */
function Limit({ label: text, value, options, unit, onChange }: { label: string; value?: number; options: number[]; unit: string; onChange: (v?: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-ink-muted">{text}</span>
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
  const [pinned, setPinned] = useState<string[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [bank, setBank] = useState<Bank>("all");
  const [tab, setTab] = useState<RailTab>("week");
  const LISTINGS = useMemo(() => bankListings(bank), [bank]);

  const base = PERSONAS[s.persona];
  const profile: StudentProfile = useMemo(() => {
    const hc: HardConstraints = {};
    for (const [k, v] of Object.entries(s.rules)) if (v !== undefined && v !== false) (hc as Record<string, unknown>)[k] = v;
    return {
      ...base,
      priorities: s.tiers.length ? s.tiers : [["cost"]],
      budget: { targetMonthly: s.budget[0], capMonthly: s.budget[1] },
      household: { occupants: mid(s.occupants) },
      monthsNeeded: mid(s.months),
      monthsRange: s.months,
      occupantsRange: s.occupants,
      anchors: ANCHORS.filter((a) => s.rhythm[a].days > 0).map((a): ScheduleAnchor => ({
        anchor: a, daysPerWeek: s.rhythm[a].days, lateReturn: s.rhythm[a].late, label: base.anchors.find((x) => x.anchor === a)?.label,
      })),
      hasCar: s.hasCar,
      places: s.places,
      hardConstraints: hc,
    };
  }, [base, s]);

  // The assumptions the engine actually uses: the defaults plus whatever the student tuned.
  const assumptions = useMemo(() => {
    const { busTimeSpread, ...anchors } = s.tune;
    return { ...ASSUMPTIONS, busTimeSpread: busTimeSpread ?? ASSUMPTIONS.busTimeSpread, anchors: { ...ASSUMPTIONS.anchors, ...anchors } };
  }, [s.tune]);

  const groupInput = useMemo(() => (s.group.on ? { members: s.group.members, rule: s.group.rule } : undefined), [s.group]);
  const { result, prev, diff, extra } = useDecision(profile, LISTINGS, assumptions, s.dataU, groupInput);
  const gOn = s.group.on;
  const shownTiers = gOn ? s.group.members[s.group.active].tiers : s.tiers;
  const shownBudget = gOn ? s.group.members[s.group.active].budget : s.budget;
  const setTiers = (t: CriterionId[][], note: string) =>
    gOn ? edit({ group: { ...s.group, members: s.group.members.map((m, i) => (i === s.group.active ? { ...m, tiers: t } : m)) } }, note) : edit({ tiers: t }, note);
  const setBudget = (v: [number, number], note: string) =>
    gOn ? edit({ group: { ...s.group, members: s.group.members.map((m, i) => (i === s.group.active ? { ...m, budget: v } : m)) } }, note) : edit({ budget: v }, note);
  function onGroup(g: GroupState, note: string) {
    if (g.on && !s.group.on) { // turning on: you become roommate 1 with your current list and budget
      g = { ...g, members: g.members.map((m, i) => (i === 0 ? { ...m, tiers: s.tiers, budget: s.budget } : m)) };
      return edit({ group: g }, note);
    }
    if (!g.on && s.group.on) { // turning off: keep roommate 1's list and budget
      const me = s.group.members[0];
      return edit({ group: { ...g, members: [] }, tiers: me.tiers, budget: me.budget }, note);
    }
    edit({ group: g }, note);
  }
  const prevFirst = (id: string) => prev?.evaluations.find((e) => e.listingId === id)?.rankAcceptability[0] ?? null;

  function edit(next: Partial<State>, text: string) {
    setHistory((h) => [...h, s]);
    setS({ ...s, ...next });
    setWhat(text);
  }
  const rule = (patch: HardConstraints, text: string) => edit({ rules: { ...s.rules, ...patch } }, text);
  function undo() {
    const last = history.at(-1);
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setS(last);
    setWhat(null);
  }

  function addPlace(pl: UserPlace) {
    edit({ places: [...s.places, pl] }, `Added ${pl.name} to your places.`);
  }
  function removePlace(pl: UserPlace) {
    const id = `place:${pl.id}`;
    const limits = { ...(s.rules.placeMaxWalkMin ?? {}) };
    delete limits[pl.id];
    edit({
      places: s.places.filter((p) => p.id !== pl.id),
      tiers: s.tiers.map((t) => t.filter((c) => c !== id)).filter((t) => t.length),
      group: { ...s.group, members: s.group.members.map((m) => ({ ...m, tiers: m.tiers.map((t) => t.filter((c) => c !== id)).filter((t) => t.length) })) },
      rules: { ...s.rules, placeMaxWalkMin: Object.keys(limits).length ? limits : undefined },
    }, `Removed ${pl.name} from your places.`);
  }
  const setPlaceLimit = (pl: UserPlace, v?: number) => {
    const limits = { ...(s.rules.placeMaxWalkMin ?? {}) };
    if (v == null) delete limits[pl.id]; else limits[pl.id] = v;
    rule({ placeMaxWalkMin: Object.keys(limits).length ? limits : undefined }, v ? `${pl.name} must be within ${v} min.` : `${pl.name} no longer limited.`);
  };

  const tuneOne = (k: TuneKey, v: number, text: string) => edit({ tune: { ...s.tune, [k]: v } }, text);

  function applyTip(tp: TippingPoint) {
    if (!tp.apply) return;
    const a = tp.apply;
    if (a.type === "memberSwap" || a.type === "memberCap") {
      const m = s.group.members.find((x) => x.id === a.member);
      if (!m) return;
      const members = s.group.members.map((x) => {
        if (x.id !== a.member) return x;
        if (a.type === "memberCap") return { ...x, budget: [Math.min(x.budget[0], a.to), a.to] as [number, number] };
        const t = x.tiers.map((y) => [...y]);
        [t[a.tier], t[a.tier + 1]] = [t[a.tier + 1], t[a.tier]];
        return { ...x, tiers: t };
      });
      return edit({ group: { ...s.group, members } }, a.type === "memberCap" ? `Applied: ${m.name}'s cap raised to ${usd(a.to)}.` : `Applied: ${m.name} swapped two priorities.`);
    }
    const { patch, label: text } = applyTipping({ tiers: s.tiers, budget: s.budget, rules: s.rules, hasCar: s.hasCar, places: s.places }, a);
    edit(patch as Partial<State>, text);
  }
  const togglePin = (id: string) => setPinned((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p));

  const winEv = result.evaluations.find((e) => e.listingId === result.winnerId && e.feasible);
  const order = useMemo<CriterionId[]>(() => {
    const flat = (gOn ? [] : s.tiers.flat()) as CriterionId[];
    const w = Object.entries(result.weightsROC) as [CriterionId, number][];
    return w.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1] || flat.indexOf(a[0]) - flat.indexOf(b[0])).map(([c]) => c);
  }, [result, gOn, s.tiers]);
  const story = winEv ? buildStory({ profile, listing: LISTINGS.find((l) => l.id === winEv.listingId)!, ev: winEv, result, places: s.places, order, listings: LISTINGS, extra, withQuotes: !gOn }) : null;
  const who = gOn ? `Group of ${s.group.members.length}: ${s.group.members.map((m) => m.name).join(", ")}` : base.displayName ?? "Student";
  const budgetText = gOn && extra ? `${usd(extra.budget.target)} target, ${usd(extra.budget.cap)} cap per person` : `${usd(s.budget[0])} target, ${usd(s.budget[1])} cap per person`;

  const listing = (id: string) => LISTINGS.find((l) => l.id === id)!;
  const feasible = result.evaluations.filter((e) => e.feasible);
  const out = result.evaluations.filter((e) => !e.feasible);
  const maxDelta = Math.max(0.001, ...(result.whyWinner ?? []).map((d) => Math.abs(d.delta)));
  const r = s.rules;
  const onOff = (v: boolean, a: string, b: string) => (v ? a : b);

  function nav(t: NavTarget) {
    if (t === "summary") { if (story) setShowSummary(true); return; }
    if (t === "compare") { document.getElementById("compare")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (t === "group" || t === "tune") { setTab(t); document.getElementById("inputs")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    setTab("week");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function pickPersona(i: number) { setS(init(i)); setHistory([]); setWhat(null); setPinned([]); }
  function pickBank(b: Bank) {
    const n = b === "demo" ? DEMO_LISTINGS.length : b === "web" ? WEB_LISTINGS.length : ALL_LISTINGS.length;
    setBank(b); setPinned([]); setWhat(`Listing bank: ${b === "all" ? "All" : b === "web" ? "Web" : "Demo"} (${n}).`);
  }
  const rulesOn = Object.values(r).filter((v) => v !== undefined && v !== false).length;

  return (
    <MotionConfig reducedMotion="user">
      <div className="md:flex">
        <SideNav
          personas={PERSONAS.map((p) => ({ name: personaName(p.displayName), synthetic: /synthetic/i.test(p.displayName ?? "") }))}
          persona={s.persona} onPersona={pickPersona}
          bank={bank} onBank={pickBank}
          banks={[{ id: "all", label: "All", count: ALL_LISTINGS.length }, { id: "web", label: "Web", count: WEB_LISTINGS.length }, { id: "demo", label: "Demo", count: DEMO_LISTINGS.length }]}
          pinned={pinned.length} roommates={gOn ? s.group.members.length : 0}
          onNav={nav} active={tab === "group" ? "group" : tab === "tune" ? "tune" : "decide"} />

        <main className="min-w-0 flex-1 px-4 pb-12 md:px-7">
          <div className="mx-auto max-w-page">
            <DecisionHero result={result} listings={LISTINGS} group={gOn ? s.group.members.map((m) => m.name) : undefined}>
              <ChangeStrip what={what} diff={diff} prev={prev} result={result} listings={LISTINGS} onUndo={history.length ? undo : undefined} />
            </DecisionHero>

            <section className={`${panel} mt-5 p-4 md:p-5`} aria-label="Your priorities">
              <PriorityChips tiers={shownTiers} places={s.places} onChange={setTiers} weights={gOn ? undefined : result.weightsROC}
                owner={gOn ? s.group.members[s.group.active].name : undefined} />
            </section>

            <div className="mt-5 grid gap-5 lg:grid-cols-[theme(width.rail)_minmax(0,1fr)] xl:grid-cols-[theme(width.rail)_minmax(0,1fr)_theme(width.side)]">
              <div className="lg:row-span-2 xl:row-span-1">
                <InputRail tab={tab} onTab={setTab} badges={{ rules: rulesOn > 0 ? true : undefined, group: gOn || undefined, tune: Object.keys(s.tune).length > 0 || undefined }}>
                  {tab === "week" && (
                    <RhythmEditor rhythm={s.rhythm} notes={Object.fromEntries(base.anchors.filter((a) => a.label).map((a) => [a.anchor, a.label]))}
                      onChange={(id, next, text) => edit({ rhythm: { ...s.rhythm, [id]: next } }, text)} />
                  )}
                  {tab === "places" && <MyPlaces all={PLACES} chosen={s.places} onAdd={addPlace} onRemove={removePlace} />}
                  {tab === "rules" && (
                    <>
                      <section className={railSec}>
                        <h3 className={railHead}>Must-haves</h3>
                        <p className="text-xs text-ink-faint">Hard rules. A listing that breaks one is out, and the tipping points show near misses.</p>
                        <Check label="In-unit laundry" checked={!!r.inUnitLaundryRequired} onChange={(v) => rule({ inUnitLaundryRequired: v, laundryAtLeast: v ? undefined : r.laundryAtLeast }, onOff(v, "In-unit laundry is now required.", "In-unit laundry no longer required."))} />
                        <Check label="Some laundry on site" checked={!!r.laundryAtLeast || !!r.inUnitLaundryRequired} disabled={!!r.inUnitLaundryRequired}
                          onChange={(v) => rule({ laundryAtLeast: v ? "in_building" : undefined }, onOff(v, "Laundry on site is now required.", "Laundry on site no longer required."))} />
                        <Check label="Pet-friendly" checked={!!r.petFriendly} onChange={(v) => rule({ petFriendly: v || undefined }, onOff(v, "Pet-friendly is now required.", "Pet-friendly no longer required."))} />
                        <Check label="Furnished" checked={!!r.furnished} onChange={(v) => rule({ furnished: v || undefined }, onOff(v, "Furnished is now required.", "Furnished no longer required."))} />
                        <Check label="Quiet buildings only (noise 2 or lower)" checked={r.maxNoise != null} onChange={(v) => rule({ maxNoise: v ? 2 : undefined }, onOff(v, "Only quiet buildings now.", "Noise no longer limited."))} />
                        <Check label="On-site parking (cost counted)" checked={s.hasCar || !!s.rules.parkingRequired}
                          onChange={(v) => edit({ hasCar: v, rules: { ...s.rules, parkingRequired: v || undefined } }, onOff(v, "You need on-site parking.", "You no longer need on-site parking."))} />
                      </section>
                      <section className={railSec}>
                        <h3 className={railHead}>Limits</h3>
                        <Limit label="Groceries within" unit="min walk" options={[5, 8, 12, 15]} value={r.maxGroceryWalkMin}
                          onChange={(v) => rule({ maxGroceryWalkMin: v }, v ? `Groceries must be within ${v} min.` : "Grocery distance no longer limited.")} />
                        <Limit label="Late walk home under" unit="min" options={[8, 12, 15, 20]} value={r.maxLateWalkMin}
                          onChange={(v) => rule({ maxLateWalkMin: v }, v ? `Late walk home must be under ${v} min.` : "Late walk no longer limited.")} />
                        <Limit label="Commute at most" unit="min/wk" options={[90, 150, 210, 300]} value={r.maxWeeklyCommuteMin}
                          onChange={(v) => rule({ maxWeeklyCommuteMin: v }, v ? `Weekly commute capped at ${v} min.` : "Commute no longer capped.")} />
                        {s.places.map((pl) => (
                          <Limit key={pl.id} label={`Walk to ${pl.name}`} unit="min" options={[5, 10, 15, 20]} value={r.placeMaxWalkMin?.[pl.id]}
                            onChange={(v) => setPlaceLimit(pl, v)} />
                        ))}
                      </section>
                    </>
                  )}
                  {tab === "budget" && (
                    <section className={`${railSec} space-y-4`}>
                      <RangeSlider label={gOn ? `${s.group.members[s.group.active].name}'s budget per person` : "Budget per person"} hint="target to hard cap" min={900} max={2200} step={25} value={shownBudget} format={usd}
                        onChange={(v) => setBudget(v, v[0] === v[1] ? `Budget set to ${usd(v[1])}.` : `Budget set to ${usd(v[0])} target, ${usd(v[1])} cap.`)} />
                      <RangeSlider label="Months you'll live there" min={1} max={12} value={s.months} unit="mo"
                        onChange={(v) => edit({ months: v }, v[0] === v[1] ? `You'll be there ${v[0]} months.` : `You'll be there ${v[0]} to ${v[1]} months.`)} />
                      <RangeSlider label="People sharing the unit" min={1} max={8} value={s.occupants}
                        onChange={(v) => edit({ occupants: v }, v[0] === v[1] ? `${v[0]} ${v[0] === 1 ? "person lives" : "people share"} in the unit.` : `${v[0]} to ${v[1]} people share the unit.`)} />
                      <p className="text-xs text-ink-faint">A range keeps every listing that works for any value in it. Costs and scores use the middle of the range.</p>
                      <Check label="Include data uncertainty" checked={s.dataU} onChange={(v) => edit({ dataU: v }, onOff(v, "Data uncertainty on.", "Data uncertainty off."))} />
                    </section>
                  )}
                  {tab === "group" && <GroupPanel g={s.group} budget={s.budget} onChange={onGroup} />}
                  {tab === "tune" && <AssumptionsDrawer base={ASSUMPTIONS} tune={s.tune} onTune={tuneOne} onReset={() => edit({ tune: {} }, "Assumptions reset to defaults.")} />}
                </InputRail>
              </div>

              <div className="min-w-0 space-y-5">
                {story && <StoryCard story={story} onSummary={() => setShowSummary(true)} />}
                {extra && <GroupResults result={result} x={extra} listings={LISTINGS} places={s.places} />}
                <div id="compare" className="scroll-mt-20">
                  <CompareView
                    cols={pinned.map((id) => ({ listing: listing(id), ev: result.evaluations.find((e) => e.listingId === id)! })).filter((c) => c.ev)}
                    result={result} places={s.places} hasLate={profile.anchors.some((a) => a.lateReturn)} onUnpin={togglePin} />
                </div>
                <section className="space-y-3">
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-[15px] font-bold">{feasible.length} {feasible.length === 1 ? "apartment fits" : "apartments fit"}</h2>
                    {out.length > 0 && <span className="text-sm text-ink-muted">{out.length} didn&apos;t</span>}
                  </div>
                  {feasible.length === 0 && <p className={`${panel} p-4 text-sm`}>Nothing fits all your rules. Loosen one on the left to see what comes back.</p>}
                  {feasible.map((e, i) => (
                    <ListingCard key={e.listingId} listing={listing(e.listingId)} ev={e} rank={i + 1} prevFirst={prevFirst(e.listingId)} cap={extra?.budget.cap ?? s.budget[1]} places={s.places}
                      pinned={pinned.includes(e.listingId)} canPin={pinned.length < 3} onPin={() => togglePin(e.listingId)} />
                  ))}
                  {out.length > 0 && (
                    <details className={`${panel} p-4 text-sm`} open={feasible.length === 0}>
                      <summary className="cursor-pointer text-ink-muted">{out.length} listings didn&apos;t make it (why)</summary>
                      <ul className="mt-2 space-y-1 text-ink-muted">
                        {out.map((e) => <li key={e.listingId}><b className="text-ink">{listing(e.listingId).name}</b>: {e.eliminatedBecause.map((x) => x.text).join("; ")}</li>)}
                      </ul>
                    </details>
                  )}
                </section>
              </div>

              <aside className="min-w-0 space-y-5 text-sm lg:col-start-2 xl:col-start-auto">
                {result.whyWinner && result.winnerId && result.runnerUpId && (
                  <section className={`${panel} p-4`}>
                    <h2 className="mb-1 text-[15px] font-bold">Why #1 beats #2</h2>
                    <p className="mb-3 text-xs text-ink-faint">{listing(result.winnerId).name} vs {listing(result.runnerUpId).name}</p>
                    {result.whyWinner.map((d) => (
                      <div key={d.criterion} className="mb-1.5 flex items-center gap-2">
                        <span className="w-32 text-xs text-ink-muted">{criterionLabel(d.criterion, s.places)}</span>
                        <div className="relative h-2 flex-1 rounded-sm bg-line">
                          <div className="absolute left-1/2 h-2 border-l border-line-strong" />
                          <div className={`absolute h-2 rounded-sm ${d.delta >= 0 ? "bg-leader" : "bg-against"}`}
                            style={{ width: `${(Math.abs(d.delta) / maxDelta) * 50}%`, [d.delta >= 0 ? "left" : "right"]: "50%" }} />
                        </div>
                      </div>
                    ))}
                    <p className={`${label} mt-2`}>Green favors #1 · coral favors #2</p>
                  </section>
                )}
                <TippingPoints result={result} places={s.places} onApply={applyTip} />
              </aside>
            </div>

            <div className="mt-8"><Legend /></div>
          </div>
        </main>
      </div>
      {showSummary && story && <SummarySheet story={story} result={result} listings={LISTINGS} places={s.places} extra={extra} who={who} budgetText={budgetText} onClose={() => setShowSummary(false)} />}
    </MotionConfig>
  );
}
