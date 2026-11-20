// Hard constraints. Every elimination says how far the listing is from passing,
// so near-misses can become "constraint" tipping points.
import type { CostBreakdown, Elimination, Listing, StudentProfile } from "../types";
import { weeklyCommute } from "./criteria";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function eliminationReasons(l: Listing, p: StudentProfile, cost: CostBreakdown): Elimination[] {
  const why: Elimination[] = [];
  const h = p.hardConstraints;
  if (l.bedrooms < p.household.occupants)
    why.push({ code: "bedrooms", text: `Only ${l.bedrooms} bedroom${l.bedrooms === 1 ? "" : "s"} for ${p.household.occupants} people` });
  if (l.leaseMonths < p.monthsNeeded)
    why.push({ code: "leaseShort", text: `Lease covers ${l.leaseMonths} of the ${p.monthsNeeded} months you need` });
  const over = cost.effective.mid - p.budget.capMonthly;
  if (over > 0)
    why.push({ code: "cap", gap: over, text: `${usd(over)}/mo over your ${usd(p.budget.capMonthly)} cap (true cost ${usd(cost.effective.mid)})` });
  if (h.inUnitLaundryRequired && l.laundry !== "in_unit")
    why.push({ code: "laundry", text: "No in-unit laundry (you marked it required)" });
  if (h.maxWeeklyCommuteMin != null) {
    const w = weeklyCommute(l, p);
    if (w > h.maxWeeklyCommuteMin)
      why.push({ code: "commute", gap: w - h.maxWeeklyCommuteMin, text: `${Math.round(w - h.maxWeeklyCommuteMin)} min/week over your commute limit` });
  }
  if (h.petFriendly && !l.petFriendly) why.push({ code: "pets", text: "No pets allowed" });
  if (h.furnished && !l.furnished) why.push({ code: "furnished", text: "Unfurnished" });
  if (h.maxLeaseMonths != null && l.leaseMonths > h.maxLeaseMonths)
    why.push({ code: "leaseMax", text: `${l.leaseMonths}-month lease (your max is ${h.maxLeaseMonths})` });
  return why;
}

/** A near miss is worth showing as a tipping point: one reason, and the student could
 *  plausibly relax it (budget within 10% of cap, or a preference they marked "required"). */
export function isNearMiss(reasons: Elimination[], capMonthly: number): boolean {
  if (reasons.length !== 1) return false;
  const r = reasons[0];
  if (r.code === "cap") return (r.gap ?? Infinity) <= 0.1 * capMonthly;
  return r.code === "laundry" || r.code === "commute" || r.code === "furnished" || r.code === "leaseMax";
}
