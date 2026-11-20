import { motion } from "framer-motion";
import type { Listing, ListingEvaluation, UserPlace } from "@/lib/types";
import { AcceptabilityBar } from "./AcceptabilityBar";

type Props = { listing: Listing; ev: ListingEvaluation; rank: number; prevFirst?: number | null; cap: number; places?: UserPlace[]; pinned?: boolean; canPin?: boolean; onPin?: () => void };
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function ListingCard({ listing: l, ev, rank, prevFirst, cap, places = [], pinned = false, canPin = true, onPin }: Props) {
  const c = ev.cost.effective;
  const lo = Math.max(0, Math.min(c.lo, cap * 0.8)), hi = Math.max(c.hi, cap * 1.05);
  const pos = (x: number) => `${((x - lo) / (hi - lo)) * 100}%`;
  return (
    <motion.div layout transition={{ type: "spring", stiffness: 350, damping: 35 }} className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-emerald-500 px-2 py-0.5 text-xs font-bold text-slate-950">#{rank}</span>
        <span className="font-semibold text-slate-100">{l.name}</span>
        <span className="text-sm text-slate-500">· {l.neighborhood}</span>
        {l.source ? (
          <a href={l.source.url} target="_blank" rel="noreferrer" title={`${l.source.address}. From ${l.source.name}, ${l.source.asOf}. Location and travel times are estimates. Open the source to verify.`}
            className="ml-auto rounded bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-sky-300 hover:bg-sky-500/25">WEB LISTING · {l.source.name} ↗</a>
        ) : (
          <span className="ml-auto rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-400">SYNTHETIC LISTING</span>
        )}
        {onPin && (
          <button onClick={onPin} disabled={!pinned && !canPin} title={!pinned && !canPin ? "Unpin one first (3 max)" : undefined}
            className={`rounded border px-2 py-0.5 text-xs ${pinned ? "border-emerald-500 bg-emerald-500/15 text-emerald-200" : "border-slate-700 text-slate-400 hover:text-slate-200"} disabled:opacity-40`}>
            {pinned ? "Pinned" : "Compare"}
          </button>
        )}
      </div>
      <AcceptabilityBar shares={ev.rankAcceptability} prevFirst={prevFirst} />
      <div className="mt-3 text-sm">
        <b className="text-slate-100">{usd(c.mid)}/mo</b> <span className="text-slate-400">true cost, per person ({usd(c.lo)}–{usd(c.hi)})</span>
        <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-slate-400" title="Utilities, fees and subletting are estimated ranges">ESTIMATE</span>
        <div className="relative mt-1 h-2 rounded bg-slate-800">
          <div className="absolute h-2 rounded bg-sky-500" style={{ left: pos(c.lo), width: `calc(${pos(c.hi)} - ${pos(c.lo)})` }} />
          <div className="absolute -top-1 h-4 border-l-2 border-rose-400" style={{ left: pos(cap) }} title={`Your cap ${usd(cap)}`} />
        </div>
        {ev.pOverCap > 0.01 && <div className="mt-1 text-xs text-rose-400">{Math.round(ev.pOverCap * 100)}% chance this ends up over your cap</div>}
      </div>
      <div className="mt-2 text-xs text-slate-400">
        {l.laundry === "in_unit" ? "In-unit laundry" : l.laundry === "in_building" ? "Laundry in building" : "No laundry"} · {l.bedrooms} BR · {l.leaseMonths}-month lease · {Math.round(ev.raw.commute)} min/week commute
        {ev.confidence != null && <> · confidence {Math.round(ev.confidence * 100)}%</>}
      </div>
      {places.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-sky-300">
          {places.map((p) => <span key={p.id}>{Math.round(ev.raw[`place:${p.id}`])} min to {p.name}</span>)}
          <span className="rounded bg-slate-800 px-1.5 text-[10px] font-semibold text-slate-400">ESTIMATE</span>
        </div>
      )}
    </motion.div>
  );
}
