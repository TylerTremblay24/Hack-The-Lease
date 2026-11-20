// Hard constraints. Every elimination says how far the listing is from passing,
// so near-misses can become "constraint" tipping points.
import type { CostBreakdown, Elimination, Listing, StudentProfile } from "../types";
import { walkMinToPlace, weeklyCommute, worstLateTrip } from "./criteria";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function eliminationReasons(l: Listing, p: StudentProfile, cost: CostBreakdown): Elimination[] {
  const why: Elimination[] = [];
  const h = p.hardConstraints;
  // With a range, a listing stays if it works for at least one value in it (smallest group, shortest stay).
  const minPeople = p.occupantsRange?.[0] ?? p.household.occupants;
  const minMonths = p.monthsRange?.[0] ?? p.monthsNeeded;
  if (l.bedrooms < minPeople)
    why.push({ code: "bedrooms", text: `Only ${l.bedrooms} bedroom${l.bedrooms === 1 ? "" : "s"} for ${minPeople} ${minPeople === 1 ? "person" : "people"}` });
  if (l.leaseMonths < minMonths)
    why.push({ code: "leaseShort", text: `Lease covers ${l.leaseMonths} of the ${minMonths} months you need` });
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
  if (h.laundryAtLeast && l.laundry === "none")
    why.push({ code: "laundryMin", text: "No laundry on site (you need some)" });
  if (h.parkingRequired && !l.parking.available)
    why.push({ code: "parking", text: "No parking offered (you marked it required)" });
  if (h.maxNoise != null && l.noiseLevel > h.maxNoise)
    why.push({ code: "noise", text: `Noise level ${l.noiseLevel}/5 (you want ${h.maxNoise} or quieter)` });
  if (h.maxGroceryWalkMin != null && l.groceryWalkMin > h.maxGroceryWalkMin)
    why.push({ code: "grocery", gap: l.groceryWalkMin - h.maxGroceryWalkMin, text: `${l.groceryWalkMin}-min walk to groceries (your limit is ${h.maxGroceryWalkMin})` });
  if (h.maxLateWalkMin != null) {
    const w = worstLateTrip(l, p);
    if (w > h.maxLateWalkMin)
      why.push({ code: "lateWalk", gap: w - h.maxLateWalkMin, text: `${w}-min walk home late at night (your limit is ${h.maxLateWalkMin})` });
  }
  for (const pl of p.places ?? []) {
    const lim = h.placeMaxWalkMin?.[pl.id];
    if (lim == null) continue;
    const w = walkMinToPlace(l, pl);
    if (w > lim) why.push({ code: "place", placeId: pl.id, gap: w - lim, text: `${Math.round(w)}-min walk to ${pl.name} (your limit is ${lim})` });
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
  return ["laundry", "laundryMin", "commute", "furnished", "leaseMax", "parking", "noise", "grocery", "lateWalk", "place"].includes(r.code);
}
