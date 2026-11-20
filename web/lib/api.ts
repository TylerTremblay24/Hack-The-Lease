// Thin client for the FastAPI service. The app works without it: curated places and manual entry need no API.
import type { PlaceCategory } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface PlaceLookup {
  source: "claude" | "list";
  needsLocation: boolean;
  data: { name: string; category: PlaceCategory; lat: number | null; lng: number | null; confidence: "high" | "medium" | "low"; locationNote?: string | null };
}

/** Ask Claude (through the API) to turn "Panera on State St" into a place. Sends only this short text. */
export async function lookupPlace(text: string, signal?: AbortSignal): Promise<PlaceLookup> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  signal?.addEventListener("abort", () => ctl.abort());
  try {
    const r = await fetch(`${API_URL}/parse/place`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
      body: JSON.stringify({ text, consent: true }),
    });
    if (!r.ok) throw new Error(r.status === 502 ? "No match found for that place." : `The lookup service returned ${r.status}.`);
    return (await r.json()) as PlaceLookup;
  } catch (e) {
    if (e instanceof TypeError || (e as Error).name === "AbortError") throw new Error("Couldn't reach the lookup service. You can still enter the place by hand.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
