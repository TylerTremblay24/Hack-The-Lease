"use client";
import { motion } from "framer-motion";
import type { Listing, ListingEvaluation, UserPlace } from "@/lib/types";
import { Badge, Icon } from "./ui";
import { Ring } from "./Ring";

type Props = {
  listing: Listing; ev: ListingEvaluation; rank: number; prevFirst?: number | null; cap: number; places?: UserPlace[];
  pinned?: boolean; canPin?: boolean; onPin?: () => void; lead?: boolean;
};
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const LAUNDRY = { in_unit: "In-unit laundry", in_building: "Laundry in building", none: "No laundry" } as const;
const spring = { type: "spring", stiffness: 350, damping: 35 } as const;

/** Where the listing came from: a link to its public source, or a SYNTHETIC label. */
function Source({ l }: { l: Listing }) {
  return l.source ? (
    <a href={l.source.url} target="_blank" rel="noreferrer" title={`${l.source.address}. From ${l.source.name}, ${l.source.asOf}. Location and travel times are estimates. Open the source to verify.`}>
      <Badge kind="web" className="hover:brightness-125">WEB LISTING · {l.source.name} ↗</Badge>
    </a>
  ) : <Badge kind="synth">SYNTHETIC LISTING</Badge>;
}

function PinButton({ pinned, canPin, onPin }: { pinned: boolean; canPin: boolean; onPin: () => void }) {
  return (
    <button onClick={onPin} disabled={!pinned && !canPin} title={!pinned && !canPin ? "Unpin one first (3 max)" : pinned ? "Remove from Compare" : "Add to Compare"} aria-pressed={pinned}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors duration-fast disabled:opacity-40 ${
        pinned ? "border-leader/60 bg-leader/15 text-leader" : "border-line-strong text-ink-muted hover:border-mist hover:text-ink"}`}>
      <Icon name="compare" size={14} />{pinned ? "Pinned" : "Compare"}
    </button>
  );
}

/** True cost range against the cap. */
function CostBar({ ev, cap }: { ev: ListingEvaluation; cap: number }) {
  const c = ev.cost.effective;
  const lo = Math.max(0, Math.min(c.lo, cap * 0.8)), hi = Math.max(c.hi, cap * 1.05);
  const pos = (x: number) => ((x - lo) / (hi - lo)) * 100;
  return (
    <div className="relative mt-2 h-1.5 rounded-full bg-line" title={`True cost ${usd(c.lo)} to ${usd(c.hi)}; your cap ${usd(cap)}`}>
      <motion.div className="absolute h-1.5 rounded-full bg-mist" initial={false} animate={{ left: `${pos(c.lo)}%`, width: `${Math.max(1.5, pos(c.hi) - pos(c.lo))}%` }} transition={spring} />
      <motion.div className="absolute -top-1 h-3.5 border-l-2 border-flip" initial={false} animate={{ left: `${pos(cap)}%` }} transition={spring} />
    </div>
  );
}

/** #1 / #2 / #3 share as one stacked bar, with a dashed tick where #1 used to be. */
function ShareBar({ shares, prevFirst }: { shares: number[]; prevFirst?: number | null }) {
  const [a, b, c] = shares.map((s) => s * 100);
  return (
    <div>
      <div className="relative flex h-1.5 w-full overflow-hidden rounded-full bg-line">
        <motion.div className="bg-leader" initial={false} animate={{ width: `${a}%` }} transition={spring} />
        <motion.div className="bg-sage" initial={false} animate={{ width: `${b}%` }} transition={spring} />
        <motion.div className="bg-forest" initial={false} animate={{ width: `${c}%` }} transition={spring} />
        {prevFirst != null && Math.abs(prevFirst * 100 - a) >= 2 && <div className="absolute inset-y-0 border-l-2 border-dashed border-flip" style={{ left: `${prevFirst * 100}%` }} />}
      </div>
      <div className="mt-1 font-mono text-micro text-ink-muted">
        <b className="text-ink">#1 {Math.round(a)}%</b>{prevFirst != null && Math.abs(prevFirst * 100 - a) >= 2 ? <span className="text-flip"> (was {Math.round(prevFirst * 100)}%)</span> : ""} · #2 {Math.round(b)}% · #3 {Math.round(c)}%
      </div>
    </div>
  );
}

function Tags({ l, ev, places }: { l: Listing; ev: ListingEvaluation; places: UserPlace[] }) {
  const tag = "rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs text-ink-muted";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={tag}>{LAUNDRY[l.laundry]}</span>
      <span className={tag}>{l.bedrooms} BR</span>
      <span className={tag}>{l.leaseMonths}-mo lease</span>
      <span className={`${tag} num`}>{Math.round(ev.raw.commute)} min/wk commute</span>
      {ev.confidence != null && <span className={`${tag} num`} title="SMAA-2 confidence: how often it wins at its own most favorable weights">confidence {Math.round(ev.confidence * 100)}%</span>}
      {places.map((p) => <span key={p.id} className={`${tag} num`}>{Math.round(ev.raw[`place:${p.id}`])} min to {p.name}</span>)}
      {places.length > 0 && <Badge kind="est" title="Walking times are estimated from straight-line distance">ESTIMATE</Badge>}
    </div>
  );
}

/** The leader gets a large card with its #1-share ring; everything else is a compact row. No photos: we don't have real ones. */
export function ListingCard({ listing: l, ev, rank, prevFirst, cap, places = [], pinned = false, canPin = true, onPin, lead = false }: Props) {
  const c = ev.cost.effective;
  const over = ev.pOverCap > 0.01 && <div className="mt-1 text-xs text-against">{Math.round(ev.pOverCap * 100)}% chance this ends up over your cap</div>;

  if (lead)
    return (
      <motion.article layout transition={spring}
        className="grid gap-4 border-b border-line bg-gradient-to-r from-leader/10 to-transparent p-4 shadow-[inset_3px_0_0_rgb(var(--leader))] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:p-5 2xl:grid-cols-[7rem_minmax(0,1fr)_auto]">
        <div className="relative hidden h-28 flex-col justify-between overflow-hidden rounded-xl border border-sage bg-forest p-3 2xl:flex">
          <svg aria-hidden viewBox="0 0 112 112" className="absolute inset-0 h-full w-full stroke-line-strong" fill="none">
            <path d="M-10 90C20 70 40 95 70 75s50-10 80-30M-10 70C25 50 45 75 75 55s45-12 75-28M-10 50C30 30 50 55 80 35s40-14 70-26M-10 110C20 92 45 112 75 96s50-8 75-22" />
          </svg>
          <span className="relative font-mono text-3xl font-semibold text-leader">#{rank}</span>
          <span className="relative text-xs font-semibold text-mist">{l.neighborhood}</span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold tracking-tight">{l.name}</h3>
            <span className="text-sm text-ink-muted 2xl:hidden">· {l.neighborhood}</span>
            <Source l={l} />
          </div>
          <div className="mt-2"><Tags l={l} ev={ev} places={places} /></div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="num text-xl font-semibold">{usd(c.mid)}</span>
            <span className="text-sm text-ink-muted">/mo true cost per person · <span className="num">{usd(c.lo)}–{usd(c.hi)}</span></span>
            <Badge kind="est" title="Utilities, fees and subletting are estimated ranges">ESTIMATE</Badge>
          </div>
          <CostBar ev={ev} cap={cap} />
          {over}
          <div className="mt-3"><ShareBar shares={ev.rankAcceptability} prevFirst={prevFirst} /></div>
        </div>
        <div className="flex items-center gap-4 sm:flex-col sm:gap-2">
          <Ring value={ev.rankAcceptability[0]} size={88} label={`#1 in ${Math.round(ev.rankAcceptability[0] * 100)}% of weightings`} />
          <span className="text-center text-xs leading-tight text-ink-muted">#1 share</span>
          {onPin && <PinButton pinned={pinned} canPin={canPin} onPin={onPin} />}
        </div>
      </motion.article>
    );

  return (
    <motion.article layout transition={spring}
      className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-b border-line px-4 py-3.5 last:border-b-0 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] md:px-5">
      <span className="num pt-0.5 text-lg text-ink-muted md:pt-0">#{rank}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-bold">{l.name}</h3>
          <span className="text-sm text-ink-muted">· {l.neighborhood}</span>
          <Source l={l} />
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm text-ink-muted">
          <span><span className="num text-ink">{usd(c.mid)}</span>/mo <span className="num">({usd(c.lo)}–{usd(c.hi)})</span></span>
          <Badge kind="est" title="Utilities, fees and subletting are estimated ranges">ESTIMATE</Badge>
          <span>· {LAUNDRY[l.laundry]} · {l.bedrooms} BR · {l.leaseMonths}-mo · <span className="num">{Math.round(ev.raw.commute)}</span> min/wk{ev.confidence != null && <> · confidence <span className="num">{Math.round(ev.confidence * 100)}%</span></>}</span>
        </div>
        {places.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-ink-muted">
            {places.map((p) => <span key={p.id}><span className="num">{Math.round(ev.raw[`place:${p.id}`])}</span> min to {p.name}</span>)}
            <Badge kind="est">ESTIMATE</Badge>
          </div>
        )}
        {over}
        <div className="mt-2 max-w-sm"><ShareBar shares={ev.rankAcceptability} prevFirst={prevFirst} /></div>
      </div>
      <div className="col-start-2 sm:col-start-auto">{onPin && <PinButton pinned={pinned} canPin={canPin} onPin={onPin} />}</div>
    </motion.article>
  );
}
