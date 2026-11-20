"use client";
import { motion } from "framer-motion";
import { useRef } from "react";
import type { DecisionResult, Listing } from "@/lib/types";
import { Count } from "./Count";
import { Badge, label } from "./ui";
import { VERDICT } from "./ChangeStrip";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

const PILL: Record<DecisionResult["verdict"], string> = {
  robust: "bg-leader text-ink-inverse",
  leaning: "bg-mist text-ink-inverse",
  "toss-up": "bg-flip text-ink-inverse",
  "only-option": "bg-mist text-ink-inverse",
  none: "bg-against text-ink-inverse",
};

type Props = { result: DecisionResult; listings: Listing[]; group?: string[]; children?: React.ReactNode };

/** The answer, first: verdict, the pick, and a balance that tilts toward whichever listing wins more often.
 *  The two pans stay attached to the same two listings while they trade places, so a flip swings the beam. */
export function DecisionHero({ result, listings, group, children }: Props) {
  const find = (id: string | null) => (id ? listings.find((l) => l.id === id) : undefined);
  const ev = (id: string) => result.evaluations.find((e) => e.listingId === id);
  const winner = find(result.winnerId);
  const wEv = winner ? ev(winner.id) : undefined;
  const runner = find(result.runnerUpId);

  const pairRef = useRef<[string, string | null] | null>(null);
  if (!winner) pairRef.current = null;
  else {
    const p = pairRef.current, r = runner?.id ?? null;
    if (!p || !(p.includes(winner.id) && p.includes(r))) pairRef.current = [winner.id, r];
  }
  const pair = pairRef.current;
  const share = (id: string | null) => (id ? ev(id)?.rankAcceptability[0] ?? 0 : 0);
  const [L, R] = pair ?? [null, null];
  const sL = share(L), sR = share(R);
  const angle = pair ? Math.max(-7, Math.min(7, -(sL - sR) * 12)) : 0;

  const priceTip = runner && result.tippingPoints.find((t) => t.kind === "price" && t.listingId === runner.id && t.amount != null);
  const swapTip = result.tippingPoints.find((t) => t.kind === "swap");
  const flipNote = priceTip ? `Flips at −${usd(priceTip.amount!)}/mo` : swapTip ? "Flips if you reorder" : runner ? "Nothing nearby flips it" : null;

  return (
    <section className="relative -mx-4 overflow-hidden border-b border-line px-4 pb-6 pt-7 md:-mx-7 md:px-7" aria-live="polite">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[url('/brand/skyline.jpg')] bg-[length:auto_100%] bg-right bg-no-repeat opacity-80 [mask-image:linear-gradient(90deg,transparent_30%,black_80%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg via-bg/75 to-bg/30" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg to-transparent to-50%" />

      <div className="relative grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_theme(width.balance)]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <span className={`rounded-full px-2.5 py-1 font-mono text-label font-semibold uppercase ${PILL[result.verdict]}`}>{VERDICT[result.verdict]}</span>
            <span className={label}>±{(result.monteCarloSE * 100).toFixed(0)} pt · <span className="num">{result.samples.toLocaleString("en-US")}</span> draws</span>
            {winner && (winner.source
              ? <a href={winner.source.url} target="_blank" rel="noreferrer" title={`${winner.source.address}. From ${winner.source.name}, ${winner.source.asOf}.`}><Badge kind="web">WEB LISTING · {winner.source.name} ↗</Badge></a>
              : <Badge kind="synth">SYNTHETIC LISTING</Badge>)}
            {group && <span className={label}>Group of {group.length}: {group.join(", ")}</span>}
          </div>
          {winner && wEv ? (
            <>
              <h1 className="text-display-sm md:text-display">{winner.name}</h1>
              <p className="mt-3 max-w-3xl text-base text-ink-muted">
                {winner.neighborhood} · <span className="num text-ink">{usd(wEv.cost.effective.mid)}</span>/mo true cost per person · wins{" "}
                <b className="text-leader"><Count value={wEv.rankAcceptability[0] * 100} format={(n) => `${Math.round(n)}%`} /></b> of the {result.samples.toLocaleString("en-US")} weightings that respect {group ? "the group's" : "your"} order
              </p>
            </>
          ) : (
            <>
              <h1 className="text-display-sm md:text-display">Nothing fits all your rules yet.</h1>
              <p className="mt-3 max-w-2xl text-base text-ink-muted">Loosen one must-have or widen your budget in the panel on the left. The near misses below show what each rule is costing you.</p>
            </>
          )}
        </div>

        {pair && (
          <div className="rounded-card border border-line-strong bg-bg/80 p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <span className={label}>How the decision leans</span>
              {flipNote && <span className="font-mono text-label font-semibold uppercase text-flip">{flipNote}</span>}
            </div>
            <div className="relative mx-7 mt-1 h-28" role="img" aria-label={`${find(L)?.name} ${pct(sL)} versus ${R ? `${find(R)?.name} ${pct(sR)}` : "no runner-up"}`}>
              <div className="absolute inset-y-2 left-1/2 border-l border-dashed border-line-strong" />
              <motion.div className="absolute left-0 right-0 top-16 h-1 origin-center rounded-full bg-cream"
                initial={false} animate={{ rotate: angle }} transition={{ type: "spring", stiffness: 140, damping: 11, mass: 0.9 }}>
                {[{ id: L, s: sL, side: "left-0 -translate-x-1/2" }, { id: R, s: sR, side: "right-0 translate-x-1/2" }].map((p, i) => (
                  <div key={i} className={`absolute bottom-1 ${p.side} flex flex-col items-center`}>
                    <span className={`font-mono text-2xl font-semibold ${p.s >= (i ? sL : sR) && p.id ? "text-leader" : "text-ink-muted"}`}>
                      {p.id ? <Count value={p.s * 100} format={(n) => `${Math.round(n)}%`} /> : "—"}
                    </span>
                    <span className={`mt-0.5 h-3 w-3 rounded-full border-2 border-cream ${p.s >= (i ? sL : sR) && p.id ? "bg-leader" : "bg-bg"}`} />
                  </div>
                ))}
              </motion.div>
              <svg className="absolute left-1/2 top-16 mt-0.5 -translate-x-1/2" width="34" height="30" viewBox="0 0 34 30" aria-hidden>
                <path d="M17 0L34 30H0z" className="fill-sage" />
              </svg>
            </div>
            <div className="flex justify-between gap-4 text-xs">
              <span className={`truncate ${sL >= sR ? "font-semibold text-leader" : "text-ink-muted"}`}>{find(L)?.name}</span>
              <span className={`truncate text-right ${sR > sL ? "font-semibold text-leader" : "text-ink-muted"}`}>{R ? find(R)?.name : "No runner-up"}</span>
            </div>
          </div>
        )}
      </div>
      {children && <div className="relative mt-5">{children}</div>}
    </section>
  );
}
