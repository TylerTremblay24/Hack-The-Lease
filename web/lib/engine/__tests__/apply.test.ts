import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decide } from "../index";
import { applyTipping, type ApplyState } from "../../applyTipping";
import type { Assumptions, Listing, StudentProfile, UserPlace } from "../../types";

const root = new URL("../../../../data/seed/", import.meta.url);
const L: Listing[] = JSON.parse(readFileSync(new URL("listings.json", root), "utf8"));
const A: Assumptions = JSON.parse(readFileSync(new URL("assumptions.json", root), "utf8"));
const PL: UserPlace[] = JSON.parse(readFileSync(new URL("places.json", root), "utf8"));
const [maya, jordan]: StudentProfile[] = JSON.parse(readFileSync(new URL("profiles.json", root), "utf8"));

const toProfile = (base: StudentProfile, s: ApplyState): StudentProfile => ({
  ...base, priorities: s.tiers, budget: { targetMonthly: Math.min(base.budget.targetMonthly, s.budget[1]), capMonthly: s.budget[1] },
  hasCar: s.hasCar, hardConstraints: s.rules, places: s.places,
});
const stateOf = (p: StudentProfile): ApplyState => ({
  tiers: p.priorities, budget: [p.budget.targetMonthly, p.budget.capMonthly], rules: { ...p.hardConstraints }, hasCar: p.hasCar, places: p.places ?? [],
});

const scenarios: [string, StudentProfile][] = [
  ["maya", maya],
  ["maya laundry first", { ...maya, priorities: [["laundry"], ["cost"], ["commute"]] }],
  ["maya in-unit required", { ...maya, hardConstraints: { inUnitLaundryRequired: true } }],
  ["maya tight cap", { ...maya, budget: { targetMonthly: 1000, capMonthly: 1150 } }],
  ["maya parking + quiet", { ...maya, hardConstraints: { parkingRequired: true, maxNoise: 2 } }],
  ["jordan places", { ...jordan, places: [PL[0], PL[10]], priorities: [["cost"], ["place:zingermans-deli"], ["place:ncrb"]], hardConstraints: { placeMaxWalkMin: { "zingermans-deli": 6 } } }],
];

test("every applicable tipping point does what it says when applied", () => {
  let checked = 0;
  for (const [name, p] of scenarios) {
    const r = decide(p, L, A, { samples: 500 });
    for (const t of r.tippingPoints) {
      if (!t.apply) continue;
      const { patch } = applyTipping(stateOf(p), t.apply);
      const next = decide(toProfile(p, { ...stateOf(p), ...patch }), L, A, { samples: 500 });
      const e = next.evaluations.find((x) => x.listingId === t.listingId)!;
      assert.ok(e.feasible, `${name}: ${t.text} -> listing not feasible after apply`);
      assert.equal(e.pointRank, 1, `${name}: ${t.text} -> not #1 by point score (rank ${e.pointRank})`);
      checked++;
    }
  }
  assert.ok(checked >= 2, `only ${checked} actions exercised`);
});

test("swap action reorders two tiers; cap action only raises", () => {
  const s = stateOf(maya);
  const sw = applyTipping(s, { type: "swap", tier: 0 }).patch.tiers!;
  assert.deepEqual(sw[0], s.tiers[1]);
  assert.deepEqual(sw[1], s.tiers[0]);
  const hi = applyTipping(s, { type: "cap", to: 5000 }).patch.budget!;
  assert.equal(hi[1], 5000);
  const lo = applyTipping(s, { type: "cap", to: 100 }).patch.budget!;
  assert.equal(lo[1], s.budget[1]);
});
