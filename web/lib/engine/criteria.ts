// Raw criterion values (natural units) and anchored value functions v in [0,1].
// Anchors are FIXED ranges, not min/max of the current list. That avoids rank
// reversal: adding or removing a listing never changes another listing's score.
import type { Assumptions, CriterionId, Listing, StudentProfile } from "../types";

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

export const LAUNDRY_VALUE = { in_unit: 1, in_building: 0.6, none: 0 } as const;

export interface RawInputs {
  effectiveCost: number;
  busFactor: number;
}

export function rawValues(l: Listing, p: StudentProfile, x: RawInputs): Record<CriterionId, number> {
  return {
    cost: x.effectiveCost,
    commute: weeklyCommute(l, p, x.busFactor),
    lateNight: worstLateTrip(l, p),
    laundry: LAUNDRY_VALUE[l.laundry],
    space: l.sqft / Math.max(1, p.household.occupants),
    quiet: l.noiseLevel,
    grocery: l.groceryWalkMin,
  };
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
  return {
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
  };
}
