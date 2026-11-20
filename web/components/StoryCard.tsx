"use client";
import type { Story } from "@/lib/story";

const TONE = { strong: "text-emerald-300", ok: "text-amber-200", weak: "text-rose-300" } as const;
const MARK = { strong: "Strong", ok: "OK", weak: "Weak" } as const;

/** "Why this fits you": the student's own ranking and words next to the listing's real numbers. */
export function StoryCard({ story, onSummary }: { story: Story; onSummary: () => void }) {
  return (
    <section className="space-y-2 rounded-lg border border-emerald-700/50 bg-gradient-to-br from-emerald-500/10 to-slate-900 p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">Why this fits you</div>
          <h2 className="text-base font-semibold text-slate-50">{story.headline}</h2>
        </div>
        <button onClick={onSummary} className="shrink-0 rounded bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-slate-950">One-page summary</button>
      </div>
      <ul className="space-y-2">
        {story.lines.map((l) => (
          <li key={l.criterion} className="rounded border border-slate-800 bg-slate-950/40 px-3 py-2">
            <div className="text-xs text-slate-400">You ranked <b className="text-slate-200">{l.label}</b> #{l.rank}</div>
            {l.quote && <blockquote className="my-1 border-l-2 border-emerald-500/60 pl-2 text-xs italic text-slate-300">"{l.quote}" <span className="not-italic text-slate-500">(persona's words)</span></blockquote>}
            <div className="text-slate-200"><span className={`mr-1.5 text-[11px] font-bold ${TONE[l.tone]}`}>{MARK[l.tone]}</span>{l.fact}.</div>
          </li>
        ))}
      </ul>
      {story.tradeoff && <p className="text-xs text-rose-200">{story.tradeoff}</p>}
      <p className="text-xs text-slate-300">{story.confidence}</p>
      {story.group && <p className="text-xs text-slate-300">{story.group}</p>}
      {story.flip && <p className="text-xs text-slate-300"><b className="text-slate-100">What would change it:</b> {story.flip}</p>}
      <p className="text-[11px] text-slate-500">{story.caveats.join(" ")}</p>
    </section>
  );
}
