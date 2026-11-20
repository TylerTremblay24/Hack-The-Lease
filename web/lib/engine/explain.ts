// Explanations: point scores at ROC weights, Pareto dominance, why-#1 deltas,
// and counterfactual tipping points. Every output is a sentence a judge can check.
import type { CriterionId } from "../types";

export const CRITERION_LABEL: Record<CriterionId, string> = {
  cost: "True monthly cost",
  commute: "Weekly commute",
  lateNight: "Late-night trip home",
  laundry: "Laundry",
  space: "Space per person",
  quiet: "Quiet",
  grocery: "Grocery access",
  bathroom: "Bathrooms per person",
  furnished: "Furnished",
  pets: "Pet-friendly",
  parking: "Parking available",
  leaseFit: "Lease fits my stay",
};

export const CRITERION_BLURB: Record<CriterionId, string> = {
  cost: "Rent + bills + fees, per person, for the months you live there",
  commute: "Door-to-door minutes for your own week",
  lateNight: "Walk home after about 11 PM",
  laundry: "In-unit beats in-building beats none",
  space: "Square feet for each person",
  quiet: "Lower noise level in and around the building",
  grocery: "Walk to a full grocery store",
  bathroom: "Less waiting for the shower",
  furnished: "Move in with the basics already there",
  pets: "The building allows pets",
  parking: "A spot is offered with the unit",
  leaseFit: "Fewer months you pay for but don't use",
};

export const CRITERION_GROUPS: { title: string; ids: CriterionId[] }[] = [
  { title: "Money", ids: ["cost", "leaseFit"] },
  { title: "Time and travel", ids: ["commute", "lateNight", "grocery", "parking"] },
  { title: "Space and comfort", ids: ["space", "bathroom", "quiet", "laundry"] },
  { title: "Lifestyle", ids: ["furnished", "pets"] },
];

export function pointScore(v: Record<CriterionId, number>, w: Partial<Record<CriterionId, number>>): number {
  let u = 0;
  for (const c of Object.keys(w) as CriterionId[]) u += (w[c] ?? 0) * v[c];
  return u;
}

/** j dominates i if j >= i on every included criterion and > on at least one. */
export function dominates(vj: Record<CriterionId, number>, vi: Record<CriterionId, number>, crit: CriterionId[]): boolean {
  let strictly = false;
  for (const c of crit) {
    if (vj[c] < vi[c] - 1e-9) return false;
    if (vj[c] > vi[c] + 1e-9) strictly = true;
  }
  return strictly;
}

/** Contribution gap per criterion: w_c * (v_winner,c - v_runnerUp,c), largest first. */
export function whyDeltas(
  vw: Record<CriterionId, number>,
  vr: Record<CriterionId, number>,
  w: Partial<Record<CriterionId, number>>,
): { criterion: CriterionId; delta: number }[] {
  return (Object.keys(w) as CriterionId[])
    .map((c) => ({ criterion: c, delta: (w[c] ?? 0) * (vw[c] - vr[c]) }))
    .filter((d) => Math.abs(d.delta) > 1e-6)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/** Smallest x in [lo, hi] with f(x) true, assuming f is monotone (false ... true). */
export function bisect(f: (x: number) => boolean, lo: number, hi: number, iters = 30): number | null {
  if (!f(hi)) return null;
  if (f(lo)) return lo;
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

export const tierNames = (tier: CriterionId[]) => tier.map((c) => CRITERION_LABEL[c]).join(" + ");
