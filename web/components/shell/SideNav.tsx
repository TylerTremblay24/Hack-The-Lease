"use client";
import { useEffect, useRef, useState } from "react";
import { Leaf } from "../brand/Leaf";
import { Icon, label, type IconName } from "../ui";

export type NavTarget = "decide" | "compare" | "group" | "summary" | "tune";
type Bank = "all" | "web" | "demo";

interface Props {
  personas: { name: string; synthetic: boolean }[];
  persona: number;
  onPersona: (i: number) => void;
  bank: Bank;
  banks: { id: Bank; label: string; count: number }[];
  onBank: (b: Bank) => void;
  pinned: number;
  roommates: number;
  onNav: (t: NavTarget) => void;
  active: NavTarget;
}

const ITEMS: { id: NavTarget; label: string; icon: IconName }[] = [
  { id: "decide", label: "Decide", icon: "decide" },
  { id: "compare", label: "Compare", icon: "compare" },
  { id: "group", label: "Roommates", icon: "group" },
  { id: "summary", label: "Summary", icon: "summary" },
  { id: "tune", label: "Assumptions", icon: "tune" },
];

/** Left navigation. Collapses to icons below 1400 px and becomes a top bar on phones.
 *  The persona picker acts as the account; the listing-bank switch is tucked behind a small "Data" control. */
export function SideNav({ personas, persona, onPersona, bank, banks, onBank, pinned, roommates, onNav, active }: Props) {
  const [dataOpen, setDataOpen] = useState(false);
  const pop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!dataOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !pop.current?.contains(e.target as Node)) setDataOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => { window.removeEventListener("mousedown", close); window.removeEventListener("keydown", close); };
  }, [dataOpen]);
  const p = personas[persona];
  const current = banks.find((b) => b.id === bank)!;
  const count = (id: NavTarget) => (id === "compare" && pinned ? `${pinned}/3` : id === "group" && roommates ? `${roommates}` : null);

  return (
    <nav aria-label="Main"
      className="sticky top-0 z-30 flex items-center gap-1 border-b border-line bg-bg/95 px-3 py-2 backdrop-blur md:h-screen md:w-nav-sm md:shrink-0 md:flex-col md:items-stretch md:gap-1.5 md:border-b-0 md:border-r md:bg-gradient-to-b md:from-surface md:to-bg md:px-3 md:py-6 wide:w-nav wide:px-3.5">
      <div className="flex items-center gap-2.5 pr-2 md:justify-center md:pb-5 md:pr-0 wide:justify-start wide:px-2">
        <Leaf size={30} className="text-mist" />
        <span className="hidden text-lg font-bold tracking-tight sm:inline md:hidden wide:inline wide:text-xl">New Lease</span>
      </div>

      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto md:flex-none md:flex-col md:gap-1.5 md:overflow-visible">
        {ITEMS.map((it) => (
          <button key={it.id} onClick={() => onNav(it.id)} title={it.label} aria-current={active === it.id ? "page" : undefined}
            className={`flex items-center gap-3 rounded-ctl px-2.5 py-2 text-sm font-medium transition-colors duration-fast md:justify-center md:py-2.5 wide:justify-start wide:px-3 ${
              active === it.id ? "bg-surface-2 text-ink shadow-[inset_2px_0_0_rgb(var(--leader))]" : "text-ink-muted hover:bg-surface-2/60 hover:text-ink"}`}>
            <Icon name={it.icon} />
            <span className="whitespace-nowrap max-md:sr-only md:hidden wide:inline">{it.label}</span>
            {count(it.id) && <span className="ml-auto hidden font-mono text-label text-ink-faint wide:inline">{count(it.id)}</span>}
          </button>
        ))}
      </div>

      <div className="relative flex items-center gap-2 md:mt-auto md:flex-col md:items-stretch md:gap-3 md:border-t md:border-line md:pt-4">
        <div className={`${label} hidden wide:block`}>Profile</div>
        <label className="relative flex cursor-pointer items-center gap-2.5 rounded-ctl md:justify-center md:border md:border-line md:bg-surface md:p-2 wide:justify-start" title="Switch demo persona">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-sage bg-forest text-sm font-bold text-mist">{p.name[0]}</span>
          <span className="hidden min-w-0 wide:block">
            <span className="block truncate text-sm font-semibold">{p.name}</span>
            {p.synthetic && <span className="font-mono text-micro text-badge-synth-ink">SYNTHETIC PERSONA</span>}
          </span>
          <span className="sr-only">Demo persona</span>
          <select value={persona} onChange={(e) => onPersona(Number(e.target.value))} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Demo persona">
            {personas.map((x, i) => <option key={i} value={i}>{x.name}{x.synthetic ? " (synthetic)" : ""}</option>)}
          </select>
        </label>

        <div ref={pop} className="relative">
          <button onClick={() => setDataOpen((o) => !o)} aria-expanded={dataOpen} title="Listing data source"
            className="flex w-full items-center gap-2 rounded-ctl px-2 py-1.5 text-xs text-ink-faint transition-colors duration-fast hover:text-ink md:justify-center wide:justify-start">
            <Icon name="data" size={16} />
            <span className="hidden wide:inline">Data: {current.label} <span className="num">{current.count}</span></span>
          </button>
          {dataOpen && (
            <div role="dialog" aria-label="Listing data source"
              className="absolute right-0 top-full z-40 mt-2 w-72 rounded-card border border-line-strong bg-surface p-3 shadow-e2 md:bottom-0 md:left-full md:right-auto md:top-auto md:ml-3 md:mt-0">
              <div className={label}>Listing bank</div>
              <div className="mt-2 flex rounded-full border border-line-strong p-0.5">
                {banks.map((b) => (
                  <button key={b.id} onClick={() => { onBank(b.id); setDataOpen(false); }}
                    className={`flex-1 rounded-full px-2 py-1 text-xs font-semibold transition-colors duration-fast ${bank === b.id ? "bg-surface-2 text-ink" : "text-ink-muted hover:text-ink"}`}>
                    {b.label} <span className="num">{b.count}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                Web listings were collected by hand from public pages (each card links its source). Rents and amenities are as listed; locations, travel times, noise and missing sizes are estimates. Demo listings are synthetic.
              </p>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
