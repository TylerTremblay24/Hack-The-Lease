# Tipping Point

**Rank Ann Arbor apartments by your own priorities, then see exactly what would flip the answer.**
Built for the 24-hour "Hack the Lease" hackathon (Nov 19-20, 2026).

A student drags priority chips into order. A deterministic engine ranks the listings, reports how often each
one finishes #1 across every weighting that respects that order, explains why #1 beats #2, and lists tipping
points: the rent drop, priority swap, or relaxed rule that would change the winner. Claude only reads short
text at the edges (a place description, a pasted listing). It never ranks anything.

> All listings and personas are **synthetic**. Costs, travel and walking times are **estimates** with ranges.
> Nothing here is real housing data, and the app never asks for or infers demographics.

## Run it

Requires Node 18+ (Python 3.10+ only for the optional API).

```bash
npm run setup          # installs web dependencies (from the repo root)
npm run dev            # starts the app at http://localhost:3000/decide
```

On Windows, if `npm run dev` seems to do nothing, open the URL in your browser. Next compiles the page on the
first request (10 to 30 seconds from OneDrive folders). If PowerShell blocks scripts, use Command Prompt.

Optional: the lookup service for custom places (the app works without it):

```bash
cd api
pip install -r requirements.txt
set ANTHROPIC_API_KEY=sk-ant-...        # PowerShell: $env:ANTHROPIC_API_KEY="..."
uvicorn app.main:app --reload --port 8000
```

Without the API, "Look up" falls back to the built-in places or lets you enter a place by hand.
Set `NEXT_PUBLIC_API_URL` if the API is not at `http://localhost:8000`, and `ANTHROPIC_MODEL` to change the model.

## Tests

```bash
npm run test:engine                      # 25+ engine tests
npm run demo:numbers                     # prints the demo scenarios
cd api && python -m pytest -q tests      # API tests (Claude is stubbed, no key needed)
```

## What it does

| Area | What the student can do |
|------|------------------------|
| Priorities | Drag chips from a bank of 12 into a ranked list, reorder, tie, remove |
| My places | Add food, coffee, gym, study and market spots; or describe your own and let Claude find it. Each becomes a "Near ..." chip |
| My week | Set days per week at each campus area and which days run late |
| Must-haves | Hard rules: laundry, pets, furnished, quiet, parking, grocery, late walk, commute, per-place walk limits |
| Your situation | Budget (target to cap), months, and people, each as a range; parking need; data uncertainty |
| Results | #1 share bars, verdict, true cost with range, walking times, why #1 beats #2 |
| Tipping points | Price, priority and rule changes that flip the leader. Click **Apply** to try one, **Undo** to revert |
| Compare | Pin up to three listings for a side-by-side with the best in each row highlighted |
| Assumptions | Change any scoring assumption and watch the ranking respond |

## How the numbers work

1. **Order becomes weights.** Rank-order centroid weights, summing to 100%. Tied chips share a weight.
2. **Scores are 0 to 1 on fixed scales** (cost: 1 near your target, 0 at your cap; commute: 1 at zero, 0 at ten
   hours a week). Fixed scales mean adding a listing never changes another listing's score.
3. **Rank acceptability (SMAA-2).** 5,000 random weight sets that all respect your order. The % is how often a
   listing finishes #1, with a seeded generator so the same input always gives the same output.
4. **True cost.** Rent share + utilities + parking + fees, less sublet recovery on unused months, as a low, mid
   and high range.
5. **Tipping points.** A bisection on rent for price, a neighbor swap for priorities, and a one-rule relaxation
   for near misses. Each says what would have to be true.

## Project layout

```
web/            Next.js 14 + Tailwind + dnd-kit + framer-motion
  app/decide/   The page
  components/   Chips, places, week, compare, assumptions, cards
  lib/engine/   decide(): cost, criteria, filter, SMAA, explanations (pure TypeScript, tested)
  lib/types.ts  Shared contract. Mirror of api/app/schemas.py: change both together
api/            FastAPI: /parse/place, /parse/profile, /parse/listing (forced tool call + Pydantic + checks)
data/seed/      Synthetic listings and personas, assumptions, curated places
docs/           IDENTITY_FEATURES.md: the roadmap and design rules
scripts/        Seed generation
```

## Privacy and data rules

- No demographic fields exist anywhere in the schema, and the API rejects unknown fields.
- Inputs are places and routines the student chooses. Nothing is stored.
- Claude receives text only when the student clicks **Look up** on a custom place (a short description, up to 160
  characters). Everything else stays in the browser.
- Every number carries a label: SYNTHETIC, ESTIMATE, USER or CLAUDE ESTIMATE.

## 5-minute demo script

1. **(0:00) The problem.** Rankings that hide the trade-offs. "Which apartment is best?" depends on what you
   value, and listing sites don't show how fragile their pick is.
2. **(0:30) Meet Maya** (synthetic). Her priorities are loaded as chips. Show the bank of 12 and drag one in.
3. **(1:15) Make it hers.** Add Zingerman's from My places, then type "Panera on State St" and Look up. Claude
   proposes a location, Maya confirms it, and it becomes a chip.
4. **(2:00) Read the result.** Verdict, #1 share bars, true cost ranges, "Why #1 beats #2".
5. **(2:45) Live sensitivity.** Drag "Near Zingerman's" to the top. The leader changes and the strip names it.
   Click **Apply** on a tipping point, then **Undo**.
6. **(3:30) Compare** the top two. Point at the green best-in-row cells and "What would flip it".
7. **(4:15) Honesty.** Open Assumptions, change commute and watch the ranking move. Show the SYNTHETIC and
   ESTIMATE labels and the privacy rules.
8. **(4:45) Close.** The ranking is deterministic and checkable. Claude only reads text at the edges.

## Likely judge questions

- *Why not just ask an LLM to rank?* It can't show how fragile its answer is, and the same prompt can give a
  different order. Here every score is a formula you can change.
- *Is the data real?* No. Listings are synthetic and labeled. The engine takes real listings with the same schema.
- *How do you avoid profiling students?* There are no demographic inputs. Places and routines only, and the API
  rejects unknown fields.
- *What if Claude is wrong about a place?* The student confirms or adjusts it, and it is labeled CLAUDE ESTIMATE.
  Locations outside Ann Arbor or with low confidence are discarded and the student picks a landmark.
- *What's the uncertainty?* The % bars come from 5,000 weightings. Costs are low-to-high ranges, and the
  assumptions drawer shows every estimate.
