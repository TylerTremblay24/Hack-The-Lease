"use client";
import type { GroupRule, Member } from "@/lib/engine/group";

export interface GroupState { on: boolean; active: number; rule: GroupRule; members: Member[] }

// Starting rankings for added roommates. They are only a starting point: each roommate edits their own list.
const TEMPLATES: Member["tiers"][] = [
  [["quiet"], ["laundry"], ["space"], ["cost"], ["grocery"]],
  [["commute"], ["lateNight"], ["grocery"], ["cost"], ["bathroom"]],
  [["cost"], ["furnished"], ["pets"], ["parking"]],
];
export const newMember = (n: number, budget: [number, number]): Member => ({
  id: `r${n}`, name: `Roommate ${n}`, tiers: TEMPLATES[(n - 2) % TEMPLATES.length].map((t) => [...t]), budget: [...budget],
});

const field = "rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200";

/** Turn on roommates, pick whose priorities you are editing, and choose how the group is merged. */
export function GroupPanel({ g, budget, onChange }: { g: GroupState; budget: [number, number]; onChange: (g: GroupState, note: string) => void }) {
  if (!g.on)
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm">
        <h2 className="font-semibold text-slate-100">Roommates</h2>
        <p className="mt-1 text-xs text-slate-500">Each roommate ranks their own priorities. See where you agree and the exact point where you split.</p>
        <button onClick={() => onChange({ ...g, on: true, active: 0, members: [{ id: "r1", name: "You", tiers: [], budget }, newMember(2, budget)] }, "Roommates mode on.")}
          className="mt-2 rounded bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-slate-950">Plan with roommates</button>
      </section>
    );
  const m = g.members;
  const add = () => {
    const used = new Set(m.map((x) => x.id));
    let n = 2; while (used.has(`r${n}`)) n++;
    onChange({ ...g, members: [...m, newMember(n, budget)], active: m.length }, `Added Roommate ${n}.`);
  };
  const remove = (i: number) => onChange({ ...g, members: m.filter((_, k) => k !== i), active: 0 }, `Removed ${m[i].name}.`);
  return (
    <section className="space-y-2 rounded-lg border border-emerald-700/50 bg-emerald-500/5 p-3 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-100">Roommates</h2>
        <button className="text-[11px] text-slate-400 underline" onClick={() => onChange({ ...g, on: false, active: 0, members: [m[0]] }, "Back to just you.")}>Just me</button>
      </div>
      <p className="text-xs text-slate-500">You are editing <b className="text-slate-200">{m[g.active].name}</b>'s priorities and budget. Pick a tab to switch.</p>
      <div className="flex flex-wrap gap-1">
        {m.map((x, i) => (
          <button key={x.id} onClick={() => onChange({ ...g, active: i }, `Editing ${x.name}.`)}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${g.active === i ? "border-emerald-500 bg-emerald-500/20 text-emerald-100" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}>{x.name}</button>
        ))}
        {m.length < 4 && <button onClick={add} className="rounded-full border border-dashed border-slate-600 px-2.5 py-0.5 text-xs text-slate-400 hover:text-slate-200">+ roommate</button>}
      </div>
      <div className="flex items-center gap-2">
        <input className={`${field} flex-1`} value={m[g.active].name} maxLength={20} aria-label="Roommate name"
          onChange={(e) => onChange({ ...g, members: m.map((x, i) => (i === g.active ? { ...x, name: e.target.value || x.id } : x)) }, "Renamed a roommate.")} />
        {m.length > 2 && <button onClick={() => remove(g.active)} className="text-xs text-slate-500 hover:text-rose-400">remove</button>}
      </div>
      <div>
        <div className="mb-1 text-[11px] text-slate-400">How to merge everyone</div>
        <div className="flex gap-1">
          {([["average", "Average"], ["fair", "Protect the least happy"]] as const).map(([r, label]) => (
            <button key={r} onClick={() => onChange({ ...g, rule: r }, r === "fair" ? "Merging by the least happy roommate." : "Merging by the average.")}
              className={`rounded border px-2 py-1 text-[11px] ${g.rule === r ? "border-emerald-500 bg-emerald-500/20 text-emerald-100" : "border-slate-700 text-slate-400"}`}>{label}</button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-slate-500">{g.rule === "fair" ? "A listing is only as good as the roommate who likes it least." : "A listing's group score is the mean of every roommate's score."}</p>
      </div>
    </section>
  );
}
