"use client";
import type { GroupRule, Member } from "@/lib/engine/group";
import { btnPrimary, field, label, linkBtn, poss } from "./ui";

export interface GroupState { on: boolean; active: number; rule: GroupRule; members: Member[] }

// One color per roommate, used the same way in chips, scores and tipping points.
const DOT = ["bg-mate-1", "bg-mate-2", "bg-mate-3", "bg-mate-4"];
const RING = ["border-mate-1", "border-mate-2", "border-mate-3", "border-mate-4"];
const TEXT = ["text-mate-1", "text-mate-2", "text-mate-3", "text-mate-4"];
export const mateDot = (i: number) => DOT[i % 4];
export const mateText = (i: number) => TEXT[i % 4];

// Starting rankings for added roommates. They are only a starting point: each roommate edits their own list.
const TEMPLATES: Member["tiers"][] = [
  [["quiet"], ["laundry"], ["space"], ["cost"], ["grocery"]],
  [["commute"], ["lateNight"], ["grocery"], ["cost"], ["bathroom"]],
  [["cost"], ["furnished"], ["pets"], ["parking"]],
];
export const newMember = (n: number, budget: [number, number]): Member => ({
  id: `r${n}`, name: `Roommate ${n}`, tiers: TEMPLATES[(n - 2) % TEMPLATES.length].map((t) => [...t]), budget: [...budget],
});

/** Turn on roommates, pick whose priorities you are editing, and choose how the group is merged. */
export function GroupPanel({ g, budget, onChange }: { g: GroupState; budget: [number, number]; onChange: (g: GroupState, note: string) => void }) {
  if (!g.on)
    return (
      <section className="space-y-3 p-4 text-sm">
        <h3 className="text-sm font-bold">Roommates</h3>
        <p className="text-xs text-ink-muted">Each roommate ranks their own priorities. See where you agree, who gets the short end, and the exact point where you split.</p>
        <div className="flex -space-x-1.5" aria-hidden>{DOT.slice(0, 3).map((d, i) => <span key={i} className={`h-6 w-6 rounded-full border-2 border-surface ${d}`} />)}</div>
        <button onClick={() => onChange({ ...g, on: true, active: 0, members: [{ id: "r1", name: "You", tiers: [], budget }, newMember(2, budget)] }, "Roommates mode on.")}
          className={btnPrimary}>Plan with roommates</button>
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
    <section className="space-y-3 p-4 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Roommates</h3>
        <button className={linkBtn} onClick={() => onChange({ ...g, on: false, active: 0, members: [m[0]] }, "Back to just you.")}>Just me</button>
      </div>
      <p className="text-xs text-ink-muted">Editing <b className={mateText(g.active)}>{poss(m[g.active].name).replace(/^Your$/, "your")}</b> priorities and budget. Pick a roommate to switch.</p>
      <div className="flex flex-wrap gap-1.5">
        {m.map((x, i) => (
          <button key={x.id} onClick={() => onChange({ ...g, active: i }, `Editing ${x.name}.`)} aria-pressed={g.active === i}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors duration-fast ${
              g.active === i ? `${RING[i % 4]} bg-surface-2 text-ink` : "border-line-strong text-ink-muted hover:text-ink"}`}>
            <span className={`h-2 w-2 rounded-full ${mateDot(i)}`} />{x.name}
          </button>
        ))}
        {m.length < 4 && <button onClick={add} className="rounded-full border border-dashed border-line-strong px-2.5 py-1 text-xs text-ink-muted hover:text-ink">+ roommate</button>}
      </div>
      <div className="flex items-center gap-2">
        <input className={`${field} flex-1`} value={m[g.active].name} maxLength={20} aria-label="Roommate name"
          onChange={(e) => onChange({ ...g, members: m.map((x, i) => (i === g.active ? { ...x, name: e.target.value || x.id } : x)) }, "Renamed a roommate.")} />
        {m.length > 2 && <button onClick={() => remove(g.active)} className="text-xs text-ink-muted hover:text-against">remove</button>}
      </div>
      <div>
        <div className={`${label} mb-1.5`}>How to merge everyone</div>
        <div className="flex rounded-full border border-line-strong p-0.5">
          {([["average", "Average"], ["fair", "Protect the least happy"]] as const).map(([r, text]) => (
            <button key={r} onClick={() => onChange({ ...g, rule: r }, r === "fair" ? "Merging by the least happy roommate." : "Merging by the average.")} aria-pressed={g.rule === r}
              className={`flex-1 rounded-full px-2 py-1 text-xs font-semibold transition-colors duration-fast ${g.rule === r ? "bg-surface-2 text-ink" : "text-ink-muted hover:text-ink"}`}>{text}</button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-ink-faint">{g.rule === "fair" ? "A listing is only as good as the roommate who likes it least." : "A listing's group score is the mean of every roommate's score."}</p>
      </div>
      <p className="text-xs text-ink-faint">Set each roommate&apos;s budget in the Budget tab while they are selected. Their priorities are the row at the top.</p>
    </section>
  );
}
