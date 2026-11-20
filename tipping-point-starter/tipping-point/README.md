# Tipping Point — Hack the Lease starter

Robust apartment-fit explorer: student priorities (order only) -> SMAA-2 rank acceptability,
why-#1 breakdown, tipping points. Claude parses text; ranking is deterministic TypeScript.

## What's here (working + tested)
- `web/lib/types.ts` — shared contract (frozen at Hour 3; mirror in `api/app/schemas.py`)
- `web/lib/engine/` — `decide(profile, listings, assumptions, opts)`; ~40 ms for 5,000 draws
- `web/lib/engine/__tests__/` — 11 tests + `run-demo.ts` (prints the demo scenarios)
- `data/seed/` — 14 SYNTHETIC listings, 2 SYNTHETIC personas, assumptions (ESTIMATE ranges)
- `api/` — FastAPI: `/parse/{profile|listing}` (Claude forced tool call + Pydantic + verbatim-quote check
  + cached fallback), `/listings`, `/assumptions`
- `scripts/make_seed.py` (regenerates listings), `scripts/build_commute.py` (Dev A TODO)

## Run
```bash
npm i && npx tsx --test web/lib/engine/__tests__/engine.test.ts   # engine tests
npx tsx web/lib/engine/__tests__/run-demo.ts                      # demo numbers
cd api && pip install -r requirements.txt && python -m pytest -q
export ANTHROPIC_API_KEY=... && uvicorn app.main:app --reload --port 8000
```
Next.js app: `npx create-next-app@latest web --ts --tailwind --app` into `web/` (keep `web/lib`),
then `npm i @dnd-kit/core @dnd-kit/sortable framer-motion`. Import seed JSON directly until the API is wired.
Set `ANTHROPIC_MODEL` to change the parsing model.
