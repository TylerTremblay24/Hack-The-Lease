// Roommates: SMAA with several decision makers.
// Every roommate gives their own ORDER of priorities (and their own budget). In each of the N draws we sample one
// weight vector per roommate (each consistent with that roommate's order), score every listing for every roommate,
// and merge the scores with the group rule:
//   "average": the mean of the roommates' scores (utilitarian)
//   "fair":    the lowest roommate's score (nobody gets left behind)
// Rank acceptability, why-#1 and tipping points then work exactly as for one student, except that the
// tipping points name WHICH roommate would have to move. Shared: must-haves, schedule, places, months, headcount.
import type {
  Assumptions, CriterionId, DecisionResult, Listing, ListingEvaluation, StudentProfile, TippingPoint,
} from "../types";
import { costFor } from "./cost";
import { rawValues, toValues } from "./criteria";
import { eliminationReasons, isNearMiss } from "./filter";
import { bisect, dominates, pointScore, tierNames, whyDeltas } from "./explain";
import { hashString, triangular, u01 } from "./rng";
import { flattenTiers, rocWeights, sampleWeights, SEED } from "./smaa";

export interface Member { id: string; name: string; tiers: CriterionId[][]; budget: [number, number] }
export type GroupRule = "average" | "fair";

export interface Disagreement {
  criterion: CriterionId; gap: number;
  high: { name: string; rank: number | null }; low: { name: string; rank: number | null };
}
export interface GroupExtras {
  rule: GroupRule;
  members: { id: string; name: string }[];
  /** point score 0..1 at each roommate's ROC weights */
  memberScores: Record<string, Record<string, number>>;
  /** share of draws in which this listing is that roommate's own #1 */
  memberFirst: Record<string, Record<string, number>>;
  favorites: Record<string, string | null>; // roommate id -> their own point-score leader
  agreement: number; // share of draws where every roommate's own #1 is the same listing
  fairestId: string | null; // best worst-case roommate score
  worst: Record<string, { memberId: string; name: string; score: number }>;
  disagreements: Disagreement[];
  budget: { target: number; cap: number; bindingId: string; bindingName: string };
}

export const groupBudget = (members: Member[]) => {
  const binding = members.reduce((a, b) => (b.budget[1] < a.budget[1] ? b : a), members[0]);
  return { target: Math.min(...members.map((m) => m.budget[0])), cap: binding.budget[1], bindingId: binding.id, bindingName: binding.name };
};

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const memberSeed = (id: string) => (SEED + (hashString(id) % 100000)) >>> 0;

