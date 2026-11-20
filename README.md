# New Lease

**Find a place that fits you. Rank Ann Arbor apartments by your own priorities, see how sure the answer is,
and see exactly what would tip it.**
Built for the 24-hour "Hack the Lease" hackathon (Nov 19-20, 2026).

A student drags priority chips into order. A deterministic engine ranks the listings, reports how often each
one finishes #1 across every weighting that respects that order, explains why #1 beats #2, and lists
**tipping points**: the rent drop, priority swap, or relaxed rule that would change the winner. Claude only
reads short text at the edges (a place description). It never ranks anything.

> The 14 demo listings and both personas are **synthetic**. The 84 web listings were collected by hand from
> public listing pages on 2026-11-20; rent and amenities are as listed, while locations, travel and walking
> times are **estimates** with ranges. The app never asks for or infers demographics.

## Run it on Windows (Command Prompt)

You need **Git** and **Node.js 18 or newer** (from nodejs.org). Check with `node -v` and `git --version`.

**Easiest:** open the repo folder in File Explorer and double-click `start-demo.cmd`. It installs dependencies
the first time, starts the app, and opens http://localhost:3000/decide in your browser. Keep the black
window open while you use the app; close it (or press Ctrl+C) to stop.

**By hand**, in Command Prompt (`Win + R`, type `cmd`, Enter):

```bat
cd /d "C:\path\to\Hack-The-Lease"
git fetch origin
git checkout claude/decide-page
git pull
npm run setup
npm run dev
```

Then open http://localhost:3000/decide. The first load compiles the page and can take 10 to 30 seconds
(longer from a OneDrive folder). If PowerShell blocks `npm`, use Command Prompt instead.

**For the demo**, run the faster production build instead of `npm run dev`:

```bat
start-demo.cmd prod
```

(or `npm run build` then `npm start`). Fonts and images are bundled, so the app needs no internet; only the
optional "Look up" for custom places goes online.

### macOS / Linux

```bash
npm run setup          # installs web dependencies (from the repo root)
npm run dev            # starts the app at http://localhost:3000/decide
```

### Optional: the Claude lookup service for custom places

The app works without it (custom places use free OpenStreetMap by default).

```bat
cd api
pip install -r requirements.txt
set ANTHROPIC_API_KEY=sk-ant-...
uvicorn app.main:app --reload --port 8000
```

Then start the web app with `set NEXT_PUBLIC_USE_CLAUDE_LOOKUP=1` in the same window. Set `NEXT_PUBLIC_API_URL`
if the API is not at `http://localhost:8000`, and `ANTHROPIC_MODEL` to change the model.

## Tests

```bash
npm run test:engine                      # 46 engine tests
npm run demo:numbers                     # prints the demo scenarios
cd api && python -m pytest -q tests      # API tests (Claude is stubbed, no key needed)
```

## Finding your way around /decide

