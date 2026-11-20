"use client";
import { useState } from "react";
import type { PlaceCategory, UserPlace } from "@/lib/types";

const CATS: { id: PlaceCategory; label: string }[] = [
  { id: "food", label: "Food" },
  { id: "coffee", label: "Coffee" },
  { id: "gym", label: "Gym and rec" },
  { id: "study", label: "Study spot" },
  { id: "market", label: "Market" },
];

type Props = { all: UserPlace[]; chosen: UserPlace[]; onAdd: (p: UserPlace) => void; onRemove: (p: UserPlace) => void };

/** Pick the places you actually go to. Each one becomes a "Near ..." chip in the bank. Stays in your browser. */
export function MyPlaces({ all, chosen, onAdd, onRemove }: Props) {
  const [cat, setCat] = useState<PlaceCategory>("food");
  const ids = new Set(chosen.map((p) => p.id));
  const options = all.filter((p) => p.category === cat && !ids.has(p.id));
  return (
    <section className="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm">
      <h2 className="font-semibold text-slate-100">My places</h2>
      <p className="text-xs text-slate-500">Add spots you actually use. Each becomes a "Near ..." priority chip. Walk times are estimates and stay in your browser.</p>
      <div className="flex flex-wrap gap-1">
        {CATS.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${cat === c.id ? "border-emerald-500 bg-emerald-500/15 text-emerald-200" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((p) => (
          <button key={p.id} onClick={() => onAdd(p)} className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:border-emerald-500">
            + {p.name}
          </button>
        ))}
        {options.length === 0 && <span className="text-xs text-slate-600">Nothing else in this category.</span>}
      </div>
      {chosen.length > 0 && (
        <div className="space-y-1 border-t border-slate-800 pt-2">
          {chosen.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs text-slate-300">
              <span>{p.name}</span>
              <button onClick={() => onRemove(p)} className="text-slate-500 hover:text-rose-400" aria-label={`Remove ${p.name}`}>×</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
