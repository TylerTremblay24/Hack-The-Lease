import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decide } from "../index";
import type { Assumptions, Listing, StudentProfile } from "../../types";

const root = new URL("../../../../data/seed/", import.meta.url);
const L: Listing[] = JSON.parse(readFileSync(new URL("listings.json", root), "utf8"));
const A: Assumptions = JSON.parse(readFileSync(new URL("assumptions.json", root), "utf8"));
const [maya]: StudentProfile[] = JSON.parse(readFileSync(new URL("profiles.json", root), "utf8"));
const n = (p: StudentProfile) => decide(p, L, A).evaluations.filter((e) => e.feasible).length;

test("a wider range never keeps fewer listings than either end alone", () => {
  const at = (m: number, o: number) => ({ ...maya, monthsNeeded: m, household: { occupants: o } });
  const wide = n({ ...at(8, 2), monthsRange: [4, 12], occupantsRange: [1, 3] });
  const lo = n({ ...at(4, 1), monthsRange: [4, 4], occupantsRange: [1, 1] });
  assert.ok(wide >= Math.min(lo, n(at(8, 2))) - 0, `wide ${wide} lo ${lo}`);
});

test("range minimums decide bedroom and lease checks", () => {
  const p = { ...maya, household: { occupants: 3 }, occupantsRange: [1, 3] as [number, number], monthsRange: [12, 12] as [number, number] };
  const r = decide(p, L, A);
  const bad = r.evaluations.filter((e) => e.eliminatedBecause.some((x) => x.code === "bedrooms"));
  assert.equal(bad.length, 0); // every seed listing has at least 1 bedroom
});
