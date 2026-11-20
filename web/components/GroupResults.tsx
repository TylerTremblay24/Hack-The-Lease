"use client";
import { motion } from "framer-motion";
import type { Listing, UserPlace } from "@/lib/types";
import type { DecisionResult } from "@/lib/types";
import type { GroupExtras } from "@/lib/engine/group";
import { criterionLabel } from "@/lib/engine/explain";
import { Icon, SectionTitle, label, panel, poss } from "./ui";
import { mateDot, mateText } from "./GroupPanel";

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
  const idx = (id: string) => x.members.findIndex((m) => m.id === id);
  return (
    <section className={`${panel} space-y-4 p-4 text-sm md:p-5`}>
      <SectionTitle icon={<Icon name="group" className="text-leader" />} right={<span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs">{mood}: everyone&apos;s own #1 matches in <span className="num">{pct(x.agreement)}</span> of draws</span>}>
        Group view
      </SectionTitle>

      <div className="grid gap-2 sm:grid-cols-2">
        {x.members.map((m, i) => (
          <div key={m.id} className="flex items-center gap-2 rounded-ctl border border-line bg-surface-2 px-3 py-2 text-xs">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${mateDot(i)}`} />
            <span className="shrink-0 text-ink-muted">{poss(m.name)} favorite:</span> <b className="truncate">{name(x.favorites[m.id])}</b>
            {x.favorites[m.id] !== win && <span className="ml-auto shrink-0 text-flip">not the group pick</span>}
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-muted">
        Group pick <b className="text-ink">{name(win)}</b>. Least happy: <b className={mateText(idx(w.memberId))}>{w.name}</b> at <span className="num">{Math.round(w.score * 100)}</span> of 100.
        {x.fairestId && x.fairestId !== win && <> The fairest compromise is <b className="text-ink">{name(x.fairestId)}</b> (lowest roommate score <span className="num">{Math.round(Math.min(...Object.values(x.memberScores[x.fairestId])) * 100)}</span>).</>}
        {x.fairestId === win && <> It is also the fairest compromise.</>}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className={label}>
              <th className="py-1.5 pr-2 font-normal">Score out of 100</th>
              {x.members.map((m, i) => <th key={m.id} className="px-2 py-1.5 font-normal"><span className="flex items-center gap-1.5 normal-case tracking-normal"><span className={`h-2 w-2 rounded-full ${mateDot(i)}`} />{m.name}</span></th>)}
              <th className="px-2 py-1.5 font-normal">Group #1</th>
            </tr>
          </thead>
          <tbody>
            {top.map((e) => {
              const scores = x.memberScores[e.listingId], low = Math.min(...Object.values(scores));
              return (
                <tr key={e.listingId} className="border-t border-line">
                  <td className="py-2 pr-2 text-ink">{name(e.listingId)}</td>
                  {x.members.map((m, i) => (
                    <td key={m.id} className="px-2 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-16 rounded-full bg-line">
                          <motion.div className={`h-1.5 rounded-full ${mateDot(i)} ${scores[m.id] === low ? "" : "opacity-60"}`} initial={false} animate={{ width: `${scores[m.id] * 100}%` }} />
                        </div>
                        <span className={`num ${scores[m.id] === low ? "font-semibold text-flip" : "text-ink-muted"}`}>{Math.round(scores[m.id] * 100)}</span>
                      </div>
                    </td>
                  ))}
                  <td className="num px-2 py-2 font-semibold">{pct(e.rankAcceptability[0])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-1.5 text-xs text-ink-faint">Maize marks the roommate who likes that listing least. Scores use each roommate&apos;s own priority order.</p>
      </div>

      {x.disagreements.length > 0 && (
        <div>
          <div className={`${label} mb-1.5`}>Where you split</div>
          <ul className="space-y-1 text-xs text-ink-muted">
            {x.disagreements.map((d) => (
              <li key={d.criterion}><b className="text-ink">{criterionLabel(d.criterion, places)}</b>: {d.high.name} {rk(d.high.rank)}, {d.low.name} {rk(d.low.rank)}.</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-ink-faint">Budget: {x.budget.bindingName} has the tightest cap, so the group cap is <span className="num">${Math.round(x.budget.cap).toLocaleString("en-US")}</span> per person. Schedule, must-haves and places are shared for now.</p>
    </section>
  );
}