| Where | What it is |
|-------|------------|
| Top of the page | The answer: verdict (Robust pick, Leaning, Toss-up), the #1 listing, and a balance that tilts toward whichever listing wins more often. The line under the balance says what your last change moved, with **Undo** |
| Your priorities | Your ranked chips. Drag to reorder; each chip shows its rank and the weight your order gives it. **Add chips** opens the chip bank |
| Build a smart chip | The strip under your chips (or the left half of the chip bank). Name any place you go, or pick a local favorite, and it becomes a **Near …** chip scored by the walk from every apartment. It joins your ranking at the end; drag it up if it matters more |
| Your situation | One-line summaries that open as dropdowns: **My week** (days per campus area, LATE days), **Must-haves** (rules and limits, including walk limits for smart chips), **Budget and stay**, **Roommates**, **Assumptions** |
| Center | "Why this fits you": how the pick does on your top three priorities and the trade-off, with your own words and the numbers in a dropdown. Then the ranked listings: the leader large with its #1-share ring, the rest compact. "N didn't make it, and why" lists every filtered listing |
| Right | **Why these results?** (verdict ring, why #1 beats #2, and the implied weights in a dropdown) and **Tipping points** as levers with **Apply** (more levers and "How these numbers are calculated" open as dropdowns) |
| Left nav | Decide, **Compare** (slide-over drawer for up to 3 pinned listings), Roommates, **Summary** (printable one page), Assumptions. Bottom: the **profile** (demo persona) and **Data** (listing bank: All, Web, Demo) |

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
start-demo.cmd  Windows one-click start (add "prod" for the production build)
web/            Next.js 14 + Tailwind + dnd-kit + framer-motion
  app/decide/   The page
  app/fonts/    Self-hosted Plus Jakarta Sans and JetBrains Mono (SIL Open Font License)
  components/   DecisionHero (balance), PriorityChips + ChipBuilder (smart chips), ListingCard, WhyPanel,
                TippingPoints, StoryCard, CompareView (drawer), Disclosure (dropdowns),
                shell/ (SideNav, InputRail accordion), ui.tsx (shared tokens and badges)
  lib/engine/   decide(): cost, criteria, filter, SMAA, explanations (pure TypeScript, tested)
  lib/types.ts  Shared contract. Mirror of api/app/schemas.py: change both together
  tailwind.config.ts + app/globals.css   Design tokens (see below)
api/            FastAPI: /parse/place, /parse/profile, /parse/listing (forced tool call + Pydantic + checks)
data/seed/      Synthetic and web listings, personas, assumptions, curated places
docs/           New-Lease-Technical-Documentation.pdf, New-Lease-User-Guide.pdf,
                New-Lease-Presentation.pptx, DEMO_SCRIPT.md, IDENTITY_FEATURES.md (roadmap)
References/     Brand boards and UI references used for the overhaul
```

## Design system

All colors, type, radii, shadows and motion come from tokens in `web/tailwind.config.ts`, backed by CSS
variables in `web/app/globals.css`. Components use token classes only (no raw hex values).

- **Color:** Forest, Sage, Mist, Navy, Cream and Slate from the New Lease brand board. `leader` (green) marks
  the current #1; `flip` (Michigan maize) marks anything that would flip the answer; `against` (coral) favors
  the runner-up. Each provenance badge has its own pair. Text contrast is at least 4.5:1.
- **Type:** Plus Jakarta Sans for text, JetBrains Mono for labels and every number (tabular figures, so
  values don't jiggle while they count).
- **Motion:** 150 to 250 ms state changes, springs for the balance and reordering, numbers that count to
  their new value. `prefers-reduced-motion` turns it off.

## Privacy and data rules

- No demographic fields exist anywhere in the schema, and the API rejects unknown fields.
- Inputs are places and routines the student chooses. Nothing is stored.
- Only the short text typed into the smart chip builder leaves the browser, and only when the student clicks
  **Look up** (to OpenStreetMap by default, or Claude if enabled). Everything else stays in the browser.
- Every number carries a label: SYNTHETIC, WEB LISTING, ESTIMATE, USER, OSM or CLAUDE ESTIMATE.

## 5-minute demo script

Full version with timings, roles and fallbacks: [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

1. **(0:00) The problem.** Maya (synthetic) can do $1,200 a month, $1,400 max. The question isn't which
   apartment is best, it's which is best for her life, and how sure we are.
2. **(0:30) Her priorities** are the chip row: cost, laundry, commute, late walk home, quiet and space tied.
   The % on each chip is the weight her order implies. Her week is under Your situation, My week.
3. **(1:10) Read the answer** at the top: Plymouth Rd Garden 2BR, **Robust pick**, wins 70%. The balance leans
   toward it. Scroll to "Why this fits you": her own words next to the real numbers, and the trade-off.
4. **(1:50) The tipping point.** Drag **Laundry** onto **True monthly cost**. The balance swings to Broadway
   (56% vs 44%), the pill turns to **Toss-up**, and the line under the balance says what moved.
5. **(2:40) Undo** (under the balance), then point at the first **PRICE LEVER**: Broadway overtakes if its rent
   drops $20 a person.
6. **(3:00) Smart chip.** **Build a smart chip**, **Food**, **Zingerman's Deli**. One place she actually goes,
   ranked last at 2%, and Plymouth drops from Robust 70% to a **Toss-up at 53%**. **Undo**.
7. **(3:30) Roommates** in the left nav, **Plan with roommates**, then **Protect the least happy**.
8. **(4:00) Just me**, then **Data** at the bottom of the nav, **Web 84**: real listings with source links. 518 S
   4th Ave leads at 57%.
9. **(4:20) Summary** in the nav: the one-page summary to share. **(4:40)** Close on the decision.

## Likely judge questions

- *Why not just ask an LLM to rank?* It can't show how fragile its answer is, and the same prompt can give a
  different order. Here every score is a formula you can change.
- *Is the data real?* The 84 web listings are real listings collected from public pages, each linked; their
  locations and travel times are estimates. The 14 demo listings and the personas are synthetic and labeled.
- *How do you avoid profiling students?* There are no demographic inputs. Places and routines only, and the API
  rejects unknown fields.
- *What if a place lookup is wrong?* The student confirms or adjusts it, and it is labeled OSM or CLAUDE
  ESTIMATE. Locations outside Ann Arbor are discarded and the student picks a landmark.
- *What's the uncertainty?* The % comes from 5,000 weightings (±1 point, shown on screen). Costs are
  low-to-high ranges, and the Assumptions tab shows every estimate.
