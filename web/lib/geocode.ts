// Free place lookup: OpenStreetMap data through Photon (primary) and Nominatim (fallback).
// No API key, no credits. Runs in the browser; only the short search text is sent.
import type { PlaceCategory } from "./types";

export interface Candidate {
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: PlaceCategory;
}

// Ann Arbor search box (lon/lat). Results outside it are dropped so a "Panera" in Ohio never shows up.
export const BBOX = { west: -83.82, south: 42.22, east: -83.65, north: 42.33 };
const CENTER = { lat: 42.28, lng: -83.74 };

export const inBox = (lat: number, lng: number) =>
  lat >= BBOX.south && lat <= BBOX.north && lng >= BBOX.west && lng <= BBOX.east;

/** Map OpenStreetMap tags to our place categories. */
export function categoryFor(key?: string, value?: string): PlaceCategory {
  const v = (value ?? "").toLowerCase();
  if (key === "amenity") {
    if (["restaurant", "fast_food", "food_court", "pub", "bar", "ice_cream", "biergarten"].includes(v)) return "food";
    if (["cafe", "coffee_shop"].includes(v)) return "coffee";
    if (["library", "university", "college"].includes(v)) return "study";
    if (["marketplace"].includes(v)) return "market";
  }
  if (key === "leisure" && ["fitness_centre", "sports_centre", "gym", "swimming_pool", "pitch", "stadium"].includes(v)) return "gym";
  if (key === "shop" && ["supermarket", "convenience", "greengrocer", "grocery", "wholesale", "department_store"].includes(v)) return "market";
  if (key === "shop" && ["bakery", "coffee", "tea"].includes(v)) return "coffee";
  if (key === "building" && ["university", "college"].includes(v)) return "study";
  return "other";
}

/** Tidy the typed text: trim, collapse spaces, add the city so a bare name is searched in Ann Arbor. */
export function normalizeQuery(text: string): string {
  const t = text.replace(/\s+/g, " ").trim().slice(0, 120);
  return /ann arbor|\bmi\b|michigan/i.test(t) ? t : `${t} Ann Arbor`;
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: { name?: string; street?: string; housenumber?: string; city?: string; osm_key?: string; osm_value?: string };
}
interface NominatimRow {
  display_name?: string; name?: string; lat?: string; lon?: string; class?: string; type?: string;
  address?: Record<string, string>;
}

export function fromPhoton(json: { features?: PhotonFeature[] }): Candidate[] {
  const out: Candidate[] = [];
  for (const f of json.features ?? []) {
    const c = f.geometry?.coordinates, p = f.properties;
    if (!c || !p?.name) continue;
    const [lng, lat] = c;
    if (!inBox(lat, lng)) continue;
    const street = [p.housenumber, p.street].filter(Boolean).join(" ");
    out.push({ name: p.name, address: [street, p.city].filter(Boolean).join(", "), lat, lng, category: categoryFor(p.osm_key, p.osm_value) });
  }
  return out;
}

export function fromNominatim(rows: NominatimRow[]): Candidate[] {
  const out: Candidate[] = [];
  for (const r of rows ?? []) {
    const lat = Number(r.lat), lng = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inBox(lat, lng)) continue;
    const a = r.address ?? {};
    const name = r.name || (r.display_name ?? "").split(",")[0];
    if (!name) continue;
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    out.push({ name, address: street, lat, lng, category: categoryFor(r.class, r.type) });
  }
  return out;
}

/** Drop near-duplicates (same name within ~60 m) and cap the list. */
export function dedupe(list: Candidate[], max = 5): Candidate[] {
  const kept: Candidate[] = [];
  for (const c of list) {
    const dup = kept.some((k) => k.name.toLowerCase() === c.name.toLowerCase() && Math.abs(k.lat - c.lat) < 0.0006 && Math.abs(k.lng - c.lng) < 0.0006);
    if (!dup) kept.push(c);
    if (kept.length >= max) break;
  }
  return kept;
}

async function getJson(url: string, signal: AbortSignal) {
  const r = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`status ${r.status}`);
  return r.json();
}

/** Search OpenStreetMap for a place near campus. Tries Photon, then Nominatim. Throws a friendly error if both fail. */
export async function searchPlaces(text: string, signal?: AbortSignal): Promise<Candidate[]> {
  const q = encodeURIComponent(normalizeQuery(text));
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  signal?.addEventListener("abort", () => ctl.abort());
  let reached = false;
  try {
    try {
      const url = `https://photon.komoot.io/api/?q=${q}&lat=${CENTER.lat}&lon=${CENTER.lng}&limit=8&lang=en&bbox=${BBOX.west},${BBOX.south},${BBOX.east},${BBOX.north}`;
      const res = dedupe(fromPhoton(await getJson(url, ctl.signal)));
      reached = true;
      if (res.length) return res;
    } catch { /* fall through to Nominatim */ }
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=jsonv2&addressdetails=1&limit=8&bounded=1&viewbox=${BBOX.west},${BBOX.north},${BBOX.east},${BBOX.south}`;
      const res = dedupe(fromNominatim(await getJson(url, ctl.signal)));
      reached = true;
      return res;
    } catch { /* handled below */ }
    if (!reached) throw new Error("Couldn't reach the free map lookup. You can still enter the place by hand.");
    return [];
  } finally {
    clearTimeout(timer);
  }
}
