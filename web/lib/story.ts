// "Why this fits you": a plain-language story built from the student's own ranking, the listing's real numbers,
// and (when the persona has them) the student's own words. Deterministic. No model is involved, so every
// sentence traces to a number on screen.
import type { CriterionId, DecisionResult, Listing, ListingEvaluation, StudentProfile, UserPlace } from "./types";
import { criterionLabel } from "./engine/explain";
import type { GroupExtras } from "./engine/group";

export interface StoryLine {
  criterion: CriterionId; label: string; rank: number; fact: string; tone: "strong" | "ok" | "weak"; quote?: string;
}
export interface Story {
  listingId: string; name: string; headline: string; lines: StoryLine[]; tradeoff: string | null;
  confidence: string; flip: string | null; group: string | null; caveats: string[];
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** One sentence fragment with the listing's actual number for a criterion. */
export function factFor(c: CriterionId, l: Listing, ev: ListingEvaluation, p: StudentProfile, places: UserPlace[]): string {
  const r = ev.raw[c];
  if (c.startsWith("place:")) {
    const pl = places.find((x) => `place:${x.id}` === c);
    return `${Math.round(r)}-minute walk to ${pl?.name ?? "your place"}`;
  }
  switch (c) {
    case "cost": return `${usd(ev.cost.effective.mid)}/mo true cost per person (${usd(ev.cost.effective.lo)} to ${usd(ev.cost.effective.hi)}), against your ${usd(p.budget.capMonthly)} cap`;
    case "commute": return `${Math.round(r)} minutes a week for your schedule`;
    case "lateNight": return r > 0 ? `${Math.round(r)}-minute walk home on your late days` : "no late-night walks on your schedule";
    case "laundry": return { in_unit: "laundry in the unit", in_building: "laundry in the building", none: "no laundry on site" }[l.laundry];
    case "space": return `${Math.round(r)} sq ft per person`;
    case "quiet": return `noise level ${l.noiseLevel} of 5 (1 is quietest)`;
    case "grocery": return `${l.groceryWalkMin}-minute walk to a full grocery store`;
    case "bathroom": return `${r.toFixed(2)} bathrooms per person`;
    case "furnished": return l.furnished ? "comes furnished" : "unfurnished";
    case "pets": return l.petFriendly ? "pets allowed" : "no pets";
    case "parking": return l.parking.available ? `parking available at ${usd(l.parking.monthly)}/mo` : "no parking offered";
    case "leaseFit": return `${l.leaseMonths}-month lease for a ${p.monthsNeeded}-month stay`;
    default: return "";
  }
}

export interface StoryInput {
  profile: StudentProfile; listing: Listing; ev: ListingEvaluation; result: DecisionResult; places: UserPlace[];
  order: CriterionId[]; // the student's ranking, most important first (for a group: by group weight)
  listings: Listing[]; extra?: GroupExtras | null; withQuotes?: boolean;
}

export function buildStory(i: StoryInput): Story {
  const { profile: p, listing: l, ev, result, places, order } = i;
  const ranked = order.filter((c) => ev.value[c] != null);
  const toneOf = (c: CriterionId): StoryLine["tone"] => (ev.value[c] >= 0.7 ? "strong" : ev.value[c] >= 0.4 ? "ok" : "weak");
  const quoteFor = (c: CriterionId) => (i.withQuotes === false ? undefined : p.evidence.find((e) => e.target === c)?.quote);
  const lines: StoryLine[] = ranked.slice(0, 3).map((c) => ({
    criterion: c, label: criterionLabel(c, places), rank: ranked.indexOf(c) + 1, fact: factFor(c, l, ev, p, places), tone: toneOf(c), quote: quoteFor(c),
  }));
  const weak = ranked.slice(0, 5).map((c) => ({ c, v: ev.value[c] })).filter((x) => x.v < 0.4).sort((a, b) => a.v - b.v)[0];
  const tradeoff = weak ? `The trade-off: ${criterionLabel(weak.c, places)} is weak here (${factFor(weak.c, l, ev, p, places)}), and you ranked it #${ranked.indexOf(weak.c) + 1}.` : null;

  const share = Math.round(ev.rankAcceptability[0] * 100);
  const runner = result.runnerUpId ? i.listings.find((x) => x.id === result.runnerUpId)?.name : null;
  const isWinner = result.winnerId === ev.listingId;
  const headline = !isWinner ? `${l.name} is #${ev.pointRank ?? "?"} on your priorities.`
    : result.verdict === "robust" ? `${l.name} is a robust pick for you.`
    : result.verdict === "toss-up" && runner ? `${l.name} is a close call with ${runner}.`
    : result.verdict === "only-option" ? `${l.name} is the only listing that meets your rules.`
    : `${l.name} leads for you.`;
  const confidence = `It finishes #1 in ${share}% of ${result.samples.toLocaleString("en-US")} draws that all respect your order (±${Math.round(result.monteCarloSE * 100)} points).`;
  const tip = result.tippingPoints.find((t) => t.apply) ?? result.tippingPoints.find((t) => t.kind === "price" && t.amount != null);
  const flip = tip ? tip.text : null;

  let group: string | null = null;
  const x = i.extra;
  if (x && x.worst[ev.listingId]) {
    const w = x.worst[ev.listingId];
    group = `Group: ${w.name} likes it least, at ${Math.round(w.score * 100)} of 100. Everyone's own #1 matches in ${Math.round(x.agreement * 100)}% of draws.`;
  }
  const caveats = ["Listings, rents and travel times are synthetic or modeled estimates, shown with ranges."];
  if (result.verdict === "toss-up") caveats.push("This is a toss-up: small changes to your priorities can change the answer.");
  if (ev.pOverCap > 0.05) caveats.push(`There is a ${Math.round(ev.pOverCap * 100)}% chance true cost exceeds your cap.`);
  return { listingId: ev.listingId, name: l.name, headline, lines, tradeoff, confidence, flip, group, caveats };
}
