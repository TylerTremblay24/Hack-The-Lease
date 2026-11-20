import { readFileSync } from "node:fs";
import { decide, diffResults } from "../index";
import type { Assumptions, Listing, StudentProfile } from "../../types";
const root = new URL("../../../../data/seed/", import.meta.url);
const L: Listing[] = JSON.parse(readFileSync(new URL("listings.json", root), "utf8"));
const A: Assumptions = JSON.parse(readFileSync(new URL("assumptions.json", root), "utf8"));
const P: StudentProfile[] = JSON.parse(readFileSync(new URL("profiles.json", root), "utf8"));
const name = (id: string | null) => L.find((l) => l.id === id)?.name ?? "-";
export function show(label: string, p: StudentProfile, opts = {}) {
  const t0 = performance.now();
  const r = decide(p, L, A, opts);
  const ms = performance.now() - t0;
  console.log(`\n== ${label}  (${ms.toFixed(0)} ms, verdict ${r.verdict})`);
  for (const e of r.evaluations.filter((e) => e.feasible).slice(0, 6))
    console.log(`  ${name(e.listingId).padEnd(30)} a1=${(e.rankAcceptability[0]*100).toFixed(1).padStart(5)}%  a2=${(e.rankAcceptability[1]*100).toFixed(0).padStart(3)}%  pt=${e.pointScore.toFixed(3)} ptRank=${e.pointRank} cost=$${e.cost.effective.mid.toFixed(0)} [${e.cost.effective.lo.toFixed(0)}-${e.cost.effective.hi.toFixed(0)}] conf=${e.confidence?.toFixed(2) ?? "-"} dom=${e.dominatedBy.length}`);
  for (const e of r.evaluations.filter((e) => !e.feasible)) console.log(`  x ${name(e.listingId).padEnd(28)} ${e.eliminatedBecause.map((x) => x.text).join("; ")}`);
  console.log("  why:", r.whyWinner?.map((d) => `${d.criterion} ${d.delta >= 0 ? "+" : ""}${d.delta.toFixed(3)}`).join(", "));
  for (const t of r.tippingPoints) console.log("  tip:", t.text);
  return r;
}
const [maya, jordan] = P;
const r0 = show("Maya baseline", maya);
const maya2 = { ...maya, priorities: [["laundry"], ["cost"], ["commute"], ["lateNight"], ["quiet", "space"]] as any };
const r1 = show("Maya: laundry above cost", maya2);
console.log("  diff:", diffResults(r0, r1).map((d) => `${name(d.listingId)} ${((d.before??0)*100).toFixed(0)}%->${((d.after??0)*100).toFixed(0)}%`).join(" | "));
const maya3 = { ...maya, hardConstraints: { inUnitLaundryRequired: true } };
show("Maya: in-unit laundry required", maya3);
const maya4 = { ...maya, monthsNeeded: 8 };
show("Maya: away May-Aug (monthsNeeded 8)", maya4);
show("Maya: no data uncertainty", maya, { dataUncertainty: false });
const j0 = show("Jordan baseline", jordan);
const j1 = show("Jordan: quiet to top", { ...jordan, priorities: [["quiet"], ["cost"], ["commute", "lateNight"], ["grocery"]] as any });
console.log("  diff:", diffResults(j0, j1).map((d) => `${name(d.listingId)} ${((d.before??0)*100).toFixed(0)}%->${((d.after??0)*100).toFixed(0)}%`).join(" | "));
