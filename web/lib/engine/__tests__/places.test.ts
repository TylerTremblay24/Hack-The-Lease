import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decide } from "../index";
import { walkMinToPlace } from "../criteria";
import { criterionLabel } from "../explain";
import type { Assumptions, Listing, StudentProfile, UserPlace } from "../../types";

const root = new URL("../../../../data/seed/", import.meta.url);
const L: Listing[] = JSON.parse(readFileSync(new URL("listings.json", root), "utf8"));
const A: Assumptions = JSON.parse(readFileSync(new URL("assumptions.json", root), "utf8"));
const P: UserPlace[] = JSON.parse(readFileSync(new URL("places.json", root), "utf8"));
const [maya]: StudentProfile[] = JSON.parse(readFileSync(new URL("profiles.json", root), "utf8"));
const zing = P.find((p) => p.id === "zingermans-deli")!;
const ncrb = P.find((p) => p.id === "ncrb")!;

test("walking minutes: Kerrytown loft is close to Zingerman's, far from the North Campus rec building", () => {
  const loft = L.find((l) => l.id === "kt-loft-2br")!;
  assert.ok(walkMinToPlace(loft, zing) < 8);
  assert.ok(walkMinToPlace(loft, ncrb) > 25);
});

test("a place chip ranks, scores 0..1, and acceptability still sums to 1", () => {
  const p: StudentProfile = { ...maya, places: [zing], priorities: [["place:zingermans-deli"], ["cost"]], hardConstraints: {} };
  const r = decide(p, L, A);
  const f = r.evaluations.filter((e) => e.feasible);
  assert.ok(f.length > 0);
  for (const e of f) assert.ok(e.value["place:zingermans-deli"] >= 0 && e.value["place:zingermans-deli"] <= 1);
  assert.ok(Math.abs(f.reduce((a, e) => a + e.rankAcceptability[0], 0) - 1) < 1e-9);
  assert.ok((r.weightsROC["place:zingermans-deli"] ?? 0) > 0);
});

test("moving a place chip to the top can change the leader (the demo moment)", () => {
  const base: StudentProfile = { ...maya, hardConstraints: {}, budget: { targetMonthly: 1500, capMonthly: 2200 }, places: [ncrb, zing] };
  const a = decide({ ...base, priorities: [["place:ncrb"], ["cost"]] }, L, A).winnerId;
  const b = decide({ ...base, priorities: [["place:zingermans-deli"], ["cost"]] }, L, A).winnerId;
  assert.notEqual(a, b);
});

test("place must-have eliminates far listings with a reason and a gap", () => {
  const p: StudentProfile = { ...maya, hardConstraints: { placeMaxWalkMin: { "zingermans-deli": 6 } }, places: [zing], priorities: [["cost"]], budget: { targetMonthly: 1500, capMonthly: 2200 } };
  const r = decide(p, L, A);
  const far = r.evaluations.filter((e) => e.eliminatedBecause.some((x) => x.code === "place"));
  assert.ok(far.length > 0);
  assert.ok(far[0].eliminatedBecause.find((x) => x.code === "place")!.gap! > 0);
  for (const e of r.evaluations.filter((x) => x.feasible)) assert.ok(walkMinToPlace(L.find((l) => l.id === e.listingId)!, zing) <= 6);
});

test("a stale place chip (place removed) is ignored, not NaN", () => {
  const r = decide({ ...maya, places: [], priorities: [["place:gone"], ["cost"]] }, L, A);
  for (const e of r.evaluations) assert.ok(Number.isFinite(e.pointScore));
  assert.equal(criterionLabel("place:zingermans-deli", [zing]), "Near Zingerman's Deli");
});
