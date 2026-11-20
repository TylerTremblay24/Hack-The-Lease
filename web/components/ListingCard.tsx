import { motion } from "framer-motion";
import type { Listing, ListingEvaluation } from "@/lib/types";
import { AcceptabilityBar } from "./AcceptabilityBar";

type Props = { listing: Listing; ev: ListingEvaluation; rank: number; prevFirst?: number | null; cap: number };
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function ListingCard({ listing: l, ev, rank, prevFirst, cap }: Props) {
  const c = ev.cost.effective;
  const lo = Math.max(0, Math.min(c.lo, cap * 0.8)), hi = Math.max(c.hi, cap * 1.05);
  const pos = (x: number) => `${((x - lo) / (hi - lo)) * 100}%`;
  return (
    <motion.div layout transition={{ type: "spring", stiffness: 350, damping: 35 }} className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">#{rank}</span>
        <span className="font-semibold">{l.name}</span>
        <span className="text-sm text-slate-500">· {l.neighborhood}</span>
        <span className="ml-auto rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600">SYNTHETIC LISTING</span>
      </div>
      <AcceptabilityBar shares={ev.rankAcceptability} prevFirst={prevFirst} />
      <div className="mt-3 text-sm">
        <b>{usd(c.mid)}/mo</b> <span className="text-slate-500">true cost, per person ({usd(c.lo)}–{usd(c.hi)})</span>
        <div className="relative mt-1 h-2 rounded bg-slate-100">
          <div className="absolute h-2 rounded bg-sky-400" style={{ left: pos(c.lo), width: `calc(${pos(c.hi)} - ${pos(c.lo)})` }} />
          <div className="absolute -top-1 h-4 border-l-2 border-red-500" style={{ left: pos(cap) }} title={`Your cap ${usd(cap)}`} />
        </div>
        {ev.pOverCap > 0.01 && <div className="mt-1 text-xs text-red-600">{Math.round(ev.pOverCap * 100)}% chance this ends up over your cap</div>}
      </div>
      <div className="mt-2 text-xs text-slate-600">
        {l.laundry === "in_unit" ? "In-unit laundry" : l.laundry === "in_building" ? "Laundry in building" : "No laundry"} · {l.bedrooms} BR · {l.leaseMonths}-month lease · {Math.round(ev.raw.commute)} min/week commute
        {ev.confidence != null && <> · confidence {Math.round(ev.confidence * 100)}%</>}
      </div>
    </motion.div>
  );
}
