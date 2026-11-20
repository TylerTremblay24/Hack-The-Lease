// Raw criterion values (natural units) and anchored value functions v in [0,1].
// Anchors are FIXED ranges, not min/max of the current list. That avoids rank
// reversal: adding or removing a listing never changes another listing's score.
import type { Assumptions, CriterionId, Listing, StudentProfile, UserPlace } from "../types";
import { placeCriterion } from "../types";

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Door-to-door minutes for one trip. `busFactor` scales bus time (data uncertainty). */
export function tripMin(walk: number, bus: number | null, busFactor = 1): number {
  return bus == null ? walk : Math.min(walk, bus * busFactor);
}

export function weeklyCommute(l: Listing, p: StudentProfile, busFactor = 1): number {
  let total = 0;
  for (const s of p.anchors) {
    const t = l.travel[s.anchor];
    total += s.daysPerWeek * 2 * tripMin(t.walkMin, t.busMin, busFactor);
  }
  return total;
}

/** Worst late return. Assumption: after ~11 PM we count walking time only. */
export function worstLateTrip(l: Listing, p: StudentProfile): number {
  let worst = 0;
  for (const s of p.anchors) if (s.lateReturn) worst = Math.max(worst, l.travel[s.anchor].walkMin);
  return worst;
}

/** Walking minutes from a listing to one of the student's places: straight-line meters x 1.3 for streets, 80 m/min. */
export function walkMinToPlace(l: Listing, p: UserPlace): number {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (p.coords.lat - l.coords.lat) * rad, dLng = (p.coords.lng - l.coords.lng) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(l.coords.lat * rad) * Math.cos(p.coords.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(((2 * R * Math.asin(Math.sqrt(a)) * 1.3) / 80) * 10) / 10;
}
export const PLACE_BEST_MIN = 3; // value 1 at or under this many walking minutes
export const PLACE_WORST_MIN = 25; // value 0 at or over this

export const LAUNDRY_VALUE = { in_unit: 1, in_building: 0.6, none: 0 } as const;

export interface RawInputs {
  effectiveCost: number;
  busFactor: number;
}

export function rawValues(l: Listing, p: StudentProfile, x: RawInputs): Record<CriterionId, number> {
  const out: Record<CriterionId, number> = {
    cost: x.effectiveCost,
    commute: weeklyCommute(l, p, x.busFactor),
    lateNight: worstLateTrip(l, p),
    laundry: LAUNDRY_VALUE[l.laundry],
    space: l.sqft / Math.max(1, p.household.occupants),
    quiet: l.noiseLevel,
    grocery: l.groceryWalkMin,
    bathroom: l.bathrooms / Math.max(1, p.household.occupants),
    furnished: l.furnished ? 1 : 0,
    pets: l.petFriendly ? 1 : 0,
    parking: l.parking.available ? 1 : 0,
    leaseFit: Math.max(0, l.leaseMonths - p.monthsNeeded), // months paid but unused
  };
  for (const pl of p.places ?? []) out[placeCriterion(pl)] = walkMinToPlace(l, pl);
  return out;
}

/** Piecewise-linear value functions. Each one is a sentence we can say out loud. */
export function toValues(
  raw: Record<CriterionId, number>,
  p: StudentProfile,
  a: Assumptions,
): Record<CriterionId, number> {
  const A = a.anchors;
  const floor = A.costFloorShareOfTarget * p.budget.targetMonthly;
  const cap = p.budget.capMonthly;
  const hasLate = p.anchors.some((s) => s.lateReturn);
  const out: Record<CriterionId, number> = {
    // 1 at/below 85% of target, falls linearly to 0 at the hard cap.
    cost: clamp01((cap - raw.cost) / Math.max(1, cap - floor)),
    // 1 at zero minutes/week, 0 at 600 minutes/week (10 h).
    commute: clamp01(1 - raw.commute / A.weeklyCommuteZeroAt),
    // 1 if worst late walk <= 5 min, 0 at >= 35 min. Not applicable -> 1 for all.
    lateNight: hasLate
      ? clamp01(1 - (raw.lateNight - A.lateNightBest) / (A.lateNightWorst - A.lateNightBest))
      : 1,
    laundry: raw.laundry,
    // 0 at 250 sq ft/person, 1 at 550.
    space: clamp01((raw.space - A.spaceWorst) / (A.spaceBest - A.spaceWorst)),
    // noise 1 (very quiet) -> 1, noise 5 -> 0
    quiet: clamp01((5 - raw.quiet) / 4),
    // 1 at <= 5 min walk, 0 at >= 25 min.
    grocery: clamp01(1 - (raw.grocery - A.groceryBest) / (A.groceryWorst - A.groceryBest)),
    // 0 at half a bathroom per person, 1 at one or more.
    bathroom: clamp01((raw.bathroom - 0.5) / 0.5),
    furnished: raw.furnished,
    pets: raw.pets,
    parking: raw.parking,
    // 1 when the lease matches your stay, 0 at 6+ unused months.
    leaseFit: clamp01(1 - raw.leaseFit / 6),
  };
  // 1 at <= 3 min walk to the student's place, 0 at >= 25 min.
  for (const pl of p.places ?? []) {
    const id = placeCriterion(pl);
    out[id] = clamp01(1 - (raw[id] - PLACE_BEST_MIN) / (PLACE_WORST_MIN - PLACE_BEST_MIN));
  }
  return out;
}
