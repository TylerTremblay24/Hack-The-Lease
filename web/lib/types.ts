// Shared contract between engine (A), frontend (B) and API (C).
// FROZEN at Hour 3. Mirror of api/app/schemas.py — change both together.

export type Provenance = "REAL" | "ESTIMATE" | "SYNTHETIC" | "USER"; // USER = pasted by the student

/** A value with an uncertainty range. lo <= mid <= hi. */
export interface Range {
  lo: number;
  mid: number;
  hi: number;
}

export type BaseCriterionId =
  | "cost" // effective monthly cost per person
  | "commute" // weekly door-to-door minutes for the student's schedule
  | "lateNight" // worst late-night trip home (walking)
  | "laundry" // in-unit > in-building > none
  | "space" // sq ft per person
  | "quiet" // listing noise level (synthetic for the demo)
  | "grocery" // walk minutes to the nearest full grocery store
  | "bathroom" // bathrooms per person
  | "furnished"
  | "pets" // pet-friendly building
  | "parking" // a parking spot is offered
  | "leaseFit"; // lease length vs. months you actually need (fewer unused months = better)

/** A place the student picked (their own words, nothing demographic). Chip id is `place:<id>`. */
export type PlaceCategory = "food" | "coffee" | "gym" | "study" | "market" | "other";
export interface UserPlace {
  id: string;
  name: string;
  category: PlaceCategory;
  coords: { lat: number; lng: number }; // approximate
  source?: "list" | "claude" | "manual" | "osm"; // where the location came from
  note?: string; // e.g. "State St near Liberty"
}
export type PlaceCriterionId = `place:${string}`;
export type CriterionId = BaseCriterionId | PlaceCriterionId;
export const placeCriterion = (p: UserPlace): PlaceCriterionId => `place:${p.id}`;

export const ALL_CRITERIA: BaseCriterionId[] = [
  "cost",
  "commute",
  "lateNight",
  "laundry",
  "space",
  "quiet",
  "grocery",
  "bathroom",
  "furnished",
  "pets",
  "parking",
  "leaseFit",
];

/** Preset destinations. No home address is ever collected. */
export type AnchorId = "central" | "north" | "kerrytown" | "medical" | "downtown";

// ---------------------------------------------------------------- profile

export interface ScheduleAnchor {
  anchor: AnchorId;
  daysPerWeek: number; // 0–7 round trips per week
  lateReturn: boolean; // comes home after ~11 PM on those days
  label?: string; // "ME labs", "UgLi nights", "Shift at work"
}

export interface Evidence {
  target: CriterionId | keyof HardConstraints | "budget" | "schedule";
  quote: string; // the student's own words that produced this chip
}

export interface HardConstraints {
  inUnitLaundryRequired?: boolean;
  maxWeeklyCommuteMin?: number;
  petFriendly?: boolean;
  furnished?: boolean;
  maxLeaseMonths?: number;
  laundryAtLeast?: "in_building"; // some laundry on site (in-unit or in-building)
  parkingRequired?: boolean;
  maxNoise?: number; // noise level 1-5; e.g. 2 = quiet buildings only
  maxGroceryWalkMin?: number;
  maxLateWalkMin?: number; // worst walk home on late days
  /** Per-place walking limit in minutes, keyed by place id. */
  placeMaxWalkMin?: Record<string, number>;
}

export interface StudentProfile {
  schemaVersion: "1.0";
  displayName?: string; // optional nickname for demo personas only
  consent: { useFreeText: boolean; storeProfile: false };
  budget: { targetMonthly: number; capMonthly: number }; // per person, USD
  household: { occupants: number }; // people sharing the unit, incl. student
  monthsNeeded: number; // months the student will actually live there (used for scoring)
  /** Optional [min, max] ranges when the student isn't sure. A listing is kept if it works for
   *  at least one value in the range; scoring uses monthsNeeded / household.occupants (the midpoint). */
  places?: UserPlace[]; // the student's own places; each can be a priority chip
  monthsRange?: [number, number];
  occupantsRange?: [number, number];
  hasCar: boolean;
  anchors: ScheduleAnchor[];
  /** Importance tiers, most important first. Criteria in the same tier are
   *  unordered relative to each other. Criteria not listed get weight 0. */
  priorities: CriterionId[][];
  hardConstraints: HardConstraints;
  evidence: Evidence[];
}

// ---------------------------------------------------------------- listing

export type UtilityId = "electric" | "heat" | "water" | "internet";

