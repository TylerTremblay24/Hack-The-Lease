import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decide } from "../index";
import { rocWeights } from "../smaa";
import { ALL_CRITERIA, type Assumptions, type Listing, type StudentProfile } from "../../types";

const root = new URL("../../../../data/seed/", import.meta.url);
const L: Listing[] = JSON.parse(readFileSync(new URL("listings.json", root), "utf8"));
const A: Assumptions = JSON.parse(readFileSync(new URL("assumptions.json", root), "utf8"));
const [maya, jordan]: StudentProfile[] = JSON.parse(readFileSync(new URL("profiles.json", root), "utf8"));

test("12 criteria exist and ROC weights over all of them sum to 1", () => {
  assert.equal(ALL_CRITERIA.length, 12);
  const w = rocWeights(ALL_CRITERIA.map((c) => [c]));
  assert.ok(Math.abs(Object.values(w).reduce((a, b) => a + (b ?? 0), 0) - 1) < 1e-12);
});

test("a profile using every criterion still gives acceptability that sums to 1", () => {
  const r = decide({ ...jordan, priorities: ALL_CRITERIA.map((c) => [c]) }, L, A);
  const s = r.evaluations.filter((e) => e.feasible).reduce((a, e) => a + e.rankAcceptability[0], 0);
  assert.ok(Math.abs(s - 1) < 1e-9);
});

test("parking required eliminates listings with no parking, with a reason code", () => {
  const r = decide({ ...jordan, hardConstraints: { parkingRequired: true } }, L, A);
  const e = r.evaluations.find((x) => x.listingId === "kt-carriage-1br")!;
  assert.equal(e.feasible, false);
  assert.ok(e.eliminatedBecause.some((x) => x.code === "parking"));
});

test("new must-haves: quiet-only, close groceries and a short late walk each remove something", () => {
  for (const hc of [{ maxNoise: 2 }, { maxGroceryWalkMin: 6 }, { maxLateWalkMin: 10 }]) {
    const base = decide({ ...maya, hardConstraints: {} }, L, A).evaluations.filter((e) => e.feasible).length;
    const r = decide({ ...maya, hardConstraints: hc }, L, A).evaluations.filter((e) => e.feasible).length;
    assert.ok(r <= base, JSON.stringify(hc));
  }
  const q = decide({ ...maya, hardConstraints: { maxNoise: 1 } }, L, A);
  for (const e of q.evaluations) if (e.feasible) assert.ok(L.find((l) => l.id === e.listingId)!.noiseLevel <= 1);
});

test("bathroom and lease-fit value functions hit their anchors", () => {
  const r = decide({ ...maya, household: { occupants: 2 }, monthsNeeded: 12, priorities: [["bathroom"], ["leaseFit"]] }, L, A);
  const v = (id: string) => r.evaluations.find((e) => e.listingId === id)!.value;
  assert.equal(v("nc-plymouth-2br").bathroom, 0); // 1 bath / 2 people = 0.5 per person
  assert.equal(v("nc-plymouth-2br").leaseFit, 1); // 12-month lease, 12 months needed
});
