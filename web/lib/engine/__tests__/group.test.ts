import { test } from "node:test";
import assert from "node:assert/strict";
import { ASSUMPTIONS, LISTINGS, PERSONAS } from "../../seed";
import { decideGroup, groupBudget, type Member } from "../group";
import { decide } from "../index";

const p = PERSONAS[0];
const mk = (id: string, tiers: any, cap = 1500): Member => ({ id, name: id, tiers, budget: [Math.min(1200, cap), cap] });

test("one roommate equals the solo engine's winner", () => {
  const solo = decide({ ...p, priorities: p.priorities }, LISTINGS, ASSUMPTIONS, { samples: 2000 });
  const g = decideGroup(p, [mk("a", p.priorities, p.budget.capMonthly)], LISTINGS, ASSUMPTIONS, "average", { samples: 2000 });
  assert.equal(g.result.winnerId, solo.winnerId);
});

test("group budget is the tightest roommate's cap", () => {
  const b = groupBudget([mk("a", [["cost"]], 1600), mk("b", [["cost"]], 1300)]);
  assert.equal(b.cap, 1300); assert.equal(b.bindingId, "b");
});

test("deterministic and acceptability sums to at most 1 per rank", () => {
  const ms = [mk("a", [["cost"], ["space"], ["quiet"]]), mk("b", [["quiet"], ["laundry"], ["cost"]])];
  const r1 = decideGroup(p, ms, LISTINGS, ASSUMPTIONS, "average", { samples: 1500 });
  const r2 = decideGroup(p, ms, LISTINGS, ASSUMPTIONS, "average", { samples: 1500 });
  assert.deepEqual(r1.result.evaluations.map((e) => e.rankAcceptability), r2.result.evaluations.map((e) => e.rankAcceptability));
  for (const k of [0, 1, 2]) assert.ok(r1.result.evaluations.reduce((s, e) => s + e.rankAcceptability[k], 0) <= 1.0001);
});

test("same-order roommates mostly agree; opposite roommates agree less", () => {
  const same = decideGroup(p, [mk("a", [["cost"], ["space"]]), mk("b", [["cost"], ["space"]])], LISTINGS, ASSUMPTIONS, "average", { samples: 1500 });
  assert.ok(same.extra.agreement > 0.6, `same-order agreement ${same.extra.agreement}`);
  const diff = decideGroup(p, [mk("a", [["cost"], ["space"], ["quiet"], ["laundry"]]), mk("b", [["laundry"], ["quiet"], ["space"], ["cost"]])], LISTINGS, ASSUMPTIONS, "average", { samples: 1500 });
  assert.ok(diff.extra.agreement < same.extra.agreement, `${diff.extra.agreement} vs ${same.extra.agreement}`);
  assert.ok(diff.extra.disagreements.length > 0);
});

test("fair rule never picks a listing with a worse worst-case than the average rule's pick", () => {
  const ms = [mk("a", [["cost"], ["space"], ["quiet"]]), mk("b", [["quiet"], ["laundry"], ["cost"]])];
  const fair = decideGroup(p, ms, LISTINGS, ASSUMPTIONS, "fair", { samples: 1500 });
  const avg = decideGroup(p, ms, LISTINGS, ASSUMPTIONS, "average", { samples: 1500 });
  const w = (g: typeof fair, id: string | null) => (id ? g.extra.worst[id].score : 0);
  assert.ok(w(fair, fair.result.winnerId) >= w(fair, avg.result.winnerId) - 0.05);
});

test("a tighter roommate cap can only remove listings", () => {
  const ms = (cap: number) => [mk("a", [["cost"]], 1700), mk("b", [["cost"]], cap)];
  const loose = decideGroup(p, ms(1700), LISTINGS, ASSUMPTIONS, "average", { samples: 800 });
  const tight = decideGroup(p, ms(1100), LISTINGS, ASSUMPTIONS, "average", { samples: 800 });
  const n = (g: typeof loose) => g.result.evaluations.filter((e) => e.feasible).length;
  assert.ok(n(tight) <= n(loose));
});

test("swap tipping points name the roommate and carry an apply action", () => {
  const ms = [mk("a", [["cost"], ["space"], ["quiet"]]), mk("b", [["quiet"], ["laundry"], ["cost"]])];
  const r = decideGroup(p, ms, LISTINGS, ASSUMPTIONS, "average", { samples: 1000 });
  for (const t of r.result.tippingPoints.filter((x) => x.kind === "swap")) {
    assert.equal(t.apply?.type, "memberSwap");
    assert.match(t.text, /^If (a|b) /);
  }
});