export interface AnchorTravel {
  walkMin: number;
  busMin: number | null; // door-to-door incl. avg wait; null = no useful route
}

export interface Listing {
  id: string;
  name: string; // fictional
  neighborhood:
    | "Kerrytown"
    | "South U"
    | "Old West Side"
    | "North Campus"
    | "Burns Park"
    | "Downtown"
    | "Lower Town"
    | "Packard / Hill";
  coords: { lat: number; lng: number }; // block-level, not a real address
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  rentTotalMonthly: number; // whole unit
  leaseMonths: number;
  laundry: "in_unit" | "in_building" | "none";
  utilitiesIncluded: UtilityId[];
  heatType: "gas" | "electric";
  parking: { available: boolean; monthly: number };
  fees: { oneTimeTotal: number }; // application + admin, whole unit
  furnished: boolean;
  petFriendly: boolean;
  noiseLevel: 1 | 2 | 3 | 4 | 5; // 1 = very quiet
  groceryWalkMin: number;
  travel: Record<AnchorId, AnchorTravel>;
  provenance: Partial<Record<keyof Listing | "travel", Provenance>>;
}

// ---------------------------------------------------------------- assumptions

export interface Assumptions {
  utilitiesPerUnit: Record<UtilityId, { base: Range; perBedroom: Range }>;
  electricHeatMultiplier: number;
  subletRecovery: Range; // share of rent recovered when subletting unused months
  busTimeSpread: number; // ±fraction applied to busMin in data-uncertainty draws
  anchors: {
    weeklyCommuteZeroAt: number; // minutes/week where commute value hits 0
    lateNightBest: number;
    lateNightWorst: number;
    spaceWorst: number;
    spaceBest: number;
    groceryBest: number;
    groceryWorst: number;
    costFloorShareOfTarget: number; // v=1 at or below this share of target
  };
}

// ---------------------------------------------------------------- output

export interface CostBreakdown {
  rentShare: number;
  utilities: Range;
  parking: number;
  feesPerMonth: number;
  subletCredit: Range; // positive = money back per lived month
  effective: Range; // what the student pays per month actually lived
}

export interface Elimination {
  code:
    | "bedrooms" | "cap" | "laundry" | "laundryMin" | "commute" | "pets" | "furnished"
    | "leaseMax" | "leaseShort" | "parking" | "noise" | "grocery" | "lateWalk" | "place";
  text: string; // human-readable, with distance to feasibility
  gap?: number; // e.g. $/mo over cap, min/week over limit
  placeId?: string; // for code "place": which of the student's places
}

/** What the UI can do to make a tipping point real. Price tipping points have none (that is the landlord's move). */
export type TippingAction =
  | { type: "cap"; to: number } // raise the hard cap to this
  | { type: "swap"; tier: number } // swap priority tiers `tier` and `tier + 1`
  | { type: "relax"; code: Elimination["code"]; placeId?: string }; // drop one must-have

export interface ListingEvaluation {
  listingId: string;
  feasible: boolean;
  eliminatedBecause: Elimination[];
  cost: CostBreakdown;
  raw: Record<CriterionId, number>; // mid values, natural units
  value: Record<CriterionId, number>; // 0..1, anchored
  pointScore: number; // utility at ROC weights
  pointRank: number | null;
  dominatedBy: string[]; // Pareto: listings at least as good on every criterion
  rankAcceptability: number[]; // [P(rank1), P(rank2), P(rank3)]
  centralWeights: Record<CriterionId, number> | null;
  confidence: number | null; // SMAA-2 confidence factor
  pOverCap: number; // share of draws with effective cost > cap
}

export interface TippingPoint {
  kind: "price" | "swap" | "constraint";
  listingId: string;
  text: string; // ready-to-render sentence
  amount?: number; // $ for price, n/a otherwise
  apply?: TippingAction;
}

export interface DecisionResult {
  weightsROC: Record<CriterionId, number>;
  evaluations: ListingEvaluation[]; // sorted: feasible by acceptability, then eliminated
  winnerId: string | null;
  verdict: "robust" | "leaning" | "toss-up" | "only-option" | "none";
  whyWinner: { criterion: CriterionId; delta: number }[] | null; // vs runner-up
  runnerUpId: string | null;
  tippingPoints: TippingPoint[];
  samples: number;
  monteCarloSE: number; // worst-case standard error of an acceptability index
  dataUncertainty: boolean;
}
