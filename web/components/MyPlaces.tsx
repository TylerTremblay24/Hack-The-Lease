"use client";
import { useState } from "react";
import type { PlaceCategory, UserPlace } from "@/lib/types";
import { lookupPlace, type PlaceLookup } from "@/lib/api";
import { searchPlaces, type Candidate } from "@/lib/geocode";

// Free OpenStreetMap lookup is the default. Set NEXT_PUBLIC_USE_CLAUDE_LOOKUP=1 to use the Claude API instead.
const USE_CLAUDE = process.env.NEXT_PUBLIC_USE_CLAUDE_LOOKUP === "1";

const CATS: { id: PlaceCategory; label: string }[] = [
  { id: "food", label: "Food" },
  { id: "coffee", label: "Coffee" },
  { id: "gym", label: "Gym and rec" },
  { id: "study", label: "Study spot" },
  { id: "market", label: "Market" },
];
const ALL_CATS: { id: PlaceCategory; label: string }[] = [...CATS, { id: "other", label: "Other" }];

type Props = { all: UserPlace[]; chosen: UserPlace[]; onAdd: (p: UserPlace) => void; onRemove: (p: UserPlace) => void };

const field = "rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 w-full";
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "place";

/** A draft place the student is confirming before it becomes a chip. */
interface Draft {
  name: string; category: PlaceCategory; lat: number | null; lng: number | null; note: string;
  source: "claude" | "list" | "manual" | "osm"; snapTo: string; message: string;
}

