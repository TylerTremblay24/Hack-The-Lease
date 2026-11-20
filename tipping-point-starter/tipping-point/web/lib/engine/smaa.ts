// SMAA-2 (Stochastic Multicriteria Acceptability Analysis; Lahdelma & Salminen 2001).
// The student gives an ORDER of importance, not exact weights. We sample every
// weight vector consistent with that order (uniformly), optionally also sample the
// uncertain data (cost range, bus time), and count how often each listing ranks
// 1st / 2nd / 3rd. Those shares are the rank acceptability indices.
import type { CriterionId } from "../types";
import { hashString, u01 } from "./rng";

export const SEED = 20261119;

export const flattenTiers = (tiers: CriterionId[][]) => tiers.flat();

/**
 * Rank-order-centroid (ROC) weights: the centroid of the region of weights that
 * respect the student's order. Position p of k gets (1/k) * sum_{m=p..k} 1/m.
 * Tied criteria share the mean ROC weight of the positions they span.
 */
export function rocWeights(tiers: CriterionId[][]): Partial<Record<CriterionId, number>> {
  const k = flattenTiers(tiers).length;
  const roc = (p: number) => {
    let s = 0;
    for (let m = p; m <= k; m++) s += 1 / m;
    return s / k;
  };
  const w: Partial<Record<CriterionId, number>> = {};
  let pos = 1;
  for (const tier of tiers) {
    let sum = 0;
    for (let i = 0; i < tier.length; i++) sum += roc(pos + i);
    for (const c of tier) w[c] = sum / tier.length;
    pos += tier.length;
  }
  return w;
}

/**
 * Weight draw s, uniform over {w on the simplex : every weight in tier t >= every weight in tier t+1}.
 * Method: uniform simplex point via normalized exponentials, sorted descending, handed out
 * tier by tier; inside a tier the order is random (keyed by criterion, so it's stable).
 * Common random numbers: draw s depends only on (seed, s, slot) — reordering chips
 * re-assigns the SAME numbers, so changes reflect the student's edit, not noise.
 */
export function sampleWeights(tiers: CriterionId[][], s: number, seed = SEED): Partial<Record<CriterionId, number>> {
  const k = flattenTiers(tiers).length;
  const e: number[] = [];
  let sum = 0;
  for (let i = 0; i < k; i++) {
    const x = -Math.log(u01(seed, s, i));
    e.push(x);
    sum += x;
  }
  e.sort((a, b) => b - a);
  const w: Partial<Record<CriterionId, number>> = {};
  let idx = 0;
  for (const tier of tiers) {
    const order = [...tier].sort((a, b) => u01(seed, s, 7777, hashString(a)) - u01(seed, s, 7777, hashString(b)));
    for (const c of order) w[c] = e[idx++] / sum;
  }
  return w;
}

export interface SmaaInput {
  ids: string[]; // feasible listings only
  criteria: CriterionId[]; // included criteria (weight may be > 0)
  tiers: CriterionId[][];
  samples: number;
  /** values for listing i under draw s (data uncertainty), or fixed values. */
  valuesFor: (i: number, s: number) => Record<CriterionId, number>;
}

export interface SmaaOutput {
  rankAcceptability: number[][]; // [listing][rank 0..2]
  centralWeights: (Record<CriterionId, number> | null)[];
}

export function runSmaa({ ids, criteria, tiers, samples, valuesFor }: SmaaInput): SmaaOutput {
  const n = ids.length;
  const rankCounts = ids.map(() => [0, 0, 0]);
  const centralSum = ids.map(() => Object.fromEntries(criteria.map((c) => [c, 0])) as Record<CriterionId, number>);
  const score = new Float64Array(n);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let s = 0; s < samples; s++) {
    const w = sampleWeights(tiers, s);
    for (let i = 0; i < n; i++) {
      const v = valuesFor(i, s);
      let u = 0;
      for (const c of criteria) u += (w[c] ?? 0) * v[c];
      score[i] = u;
    }
    order.sort((a, b) => score[b] - score[a] || a - b); // deterministic tie-break
    for (let r = 0; r < Math.min(3, n); r++) rankCounts[order[r]][r]++;
    const top = order[0];
    for (const c of criteria) centralSum[top][c] += w[c] ?? 0;
  }
  return {
    rankAcceptability: rankCounts.map((rc) => rc.map((x) => x / samples)),
    centralWeights: centralSum.map((cs, i) =>
      rankCounts[i][0] === 0
        ? null
        : (Object.fromEntries(criteria.map((c) => [c, cs[c] / rankCounts[i][0]])) as Record<CriterionId, number>),
    ),
  };
}

/** SMAA-2 confidence factor: with the listing's own central weights fixed, how often
 *  does it still come out on top across the data-uncertainty draws? */
export function confidenceFactor(
  i: number,
  wc: Record<CriterionId, number>,
  n: number,
  criteria: CriterionId[],
  samples: number,
  valuesFor: (i: number, s: number) => Record<CriterionId, number>,
): number {
  let wins = 0;
  for (let s = 0; s < samples; s++) {
    const util = (j: number) => {
      const v = valuesFor(j, s);
      let u = 0;
      for (const c of criteria) u += wc[c] * v[c];
      return u;
    };
    const mine = util(i);
    let best = true;
    for (let j = 0; j < n && best; j++) if (j !== i && util(j) > mine) best = false;
    if (best) wins++;
  }
  return wins / samples;
}
