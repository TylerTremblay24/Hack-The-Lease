import { test } from "node:test";
import assert from "node:assert/strict";
import { WEB_LISTINGS, DEMO_LISTINGS, LISTINGS, ASSUMPTIONS, PERSONAS } from "../../seed";
import { decide } from "../index";
import { decideGroup } from "../group";

test("web listings are well-formed and traceable", () => {
  assert.ok(WEB_LISTINGS.length >= 60);
  const ids = new Set<string>();
  for (const l of WEB_LISTINGS) {
    assert.ok(!ids.has(l.id), `duplicate id ${l.id}`); ids.add(l.id);
    assert.ok(l.source && /^https:\/\//.test(l.source.url) && l.source.address, `${l.id} needs a source`);
    assert.ok(l.rentTotalMonthly >= 500 && l.rentTotalMonthly <= 8000, `${l.id} rent`);
    assert.ok(l.bedrooms >= 1 && l.sqft >= 150 && l.sqft <= 4000, `${l.id} size`);
    assert.ok(l.coords.lat > 42.24 && l.coords.lat < 42.31 && l.coords.lng > -83.8 && l.coords.lng < -83.69, `${l.id} coords`);
    assert.equal(l.provenance.coords, "ESTIMATE");
    assert.equal(l.provenance.rentTotalMonthly, "REAL");
    for (const a of ["central", "north", "kerrytown", "medical", "downtown"] as const) assert.ok(l.travel[a].walkMin >= 1, `${l.id} travel`);
  }
});

test("demo listings stay synthetic and ids never collide with web ids", () => {
  assert.ok(DEMO_LISTINGS.every((l) => !l.source));
  assert.equal(new Set(LISTINGS.map((l) => l.id)).size, LISTINGS.length);
});

test("engine scores the full bank for every persona, finite numbers, deterministic", () => {
  for (const p of PERSONAS) {
    const a = decide(p, LISTINGS, ASSUMPTIONS, { samples: 1500 }), b = decide(p, LISTINGS, ASSUMPTIONS, { samples: 1500 });
    assert.equal(a.winnerId, b.winnerId);
    for (const e of a.evaluations.filter((x) => x.feasible)) assert.ok(Number.isFinite(e.pointScore) && e.rankAcceptability.every(Number.isFinite));
  }
});

test("group mode handles the full bank", () => {
  const p = PERSONAS[0];
  const r = decideGroup(p, [{ id: "a", name: "A", tiers: [["cost"], ["laundry"]], budget: [1200, 1500] }, { id: "b", name: "B", tiers: [["quiet"], ["cost"]], budget: [1100, 1400] }], LISTINGS, ASSUMPTIONS, "average", { samples: 1500 });
  assert.ok(r.result.evaluations.length === LISTINGS.length);
});