/** Pick the places you actually go to, or describe your own. Each one becomes a "Near ..." chip in the bank. */
export function MyPlaces({ all, chosen, onAdd, onRemove }: Props) {
  const [cat, setCat] = useState<PlaceCategory>("food");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [cands, setCands] = useState<Candidate[] | null>(null);
  const ids = new Set(chosen.map((p) => p.id));
  const options = all.filter((p) => p.category === cat && !ids.has(p.id));

  function manual(message = "") {
    setDraft({ name: text.trim(), category: "food", lat: null, lng: null, note: "", source: "manual", snapTo: "", message });
  }

  function pick(c: Candidate) {
    setCands(null);
    setDraft({ name: c.name, category: c.category, lat: c.lat, lng: c.lng, note: c.address, source: "osm", snapTo: "", message: "From OpenStreetMap. Check the name and type look right." });
  }

  async function find() {
    if (text.trim().length < 2) return;
    setBusy(true); setError(""); setDraft(null); setCands(null);
    try {
      if (!USE_CLAUDE) {
        const list = await searchPlaces(text.trim());
        if (list.length === 0) setError("No match near Ann Arbor. Try the street name, or enter it by hand.");
        else setCands(list);
        return;
      }
      const r: PlaceLookup = await lookupPlace(text.trim());
      const d = r.data;
      setDraft({
        name: d.name, category: d.category, lat: d.lat, lng: d.lng, note: d.locationNote ?? "", source: r.source, snapTo: "",
        message: r.needsLocation ? "Claude couldn't pin this down. Pick the nearest landmark below." : r.source === "list" ? "Matched one of the built-in places." : `Claude's estimate (${d.confidence} confidence). Check it looks right.`,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const snapped = draft?.snapTo ? all.find((p) => p.id === draft.snapTo) : undefined;
  const coords = snapped ? snapped.coords : draft && draft.lat != null && draft.lng != null ? { lat: draft.lat, lng: draft.lng } : null;

  function confirm() {
    if (!draft || !coords || !draft.name.trim()) return;
    let id = slug(draft.name), n = 2;
    const taken = new Set([...chosen, ...all].map((p) => p.id));
    while (taken.has(id)) id = `${slug(draft.name)}-${n++}`;
    onAdd({
      id, name: draft.name.trim(), category: draft.category, coords,
      source: snapped ? "manual" : draft.source,
      note: snapped ? `near ${snapped.name}` : draft.note || undefined,
    });
    setDraft(null); setText(""); setError("");
  }

  return (
    <section className="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm">
      <h2 className="font-semibold text-slate-100">My places</h2>
      <p className="text-xs text-slate-500">Add spots you actually use. Each becomes a "Near ..." priority chip. Walk times are estimates.</p>
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

      <div className="space-y-1.5 border-t border-slate-800 pt-2">
        <div className="text-xs font-semibold text-slate-300">Not listed? Describe it</div>
        <div className="flex gap-1.5">
          <input className={field} placeholder="e.g. Panera on State St" value={text} maxLength={160}
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && find()} />
          <button onClick={find} disabled={busy || text.trim().length < 2}
            className="shrink-0 rounded bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-slate-950 disabled:opacity-40">{busy ? "Looking..." : "Look up"}</button>
        </div>
        <p className="text-[11px] text-slate-500">{USE_CLAUDE ? "\"Look up\" sends only this short text to Claude to find the name and location. Nothing else leaves your browser." : "\"Look up\" sends only this short text to OpenStreetMap (free, no account) to find the name and location. Nothing else leaves your browser."}</p>
        {error && <p className="text-xs text-amber-300">{error} <button className="underline" onClick={() => manual()}>Enter it by hand</button></p>}
        {cands && (
          <div className="space-y-1">
            <div className="text-[11px] text-slate-400">Pick the right one:</div>
            {cands.map((c, i) => (
              <button key={i} onClick={() => pick(c)} className="block w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-left text-xs text-slate-200 hover:border-emerald-500">
                {c.name}<span className="ml-1.5 text-slate-500">{c.address}</span>
              </button>
            ))}
            <button className="text-[11px] text-slate-500 underline" onClick={() => { setCands(null); manual(); }}>None of these. Enter it by hand</button>
          </div>
        )}
        {!draft && !error && !cands && <button className="text-[11px] text-slate-500 underline hover:text-slate-300" onClick={() => manual()}>Enter by hand instead</button>}
      </div>

      {draft && (
        <div className="space-y-2 rounded-md border border-emerald-700/50 bg-emerald-500/5 p-2">
          {draft.message && <p className="text-xs text-emerald-200">{draft.message}</p>}
          <label className="block text-xs text-slate-400">Name
            <input className={`${field} mt-0.5`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label className="block text-xs text-slate-400">Type
            <select className={`${field} mt-0.5`} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as PlaceCategory })}>
              {ALL_CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label className="block text-xs text-slate-400">{draft.lat != null ? "Adjust: snap to a nearby landmark instead" : "Nearest landmark (sets the location)"}
            <select className={`${field} mt-0.5`} value={draft.snapTo} onChange={(e) => setDraft({ ...draft, snapTo: e.target.value })}>
              <option value="">{draft.lat != null ? "Use the location found" : "Choose one"}</option>
              {all.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          {coords && <p className="text-[11px] text-slate-500">{snapped ? `Location: at ${snapped.name}` : draft.note ? `Location: ${draft.note}` : "Location found"} (ESTIMATE)</p>}
          <div className="flex gap-2">
            <button onClick={confirm} disabled={!coords || !draft.name.trim()} className="rounded bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-slate-950 disabled:opacity-40">Add as a chip</button>
            <button onClick={() => setDraft(null)} className="text-xs text-slate-400 underline">Cancel</button>
          </div>
        </div>
      )}

      {chosen.length > 0 && (
        <div className="space-y-1 border-t border-slate-800 pt-2">
          {chosen.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs text-slate-300">
              <span>{p.name}{p.source === "claude" && <span className="ml-1.5 rounded bg-sky-500/20 px-1 text-[10px] text-sky-300">CLAUDE ESTIMATE</span>}{p.source === "osm" && <span className="ml-1.5 rounded bg-teal-500/20 px-1 text-[10px] text-teal-300">OSM</span>}{p.source === "manual" && <span className="ml-1.5 rounded bg-slate-700 px-1 text-[10px] text-slate-300">USER</span>}</span>
              <button onClick={() => onRemove(p)} className="text-slate-500 hover:text-rose-400" aria-label={`Remove ${p.name}`}>×</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
