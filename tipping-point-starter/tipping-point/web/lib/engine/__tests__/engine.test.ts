// Run: npx tsx --test web/lib/engine/__tests__/engine.test.ts   (or port to vitest)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decide } from "../index";
import { costFor } from "../cost";
import { rocWeights, sampleWeights } from "../smaa";
import { dominates } from "../explain";
import type { Assumptions, CriterionId, Listing, StudentProfile } from "../../types";

const root = new URL("../../../../data/seed/", import.meta.url);
const L: Listing[] = JSON.parse(readFileSync(new URL("listings.json", root), "utf8"));
const A: Assumptions = JSON.parse(readFileSync(new URL("assumptions.json", root), "utf8"));
const [maya, jordan]: StudentProfile[] = JSON.parse(readFileSync(new URL("profiles.json", root), "utf8"));
const tiers: CriterionId[][] = [["cost"], ["laundry", "commute"], ["quiet"]];

test("ROC weights sum to 1, respect order, tie members are equal", () => {
  const w = rocWeights(tiers);
  const sum = Object.values(w).reduce((a, b) => a + (b ?? 0), 0);
  assert.ok(Math.abs(sum - 1) < 1e-12);
  assert.ok(w.cost! > w.laundry! && w.laundry! > w.quiet!);
  assert.equal(w.laundry, w.commute);
});

test("sampled weights lie on the simplex and respect tier order", () => {
  for (let s = 0; s < 2000; s++) {
    const w = sampleWeights(tiers, s);
    const sum = Object.values(w).reduce((a, b) => a + (b ?? 0), 0);
    assert.ok(Math.abs(sum - 1) < 1e-9);
    assert.ok(w.cost! >= Math.max(w.laundry!, w.commute!) && Math.min(w.laundry!, w.commute!) >= w.quiet!);
  }
});

test("hand-checked true cost: Plymouth Rd 2BR for Maya = $1,131.75", () => {
  const c = costFor(L.find((l) => l.id === "nc-plymouth-2br")!, maya, A);
  // 2050/2 rent + (70 elec + 71 gas heat + 60 internet)/2 + 150 fees/2/12
  assert.ok(Math.abs(c.effective.mid - 1131.75) < 0.01);
});

test("deterministic: same inputs give identical results", () => {
  assert.deepEqual(decide(maya, L, A), decide(maya, L, A));
});

test("first-rank acceptability sums to 1 across feasible listings", () => {
  const r = decide(jordan, L, A);
  const s = r.evaluations.filter((e) => e.feasible).reduce((a, e) => a + e.rankAcceptability[0], 0);
  assert.ok(Math.abs(s - 1) < 1e-9);
});

test("a Pareto-dominated listing never ranks first without data noise", () => {
  const r = decide(maya, L, A, { dataUncertainty: false });
  for (const e of r.evaluations) if (e.dominatedBy.length) assert.equal(e.rankAcceptability[0], 0);
  // and dominance itself is consistent
  const ev = r.evaluations.filter((e) => e.feasible);
  for (const e of ev) for (const d of e.dominatedBy) assert.ok(dominates(ev.find((x) => x.listingId === d)!.value, e.value, maya.priorities.flat()));
});

test("no rank reversal from list changes: removing a listing never changes another's values", () => {
  const full = decide(maya, L, A);
  const fewer = decide(maya, L.filter((l) => l.id !== "lt-2br"), A);
  const v = (r: typeof full, id: string) => r.evaluations.find((e) => e.listingId === id)!.value;
  assert.deepEqual(v(full, "nc-plymouth-2br"), v(fewer, "nc-plymouth-2br"));
});

test("demo flip: moving laundry above cost changes Maya's #1", () => {
  const before = decide(maya, L, A).winnerId;
  const after = decide({ ...maya, priorities: [["laundry"], ["cost"], ["commute"], ["lateNight"], ["quiet", "space"]] }, L, A).winnerId;
  assert.notEqual(before, after);
});

test("eliminations always say why", () => {
  for (const e of decide(maya, L, A).evaluations) if (!e.feasible) assert.ok(e.eliminatedBecause.length > 0);
});

test("demo Test 2: requiring in-unit laundry leaves Maya's top two unchanged", () => {
  const a = decide(maya, L, A), b = decide({ ...maya, hardConstraints: { inUnitLaundryRequired: true } }, L, A);
  assert.equal(a.winnerId, b.winnerId);
  assert.equal(a.evaluations[0].rankAcceptability[0], b.evaluations[0].rankAcceptability[0]);
});

test("demo Test 3: away May-Aug leaves one option and says so", () => {
  const r = decide({ ...maya, monthsNeeded: 8 }, L, A);
  assert.equal(r.verdict, "only-option");
  assert.equal(r.winnerId, "nc-plymouth-2br");
});
