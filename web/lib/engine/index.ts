// decide(): the one function the UI calls. Pure, synchronous, deterministic.
import type {
  Assumptions,
  CriterionId,
  DecisionResult,
  Listing,
  ListingEvaluation,
  StudentProfile,
  TippingPoint,
} from "../types";
import { costFor } from "./cost";
import { rawValues, toValues } from "./criteria";
import { eliminationReasons, isNearMiss } from "./filter";
import { bisect, dominates, pointScore, tierNames, whyDeltas } from "./explain";
import { hashString, triangular, u01 } from "./rng";
import { confidenceFactor, flattenTiers, rocWeights, runSmaa, SEED } from "./smaa";

export interface DecideOptions {
  samples?: number; // 5000 default; drop to 2000 if a laptop struggles
  dataUncertainty?: boolean; // also sample cost range and bus-time spread
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function decide(
  profile: StudentProfile,
  listings: Listing[],
  assumptions: Assumptions,
  opts: DecideOptions = {},
): DecisionResult {
  const samples = opts.samples ?? 5000;
  const dataUncertainty = opts.dataUncertainty ?? true;
  // Drop place chips whose place is gone, so a stale id can never produce NaN scores.
  const known = new Set((profile.places ?? []).map((p) => `place:${p.id}`));
  const tiers = profile.priorities
    .map((t) => t.filter((c) => !c.startsWith("place:") || known.has(c)))
    .filter((t) => t.length > 0);
  const criteria = flattenTiers(tiers);
  const wROC = rocWeights(tiers);

  // 1) cost, raw values and anchored values at mid estimates, for every listing
  const base = listings.map((l) => {
    const cost = costFor(l, profile, assumptions);
    const raw = rawValues(l, profile, { effectiveCost: cost.effective.mid, busFactor: 1 });
    const value = toValues(raw, profile, assumptions);
    const reasons = eliminationReasons(l, profile, cost);
    return { l, cost, raw, value, reasons, score: pointScore(value, wROC) };
  });
  const feasible = base.filter((b) => b.reasons.length === 0);

  // 2) value vectors under draw s (common random numbers keyed by listing id)
  const spread = assumptions.busTimeSpread;
  const valuesFor = (i: number, s: number) => {
    const b = feasible[i];
    if (!dataUncertainty) return b.value;
    const key = hashString(b.l.id);
    const e = b.cost.effective;
    const c = triangular(e.lo, e.mid, e.hi, u01(SEED, s, key, 1));
    const busFactor = 1 + spread * (2 * u01(SEED, s, key, 2) - 1);
    return toValues(rawValues(b.l, profile, { effectiveCost: c, busFactor }), profile, assumptions);
  };

  // 3) SMAA over feasible listings
  const smaa =
    feasible.length > 0 && criteria.length > 0
      ? runSmaa({ ids: feasible.map((b) => b.l.id), criteria, tiers, samples, valuesFor })
      : { rankAcceptability: [], centralWeights: [] };

  // 4) point ranking (ROC) among feasible
  const pointOrder = [...feasible].sort((a, b) => b.score - a.score);
  const pointRank = new Map(pointOrder.map((b, i) => [b.l.id, i + 1]));

  const evals: ListingEvaluation[] = base.map((b) => {
    const fi = feasible.indexOf(b);
    const ra = fi >= 0 ? smaa.rankAcceptability[fi] : [0, 0, 0];
    const wc = fi >= 0 ? smaa.centralWeights[fi] : null;
    let pOver = 0;
    if (dataUncertainty) {
      const key = hashString(b.l.id);
      const e = b.cost.effective;
      let over = 0;
      for (let s = 0; s < samples; s++)
        if (triangular(e.lo, e.mid, e.hi, u01(SEED, s, key, 1)) > profile.budget.capMonthly) over++;
      pOver = over / samples;
    } else pOver = b.cost.effective.mid > profile.budget.capMonthly ? 1 : 0;
    return {
      listingId: b.l.id,
      feasible: fi >= 0,
      eliminatedBecause: b.reasons,
      cost: b.cost,
      raw: b.raw,
      value: b.value,
      pointScore: b.score,
      pointRank: pointRank.get(b.l.id) ?? null,
      dominatedBy:
        fi >= 0 ? feasible.filter((o) => o !== b && dominates(o.value, b.value, criteria)).map((o) => o.l.id) : [],
      rankAcceptability: ra,
      centralWeights: wc,
      confidence: null,
      pOverCap: pOver,
    };
  });

  const ranked = evals
    .filter((e) => e.feasible)
    .sort((a, b) => b.rankAcceptability[0] - a.rankAcceptability[0] || b.pointScore - a.pointScore);
  const eliminated = evals.filter((e) => !e.feasible).sort((a, b) => b.pointScore - a.pointScore);

  // 5) confidence factors for the top 3
  for (const e of ranked.slice(0, 3)) {
    if (!e.centralWeights) continue;
    const fi = feasible.findIndex((b) => b.l.id === e.listingId);
    e.confidence = confidenceFactor(fi, e.centralWeights, feasible.length, criteria, Math.min(samples, 2000), valuesFor);
  }

  const winner = ranked[0] ?? null;
  const runnerUp = ranked[1] ?? null;
  const a1 = winner?.rankAcceptability[0] ?? 0;
  const a2 = runnerUp?.rankAcceptability[0] ?? 0;
  const verdict: DecisionResult["verdict"] = !winner
    ? "none"
    : ranked.length === 1
      ? "only-option"
      : a1 >= 0.6
      ? "robust"
      : a1 - a2 < 0.15
        ? "toss-up"
        : "leaning";

  // 6) tipping points (at ROC weights, against the ROC point leader)
  const tipping: TippingPoint[] = [];
  const leader = pointOrder[0];
  const nameOf = (id: string) => listings.find((l) => l.id === id)!.name;
  if (leader) {
    // price: how much lower would rent per person need to be?
    for (const b of pointOrder.slice(1, 4)) {
      const scoreAt = (drop: number) => {
        const c = costFor(b.l, profile, assumptions, drop);
        const raw = rawValues(b.l, profile, { effectiveCost: c.effective.mid, busFactor: 1 });
        return pointScore(toValues(raw, profile, assumptions), wROC);
      };
      const drop = bisect((d) => scoreAt(d) > leader.score, 0, b.cost.rentShare);
      tipping.push(
        drop == null
          ? { kind: "price", listingId: b.l.id, text: `No rent cut alone makes ${b.l.name} beat ${leader.l.name}; it trails on what you rank highest.` }
          : { kind: "price", listingId: b.l.id, amount: Math.ceil(drop), text: `${b.l.name} overtakes ${leader.l.name} if its rent drops ${usd(Math.ceil(drop))}/person/month.` },
      );
    }
    // swap: which adjacent priority swap changes the leader?
    for (let t = 0; t + 1 < tiers.length; t++) {
      const swapped = tiers.map((x) => [...x]);
      [swapped[t], swapped[t + 1]] = [swapped[t + 1], swapped[t]];
      const w2 = rocWeights(swapped);
      const best = [...feasible].sort((a, b) => pointScore(b.value, w2) - pointScore(a.value, w2))[0];
      if (best && best.l.id !== leader.l.id)
        tipping.push({
          kind: "swap",
          listingId: best.l.id,
          text: `If ${tierNames(tiers[t + 1], profile.places)} mattered more than ${tierNames(tiers[t], profile.places)}, ${best.l.name} would be #1.`,
        });
    }
    // constraint: near-miss eliminations that would otherwise outscore the leader.
    // For a budget miss we re-score at a cap raised just enough to admit it.
    for (const e of eliminated) {
      if (!isNearMiss(e.eliminatedBecause, profile.budget.capMonthly)) continue;
      const r = e.eliminatedBecause[0];
      const b = base.find((x) => x.l.id === e.listingId)!;
      const p2 = r.code === "cap" ? { ...profile, budget: { ...profile.budget, capMonthly: Math.ceil(b.cost.effective.mid) } } : profile;
      const s2 = pointScore(toValues(b.raw, p2, assumptions), wROC);
      const lead2 = r.code === "cap" ? pointScore(toValues(leader.raw, p2, assumptions), wROC) : leader.score;
      if (s2 > lead2)
        tipping.push({
          kind: "constraint",
          listingId: e.listingId,
          amount: r.code === "cap" ? Math.ceil(r.gap ?? 0) : undefined,
          text:
            r.code === "cap"
              ? `Raise your cap by ${usd(Math.ceil(r.gap ?? 0))}/mo and ${nameOf(e.listingId)} becomes your #1.`
              : `${nameOf(e.listingId)} would be #1 if you relaxed one rule: ${r.text}.`,
        });
    }
  }

  const vOf = (id: string) => base.find((b) => b.l.id === id)!.value;
  return {
    weightsROC: Object.fromEntries(
      Object.entries(wROC).map(([c, w]) => [c, w ?? 0]),
    ) as Record<CriterionId, number>,
    evaluations: [...ranked, ...eliminated],
    winnerId: winner?.listingId ?? null,
    runnerUpId: runnerUp?.listingId ?? null,
    verdict,
    whyWinner: winner && runnerUp ? whyDeltas(vOf(winner.listingId), vOf(runnerUp.listingId), wROC) : null,
    tippingPoints: tipping,
    samples,
    monteCarloSE: Math.sqrt(0.25 / samples),
    dataUncertainty,
  };
}

/** For the ChangeStrip: what moved between two results? */
export function diffResults(prev: DecisionResult, next: DecisionResult) {
  const a1 = (r: DecisionResult) =>
    new Map(r.evaluations.map((e) => [e.listingId, e.feasible ? e.rankAcceptability[0] : null]));
  const p = a1(prev);
  const n = a1(next);
  return [...n.keys()]
    .map((id) => ({ listingId: id, before: p.get(id) ?? null, after: n.get(id) ?? null }))
    .filter((d) => d.before !== d.after && Math.abs((d.after ?? 0) - (d.before ?? 0)) >= 0.02)
    .sort((x, y) => Math.abs((y.after ?? 0) - (y.before ?? 0)) - Math.abs((x.after ?? 0) - (x.before ?? 0)));
}
