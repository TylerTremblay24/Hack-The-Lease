"use client";
import { useEffect, useRef, useState } from "react";
import type { PlaceCategory, UserPlace } from "@/lib/types";
import { lookupPlace, type PlaceLookup } from "@/lib/api";
import { searchPlaces, type Candidate } from "@/lib/geocode";
import { Badge, Icon, btnPrimary, field, label, linkBtn } from "./ui";

// Free OpenStreetMap lookup is the default. Set NEXT_PUBLIC_USE_CLAUDE_LOOKUP=1 to use the Claude API instead.
const USE_CLAUDE = process.env.NEXT_PUBLIC_USE_CLAUDE_LOOKUP === "1";

const CATS: { id: PlaceCategory; label: string }[] = [
  { id: "food", label: "Food" },
  { id: "coffee", label: "Coffee" },
  { id: "gym", label: "Gym and rec" },
  { id: "study", label: "Study" },
  { id: "market", label: "Market" },
];
const ALL_CATS: { id: PlaceCategory; label: string }[] = [...CATS, { id: "other", label: "Other" }];

type Props = {
  all: UserPlace[]; chosen: UserPlace[];
  onAdd: (p: UserPlace) => void; onRemove: (p: UserPlace) => void;
  rankOf: (p: UserPlace) => number | null; onRank: (p: UserPlace) => void;
  focusKey?: number; // bump to focus the search box
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "place";

/** A draft place the student is confirming before it becomes a chip. */
interface Draft {
  name: string; category: PlaceCategory; lat: number | null; lng: number | null; note: string;
  source: "claude" | "list" | "manual" | "osm"; snapTo: string; message: string;
}

/** The smart chip builder: name any place you go and it becomes a "Near ..." priority, scored by the walk from
 *  every apartment. Lives inside the chip bank. */
export function ChipBuilder({ all, chosen, onAdd, onRemove, rankOf, onRank, focusKey = 0 }: Props) {
  const [cat, setCat] = useState<PlaceCategory | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [cands, setCands] = useState<Candidate[] | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (focusKey) input.current?.focus(); }, [focusKey]);
  const ids = new Set(chosen.map((p) => p.id));
  const options = cat ? all.filter((p) => p.category === cat && !ids.has(p.id)) : [];

  function manual(message = "") {
    setCands(null); setError("");
    setDraft({ name: text.trim(), category: "food", lat: null, lng: null, note: "", source: "manual", snapTo: "", message });
  }
  function pick(c: Candidate) {
    setCands(null);
    setDraft({ name: c.name, category: c.category, lat: c.lat, lng: c.lng, note: c.address, source: "osm", snapTo: "", message: "Found on OpenStreetMap. Check the name and type look right." });
  }
  async function find() {
    if (text.trim().length < 2) return;
    setBusy(true); setError(""); setDraft(null); setCands(null);
    try {
      if (!USE_CLAUDE) {
        const list = await searchPlaces(text.trim());
        if (list.length === 0) setError("No match near Ann Arbor. Try adding the street name, or");
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
      setError("Couldn't reach the place lookup right now. Pick a local favorite below, or");
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
    onAdd({ id, name: draft.name.trim(), category: draft.category, coords, source: snapped ? "manual" : draft.source, note: snapped ? `near ${snapped.name}` : draft.note || undefined });
    setDraft(null); setText(""); setError("");
  }

  const pill = (on: boolean) => `rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors duration-fast ${on ? "border-flip/60 bg-flip/10 text-flip" : "border-line-strong text-ink-muted hover:text-ink"}`;
  const badge = (p: UserPlace) => p.source === "claude" ? <Badge kind="claude">CLAUDE ESTIMATE</Badge> : p.source === "osm" ? <Badge kind="osm">OSM</Badge> : p.source === "manual" ? <Badge kind="user">USER</Badge> : <Badge kind="est">ESTIMATE</Badge>;

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-1.5 font-mono text-label font-semibold uppercase text-flip"><Icon name="spark" size={14} />Build a smart chip</div>
        <h3 className="mt-1 text-base font-bold">Where do you actually go?</h3>
        <p className="mt-0.5 text-xs text-ink-muted">Name a spot (your gym, a café, a job) and it becomes a <b className="text-ink">Near …</b> priority. We measure the walk from every apartment.</p>
      </div>

      <div className="flex gap-1.5">
        <input ref={input} className={field} placeholder='Try "Panera on State St"' value={text} maxLength={160} aria-label="Describe a place you go"
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && find()} />
        <button onClick={find} disabled={busy || text.trim().length < 2} className={`${btnPrimary} shrink-0 px-3 text-xs`}>{busy ? "Looking…" : "Look up"}</button>
      </div>
      <p className="text-xs text-ink-faint">Only this short text is sent, to {USE_CLAUDE ? "Claude" : "OpenStreetMap (free, no account)"}, and only when you press Look up.{" "}
        {!draft && !cands && <button className={linkBtn} onClick={() => manual()}>Enter by hand</button>}</p>

      {error && (
        <div role="alert" className="rounded-ctl border border-flip/35 bg-flip/10 p-2.5 text-xs text-ink">
          {error} <button className={linkBtn} onClick={() => manual()}>enter it by hand</button>.
        </div>
      )}

      {cands && (
        <div className="space-y-1">
          <div className="text-xs text-ink-muted">Pick the right one:</div>
          {cands.map((c, i) => (
            <button key={i} onClick={() => pick(c)} className="block w-full rounded-ctl border border-line bg-surface-2 px-2.5 py-1.5 text-left text-xs text-ink transition-colors duration-fast hover:border-mist">
              {c.name}<span className="ml-1.5 text-ink-faint">{c.address}</span>
            </button>
          ))}
          <button className={linkBtn} onClick={() => manual()}>None of these. Enter it by hand</button>
        </div>
      )}

      {draft && (
        <div className="space-y-2 rounded-xl border border-leader/40 bg-leader/5 p-3">
          {draft.message && <p className="text-xs text-leader">{draft.message}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs text-ink-muted">Name
              <input className={`${field} mt-1`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label className="block text-xs text-ink-muted">Type
              <select className={`${field} mt-1`} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as PlaceCategory })}>
                {ALL_CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-xs text-ink-muted">{draft.lat != null ? "Adjust: snap to a nearby landmark instead" : "Nearest landmark (sets the location)"}
            <select className={`${field} mt-1`} value={draft.snapTo} onChange={(e) => setDraft({ ...draft, snapTo: e.target.value })}>
              <option value="">{draft.lat != null ? "Use the location found" : "Choose one"}</option>
              {all.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          {coords && <p className="flex items-center gap-1.5 text-xs text-ink-faint">{snapped ? `Location: at ${snapped.name}` : draft.note ? `Location: ${draft.note}` : "Location found"} <Badge kind="est">ESTIMATE</Badge></p>}
          <div className="flex items-center gap-3">
            <button onClick={confirm} disabled={!coords || !draft.name.trim()} className={`${btnPrimary} px-3 text-xs`}><Icon name="spark" size={14} />Make it a chip</button>
            <button onClick={() => setDraft(null)} className={linkBtn}>Cancel</button>
          </div>
        </div>
      )}

      <div>
        <div className={`${label} mb-1.5`}>Or start from a local favorite</div>
        <div className="flex flex-wrap gap-1">
          {CATS.map((c) => <button key={c.id} onClick={() => setCat(cat === c.id ? null : c.id)} aria-pressed={cat === c.id} className={pill(cat === c.id)}>{c.label}</button>)}
        </div>
        {cat && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {options.map((p) => (
              <button key={p.id} onClick={() => onAdd(p)} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs text-ink transition-colors duration-fast hover:border-mist">
                <Icon name="pin" size={12} className="text-leader" />{p.name}
              </button>
            ))}
            {options.length === 0 && <span className="text-xs text-ink-faint">Nothing else in this category.</span>}
          </div>
        )}
      </div>

      {chosen.length > 0 && (
        <div className="space-y-1.5 border-t border-line pt-3">
          <div className={label}>Your smart chips</div>
          {chosen.map((p) => {
            const r = rankOf(p);
            return (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                <Icon name="pin" size={14} className="text-leader" />
                <span className="min-w-0 truncate font-semibold">Near {p.name}</span>
                {badge(p)}
                <span className="ml-auto flex shrink-0 items-center gap-1">
                  {r != null
                    ? <span className="num text-ink-muted">ranked #{r}</span>
                    : <button onClick={() => onRank(p)} className="rounded-full border border-line-strong px-2 py-0.5 font-semibold text-ink-muted hover:text-ink">+ Rank it</button>}
                  <button onClick={() => onRemove(p)} aria-label={`Delete the ${p.name} chip`} className="grid h-5 w-5 place-items-center rounded text-ink-faint hover:text-against"><Icon name="close" size={12} /></button>
                </span>
              </div>
            );
          })}
          <p className="text-xs text-ink-faint">Walk times are estimates. Set a hard walk limit for any of these under Rules.</p>
        </div>
      )}
    </div>
  );
}
