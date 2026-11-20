"use client";
import type { Listing, UserPlace } from "@/lib/types";
import type { DecisionResult } from "@/lib/types";
import type { GroupExtras } from "@/lib/engine/group";
import { criterionLabel } from "@/lib/engine/explain";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const rk = (r: number | null) => (r == null ? "doesn't rank it" : `ranks it #${r}`);

/** Where the roommates agree, who gets the short end, and what they disagree about. */
export function GroupResults({ result, x, listings, places }: { result: DecisionResult; x: GroupExtras; listings: Listing[]; places: UserPlace[] }) {
  const name = (id: string | null) => listings.find((l) => l.id === id)?.name ?? "none";
  const top = result.evaluations.filter((e) => e.feasible).slice(0, 5);
  if (top.length === 0) return null;
  const win = result.winnerId!;
  const w = x.worst[win];
  const mood = x.agreement >= 0.7 ? "Mostly aligned" : x.agreement >= 0.4 ? "Partly aligned" : "Split";
  return (
    <section className="space-y-3 rounded-lg border border-emerald-700/50 bg-slate-900 p-3 text-sm">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-semibold text-slate-100">Group view</h2>
        <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-200">{mood}: everyone's own #1 matches in {pct(x.agreement)} of draws</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {x.members.map((m) => (
          <div key={m.id} className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1.5 text-xs">
            <span className="text-slate-400">{m.name}'s favorite:</span> <b className="text-slate-100">{name(x.favorites[m.id])}</b>
            {x.favorites[m.id] !== win && <span className="ml-1 text-amber-300">(not the group pick)</span>}
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-300">
        Group pick <b className="text-slate-100">{name(win)}</b>. Least happy: <b className="text-slate-100">{w.name}</b> at {Math.round(w.score * 100)} of 100.
        {x.fairestId && x.fairestId !== win && <> The fairest compromise is <b className="text-slate-100">{name(x.fairestId)}</b> (lowest roommate score {Math.round(Math.min(...Object.values(x.memberScores[x.fairestId])) * 100)}).</>}
        {x.fairestId === win && <> It is also the fairest compromise.</>}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead><tr className="text-slate-500"><th className="py-1 pr-2 font-normal">Score out of 100 per roommate</th>{x.members.map((m) => <th key={m.id} className="px-2 py-1 font-normal">{m.name}</th>)}<th className="px-2 py-1 font-normal">Group #1</th></tr></thead>
          <tbody>
            {top.map((e) => {
              const scores = x.memberScores[e.listingId], low = Math.min(...Object.values(scores));
              return (
                <tr key={e.listingId} className="border-t border-slate-800">
                  <td className="py-1 pr-2 text-slate-200">{name(e.listingId)}</td>
                  {x.members.map((m) => (
                    <td key={m.id} className="px-2 py-1">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-16 rounded bg-slate-800"><div className={`h-2 rounded ${scores[m.id] === low ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${scores[m.id] * 100}%` }} /></div>
                        <span className={scores[m.id] === low ? "text-amber-300" : ""}>{Math.round(scores[m.id] * 100)}</span>
                      </div>
                    </td>
                  ))}
                  <td className="px-2 py-1 font-semibold text-slate-100">{pct(e.rankAcceptability[0])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-1 text-[11px] text-slate-500">Amber marks the roommate who likes that listing least. Scores use each roommate's own priority order.</p>
      </div>

      {x.disagreements.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-300">Where you split</div>
          <ul className="space-y-1 text-xs text-slate-400">
            {x.disagreements.map((d) => (
              <li key={d.criterion}><b className="text-slate-200">{criterionLabel(d.criterion, places)}</b>: {d.high.name} {rk(d.high.rank)}, {d.low.name} {rk(d.low.rank)}.</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[11px] text-slate-500">Budget: {x.budget.bindingName} has the tightest cap, so the group cap is ${Math.round(x.budget.cap).toLocaleString("en-US")} per person. Schedule, must-haves and places are shared for now.</p>
    </section>
  );
}
