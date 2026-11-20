"use client";
import type { Story } from "@/lib/story";
import { Disclosure } from "./Disclosure";
import { Icon, btn, label, panel } from "./ui";

const TONE = { strong: "text-leader", ok: "text-mist", weak: "text-against" } as const;
const PILL = { strong: "border-leader/40 bg-leader/10", ok: "border-mist/30 bg-mist/5", weak: "border-against/40 bg-against/10" } as const;
const MARK = { strong: "STRONG", ok: "OK", weak: "WEAK" } as const;

/** "Why this fits you": at a glance, how the pick does on your top priorities and the trade-off; the student's own
 *  words, the numbers and the caveats open in a dropdown. */
export function StoryCard({ story, onSummary }: { story: Story; onSummary: () => void }) {
  const quotes = story.lines.some((l) => l.quote);
  return (
    <section className={`${panel} p-4 text-sm md:p-5`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className={`${label} text-leader`}>Why this fits you</div>
          <h2 className="mt-1 text-lg font-bold leading-snug tracking-tight">{story.headline}</h2>
        </div>
        <button onClick={onSummary} className={`${btn} ml-auto shrink-0`}><Icon name="summary" size={16} />One-page summary</button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {story.lines.map((l) => (
          <span key={l.criterion} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${PILL[l.tone]}`} title={`${l.fact}.`}>
            <span className="num text-ink-muted">#{l.rank}</span>{l.label}<span className={`font-mono text-micro font-semibold ${TONE[l.tone]}`}>{MARK[l.tone]}</span>
          </span>
        ))}
      </div>
      {story.tradeoff && <p className="mt-3 text-xs text-ink-muted"><b className="text-against">The trade-off:</b> {story.tradeoff.replace(/^The trade-off:\s*/i, "")}</p>}

      <Disclosure title={quotes ? "In your own words, with the numbers" : "The numbers behind it"} className="mt-3 border-t border-line pt-3">
        <ul className="mt-3 space-y-2">
          {story.lines.map((l) => (
            <li key={l.criterion} className="grid gap-x-4 gap-y-1 rounded-xl border border-line bg-surface-2 px-3.5 py-3 md:grid-cols-2 md:items-center">
              <div className={`${label} md:col-span-2`}>You ranked <span className="text-ink">{l.label}</span> #{l.rank}</div>
              {l.quote && <blockquote className="text-xs italic text-ink-muted">&ldquo;{l.quote}&rdquo; <span className="not-italic text-ink-faint">(persona&apos;s words)</span></blockquote>}
              <div><span className={`mr-1.5 font-mono text-micro font-semibold ${TONE[l.tone]}`}>{MARK[l.tone]}</span>{l.fact}.</div>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1.5 text-xs text-ink-muted">
          <p>{story.confidence}</p>
          {story.group && <p>{story.group}</p>}
          {story.flip && <p><b className="text-flip">What would change it:</b> {story.flip}</p>}
          <p className="text-ink-faint">{story.caveats.join(" ")}</p>
        </div>
      </Disclosure>
    </section>
  );
}
