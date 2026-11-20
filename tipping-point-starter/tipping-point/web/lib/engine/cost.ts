// Deterministic true-cost engine. All numbers per person, per month actually lived.
import type { Assumptions, CostBreakdown, Listing, Range, StudentProfile } from "../types";

const add = (a: Range, b: Range): Range => ({ lo: a.lo + b.lo, mid: a.mid + b.mid, hi: a.hi + b.hi });
const scale = (a: Range, k: number): Range => ({ lo: a.lo * k, mid: a.mid * k, hi: a.hi * k });
const ZERO: Range = { lo: 0, mid: 0, hi: 0 };

/** Monthly utilities for the whole unit, for utilities NOT included in rent. */
export function unitUtilities(l: Listing, a: Assumptions): Range {
  let total = ZERO;
  for (const id of ["electric", "heat", "water", "internet"] as const) {
    if (l.utilitiesIncluded.includes(id)) continue;
    const u = a.utilitiesPerUnit[id];
    let r = add(u.base, scale(u.perBedroom, l.bedrooms));
    if (id === "heat" && l.heatType === "electric") r = scale(r, a.electricHeatMultiplier);
    total = add(total, r);
  }
  return total;
}

/**
 * effective = ( rentShare * leaseMonths            // you owe the whole lease
 *             + (utilities + parking) * lived      // you only run utilities while there
 *             + fees / occupants
 *             - rentShare * unusedMonths * recovery // sublet income for months you're away
 *             ) / lived
 * where lived = min(monthsNeeded, leaseMonths), unusedMonths = max(0, leaseMonths - monthsNeeded).
 * `rentDrop` lets tipping-point search ask "what if rent per person were $X lower?".
 */
export function costFor(l: Listing, p: StudentProfile, a: Assumptions, rentDrop = 0): CostBreakdown {
  const occ = Math.max(1, p.household.occupants);
  const rentShare = l.rentTotalMonthly / occ - rentDrop;
  const lived = Math.max(1, Math.min(p.monthsNeeded, l.leaseMonths));
  const unused = Math.max(0, l.leaseMonths - p.monthsNeeded);
  const utilities = scale(unitUtilities(l, a), 1 / occ);
  const parking = p.hasCar && l.parking.available ? l.parking.monthly : 0;
  const feesPerMonth = l.fees.oneTimeTotal / occ / lived;
  // Higher recovery = lower cost, so lo cost pairs with hi recovery.
  const credit = (r: number) => (rentShare * unused * r) / lived;
  const subletCredit: Range = {
    lo: credit(a.subletRecovery.lo),
    mid: credit(a.subletRecovery.mid),
    hi: credit(a.subletRecovery.hi),
  };
  const fixed = (rentShare * l.leaseMonths) / lived + parking + feesPerMonth;
  const effective: Range = {
    lo: fixed + utilities.lo - subletCredit.hi,
    mid: fixed + utilities.mid - subletCredit.mid,
    hi: fixed + utilities.hi - subletCredit.lo,
  };
  return { rentShare, utilities, parking, feesPerMonth, subletCredit, effective };
}
