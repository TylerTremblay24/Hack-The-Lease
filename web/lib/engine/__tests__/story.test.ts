import { test } from "node:test";
import assert from "node:assert/strict";
import { ASSUMPTIONS, LISTINGS, PERSONAS } from "../../seed";
import { decide } from "../index";
import { buildStory, factFor } from "../../story";

const p = PERSONAS[0];
const r = decide(p, LISTINGS, ASSUMPTIONS, { samples: 1500 });
const ev = r.evaluations.find((e) => e.listingId === r.winnerId)!;
const l = LISTINGS.find((x) => x.id === r.winnerId)!;
const order = p.priorities.flat();

test("story has three lines in the student's order, each with a real fact", () => {
  const s = buildStory({ profile: p, listing: l, ev, result: r, places: [], order, listings: LISTINGS });
  assert.equal(s.lines.length, 3);
  assert.deepEqual(s.lines.map((x) => x.criterion), order.slice(0, 3));
  for (const line of s.lines) assert.ok(line.fact.length > 5);
  assert.match(s.confidence, /\d+% of/);
});

test("persona's own words are attached to the matching chip, and can be turned off", () => {
  const withQ = buildStory({ profile: p, listing: l, ev, result: r, places: [], order: ["laundry", "cost", "commute"], listings: LISTINGS });
  assert.ok(withQ.lines.find((x) => x.criterion === "laundry")?.quote);
  const none = buildStory({ profile: p, listing: l, ev, result: r, places: [], order: ["laundry"], listings: LISTINGS, withQuotes: false });
  assert.equal(none.lines[0].quote, undefined);
});

test("facts use the listing's own numbers", () => {
  assert.match(factFor("space", l, ev, p, []), new RegExp(`${Math.round(ev.raw.space)} sq ft`));
  assert.match(factFor("cost", l, ev, p, []), /cap/);
});

test("a weak top-5 criterion becomes the stated trade-off", () => {
  const worst = Object.keys(ev.value).filter((c) => !c.startsWith("place:")).sort((a, b) => ev.value[a as any] - ev.value[b as any])[0] as any;
  if (ev.value[worst] >= 0.4) return; // nothing weak for this winner; nothing to assert
  const s = buildStory({ profile: p, listing: l, ev, result: r, places: [], order: [worst, "cost"], listings: LISTINGS });
  assert.ok(s.tradeoff && s.tradeoff.includes("trade-off"));
});