export function decideGroup(
  profile: StudentProfile, members: Member[], listings: Listing[], assumptions: Assumptions, rule: GroupRule,
  opts: { samples?: number; dataUncertainty?: boolean } = {},
): { result: DecisionResult; extra: GroupExtras } {
  const samples = opts.samples ?? 3000;
  const dataUncertainty = opts.dataUncertainty ?? true;
  const gb = groupBudget(members);
  const known = new Set((profile.places ?? []).map((p) => `place:${p.id}`));
  const clean = (m: Member): CriterionId[][] => {
    const t = m.tiers.map((x) => x.filter((c) => !c.startsWith("place:") || known.has(c))).filter((x) => x.length);
    return t.length ? t : [["cost"]];
  };
  const tiersOf = members.map(clean);
  const wOf = (tiers: CriterionId[][]) => rocWeights(tiers);
  const memberW = tiersOf.map(wOf);
  const criteria = [...new Set(tiersOf.flatMap(flattenTiers))];
  const p: StudentProfile = { ...profile, budget: { targetMonthly: gb.target, capMonthly: gb.cap }, priorities: [criteria] };
  const agg = (xs: number[]) => (rule === "fair" ? Math.min(...xs) : mean(xs));

  const base = listings.map((l) => {
    const cost = costFor(l, p, assumptions);
    const raw = rawValues(l, p, { effectiveCost: cost.effective.mid, busFactor: 1 });
    const value = toValues(raw, p, assumptions);
    const reasons = eliminationReasons(l, p, cost);
    const scores = memberW.map((w) => pointScore(value, w));
    return { l, cost, raw, value, reasons, scores, score: agg(scores) };
  });
  const feasible = base.filter((b) => b.reasons.length === 0);
  const n = feasible.length;

  const spread = assumptions.busTimeSpread;
  const valuesFor = (i: number, s: number) => {
    const b = feasible[i];
    if (!dataUncertainty) return b.value;
    const key = hashString(b.l.id);
    const e = b.cost.effective;
    const c = triangular(e.lo, e.mid, e.hi, u01(SEED, s, key, 1));
    const busFactor = 1 + spread * (2 * u01(SEED, s, key, 2) - 1);
    return toValues(rawValues(b.l, p, { effectiveCost: c, busFactor }), p, assumptions);
  };

  // joint sampling
  const groupRank = feasible.map(() => [0, 0, 0]);
  const ownFirst = members.map(() => feasible.map(() => 0));
  let agree = 0;
  if (n > 0) {
    const U = members.map(() => new Float64Array(n));
    const G = new Float64Array(n);
    const order = Array.from({ length: n }, (_, i) => i);
    for (let s = 0; s < samples; s++) {
      const ws = members.map((m, mi) => sampleWeights(tiersOf[mi], s, memberSeed(m.id)));
      for (let i = 0; i < n; i++) {
        const v = valuesFor(i, s);
        const us: number[] = [];
        for (let mi = 0; mi < members.length; mi++) {
          let u = 0;
          for (const c of criteria) u += (ws[mi][c] ?? 0) * v[c];
          U[mi][i] = u; us.push(u);
        }
        G[i] = agg(us);
      }
      order.sort((a, b) => G[b] - G[a] || a - b);
      for (let r = 0; r < Math.min(3, n); r++) groupRank[order[r]][r]++;
      let first = -1, same = true;
      for (let mi = 0; mi < members.length; mi++) {
        let best = 0;
        for (let i = 1; i < n; i++) if (U[mi][i] > U[mi][best]) best = i;
        ownFirst[mi][best]++;
        if (first === -1) first = best; else if (first !== best) same = false;
      }
      if (same) agree++;
    }
  }

  // point ranking and per-listing evaluations
  const pointOrder = [...feasible].sort((a, b) => b.score - a.score);
  const pointRank = new Map(pointOrder.map((b, i) => [b.l.id, i + 1]));
  const wG: Partial<Record<CriterionId, number>> = {};
  for (const c of criteria) wG[c] = mean(memberW.map((w) => w[c] ?? 0));

  const evals: ListingEvaluation[] = base.map((b) => {
    const fi = feasible.indexOf(b);
    let over = 0;
    if (dataUncertainty) {
      const key = hashString(b.l.id), e = b.cost.effective;
      for (let s = 0; s < samples; s++) if (triangular(e.lo, e.mid, e.hi, u01(SEED, s, key, 1)) > gb.cap) over++;
    } else if (b.cost.effective.mid > gb.cap) over = samples;
    return {
      listingId: b.l.id, feasible: fi >= 0, eliminatedBecause: b.reasons, cost: b.cost, raw: b.raw, value: b.value,
      pointScore: b.score, pointRank: pointRank.get(b.l.id) ?? null,
      dominatedBy: fi >= 0 ? feasible.filter((o) => o !== b && dominates(o.value, b.value, criteria)).map((o) => o.l.id) : [],
      rankAcceptability: fi >= 0 ? groupRank[fi].map((x) => x / samples) : [0, 0, 0],
      centralWeights: null, confidence: null, pOverCap: over / samples,
    };
  });
  const ranked = evals.filter((e) => e.feasible).sort((a, b) => b.rankAcceptability[0] - a.rankAcceptability[0] || b.pointScore - a.pointScore);
  const eliminated = evals.filter((e) => !e.feasible).sort((a, b) => b.pointScore - a.pointScore);
  const winner = ranked[0] ?? null, runnerUp = ranked[1] ?? null;
  const a1 = winner?.rankAcceptability[0] ?? 0, a2 = runnerUp?.rankAcceptability[0] ?? 0;
  const verdict: DecisionResult["verdict"] = !winner ? "none" : ranked.length === 1 ? "only-option" : a1 >= 0.6 ? "robust" : a1 - a2 < 0.15 ? "toss-up" : "leaning";

  // roommate-level facts
  const memberScores: GroupExtras["memberScores"] = {}, memberFirst: GroupExtras["memberFirst"] = {}, worst: GroupExtras["worst"] = {};
  feasible.forEach((b, i) => {
    memberScores[b.l.id] = {}; memberFirst[b.l.id] = {};
    let w = 0;
    members.forEach((m, mi) => {
      memberScores[b.l.id][m.id] = b.scores[mi];
      memberFirst[b.l.id][m.id] = ownFirst[mi][i] / samples;
      if (b.scores[mi] < b.scores[w]) w = mi;
    });
    worst[b.l.id] = { memberId: members[w].id, name: members[w].name, score: b.scores[w] };
  });
  const favorites: GroupExtras["favorites"] = {};
  members.forEach((m, mi) => {
    favorites[m.id] = feasible.length ? [...feasible].sort((a, b) => b.scores[mi] - a.scores[mi])[0].l.id : null;
  });
  const fairest = [...feasible].sort((a, b) => Math.min(...b.scores) - Math.min(...a.scores) || b.score - a.score)[0];

  const rankIn = (mi: number, c: CriterionId) => {
    const f = flattenTiers(tiersOf[mi]);
    return f.includes(c) ? f.indexOf(c) + 1 : null;
  };
  const disagreements: Disagreement[] = criteria.map((c) => {
    const ws = memberW.map((w) => w[c] ?? 0);
    const hi = ws.indexOf(Math.max(...ws)), lo = ws.indexOf(Math.min(...ws));
    return { criterion: c, gap: ws[hi] - ws[lo], high: { name: members[hi].name, rank: rankIn(hi, c) }, low: { name: members[lo].name, rank: rankIn(lo, c) } };
  }).filter((d) => d.gap >= 0.06).sort((a, b) => b.gap - a.gap).slice(0, 3);

  // tipping points
  const tipping: TippingPoint[] = [];
  const leader = pointOrder[0];
  const nameOf = (id: string) => listings.find((l) => l.id === id)!.name;
  if (leader) {
    for (const b of pointOrder.slice(1, 4)) {
      const scoreAt = (drop: number) => {
        const c = costFor(b.l, p, assumptions, drop);
        const v = toValues(rawValues(b.l, p, { effectiveCost: c.effective.mid, busFactor: 1 }), p, assumptions);
        return agg(memberW.map((w) => pointScore(v, w)));
      };
      const drop = bisect((d) => scoreAt(d) > leader.score, 0, b.cost.rentShare);
      tipping.push(drop == null
        ? { kind: "price", listingId: b.l.id, text: `No rent cut alone makes ${b.l.name} the group's pick.` }
        : { kind: "price", listingId: b.l.id, amount: Math.ceil(drop), text: `${b.l.name} becomes the group's pick if its rent drops ${usd(Math.ceil(drop))}/person/month.` });
    }
    // which roommate's priority swap would change the group pick?
    members.forEach((m, mi) => {
      const tiers = tiersOf[mi];
      for (let t = 0; t + 1 < tiers.length; t++) {
        const sw = tiers.map((x) => [...x]);
        [sw[t], sw[t + 1]] = [sw[t + 1], sw[t]];
        const w2 = memberW.map((w, k) => (k === mi ? wOf(sw) : w));
        const best = [...feasible].sort((a, b) => agg(w2.map((w) => pointScore(b.value, w))) - agg(w2.map((w) => pointScore(a.value, w))))[0];
        if (best && best.l.id !== leader.l.id)
          tipping.push({
            kind: "swap", listingId: best.l.id, apply: { type: "memberSwap", member: m.id, tier: t },
            text: `If ${m.name} put ${tierNames(tiers[t + 1], profile.places)} above ${tierNames(tiers[t], profile.places)}, ${best.l.name} would be the group's #1.`,
          });
      }
    });
    // the roommate with the tightest budget sets the cap for everyone
    const others = Math.min(...members.filter((m) => m.id !== gb.bindingId).map((m) => m.budget[1]), Infinity);
    for (const e of eliminated) {
      if (!isNearMiss(e.eliminatedBecause, gb.cap)) continue;
      const r = e.eliminatedBecause[0];
      if (r.code !== "cap") continue;
      const b = base.find((x) => x.l.id === e.listingId)!;
      const to = Math.ceil(b.cost.effective.mid);
      if (to > others) continue; // another roommate's cap would still block it
      const p2: StudentProfile = { ...p, budget: { ...p.budget, capMonthly: to } };
      const sc = (x: typeof base[number]) => agg(memberW.map((w) => pointScore(toValues(x.raw, p2, assumptions), w)));
      if (sc(b) > sc(leader))
        tipping.push({
          kind: "constraint", listingId: e.listingId, amount: Math.ceil(r.gap ?? 0), apply: { type: "memberCap", member: gb.bindingId, to },
          text: `${gb.bindingName} raising their cap by ${usd(Math.ceil(r.gap ?? 0))}/mo makes ${nameOf(e.listingId)} the group's #1.`,
        });
    }
  }

  const vOf = (id: string) => base.find((b) => b.l.id === id)!.value;
  const result: DecisionResult = {
    weightsROC: Object.fromEntries(criteria.map((c) => [c, wG[c] ?? 0])) as Record<CriterionId, number>,
    evaluations: [...ranked, ...eliminated], winnerId: winner?.listingId ?? null, runnerUpId: runnerUp?.listingId ?? null,
    verdict, whyWinner: winner && runnerUp ? whyDeltas(vOf(winner.listingId), vOf(runnerUp.listingId), wG) : null,
    tippingPoints: tipping, samples, monteCarloSE: Math.sqrt(0.25 / samples), dataUncertainty,
  };
  return {
    result,
    extra: {
      rule, members: members.map((m) => ({ id: m.id, name: m.name })), memberScores, memberFirst, favorites,
      agreement: n ? agree / samples : 0, fairestId: fairest?.l.id ?? null, worst, disagreements,
      budget: { target: gb.target, cap: gb.cap, bindingId: gb.bindingId, bindingName: gb.bindingName },
    },
  };
}
