// Turns a tipping point's action into a state patch. Pure, so it can be tested without the UI.
import type { CriterionId, HardConstraints, TippingAction, UserPlace } from "./types";
import { tierNames } from "./engine/explain";

export interface ApplyState {
  tiers: CriterionId[][];
  budget: [number, number];
  rules: HardConstraints;
  hasCar: boolean;
  places: UserPlace[];
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const RULE_KEYS: Partial<Record<string, (keyof HardConstraints)[]>> = {
  laundry: ["inUnitLaundryRequired"],
  laundryMin: ["laundryAtLeast"],
  commute: ["maxWeeklyCommuteMin"],
  furnished: ["furnished"],
  pets: ["petFriendly"],
  leaseMax: ["maxLeaseMonths"],
  parking: ["parkingRequired"],
  noise: ["maxNoise"],
  grocery: ["maxGroceryWalkMin"],
  lateWalk: ["maxLateWalkMin"],
};
const RULE_NAME: Record<string, string> = {
  laundry: "in-unit laundry", laundryMin: "laundry on site", commute: "the weekly commute limit", furnished: "furnished",
  pets: "pet-friendly", leaseMax: "the lease length limit", parking: "on-site parking", noise: "quiet buildings only",
  grocery: "the grocery walk limit", lateWalk: "the late walk limit", place: "a place walk limit",
};

/** Returns the state patch and a one-line label for the change strip. */
export function applyTipping(s: ApplyState, a: TippingAction): { patch: Partial<ApplyState>; label: string } {
  if (a.type === "cap") {
    const hi = Math.max(a.to, s.budget[1]);
    return { patch: { budget: [Math.min(s.budget[0], hi), hi] }, label: `Applied: cap raised to ${usd(hi)}.` };
  }
  if (a.type === "swap") {
    const t = s.tiers.map((x) => [...x]);
    if (a.tier + 1 >= t.length) return { patch: {}, label: "Nothing to swap." };
    const lo = tierNames(t[a.tier], s.places), hi = tierNames(t[a.tier + 1], s.places);
    [t[a.tier], t[a.tier + 1]] = [t[a.tier + 1], t[a.tier]];
    return { patch: { tiers: t }, label: `Applied: ${hi} now ranks above ${lo}.` };
  }
  const rules = { ...s.rules };
  if (a.code === "place" && a.placeId) {
    const lim = { ...(rules.placeMaxWalkMin ?? {}) };
    delete lim[a.placeId];
    rules.placeMaxWalkMin = Object.keys(lim).length ? lim : undefined;
  } else for (const k of RULE_KEYS[a.code] ?? []) delete rules[k];
  const patch: Partial<ApplyState> = { rules };
  if (a.code === "parking") patch.hasCar = false;
  return { patch, label: `Applied: dropped ${RULE_NAME[a.code] ?? "one rule"}.` };
}
