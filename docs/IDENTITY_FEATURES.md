# Tipping Point: features that reflect the whole student

Rent, bedrooms and commute describe an apartment. They do not describe the person who has to live in it. This
roadmap adds features so the ranking reflects how a student actually lives: where they eat, how they get around,
when they sleep, who they live with, and what they would never give up.

## Design rules (do not break these)

1. **Places and routines, never demographics.** Every input is something a student chooses (a restaurant, a gym,
   a schedule). We never ask for, infer, or store age, gender, race, religion, nationality, health, disability,
   income source or family background. Needs are phrased as needs ("ground floor", "quiet at night").
2. **The student's order drives everything.** New inputs become chips in the same bank, with the same ranking,
   uncertainty and tipping points. Nothing is hidden inside a score.
3. **Local by default.** Chosen places and routines stay in the browser. The one exception is a custom place the
   student asks Claude to look up: only that short description (160 characters) is sent, only when they click
   "Look up", and nothing is stored.
4. **Every number is checkable.** Each feature says its formula, its anchors and its data provenance (REAL,
   ESTIMATE, SYNTHETIC, USER).

## Feature list

Status: DONE, NEXT (build this round), PLANNED.

| # | Feature | What the student does | How it changes the result | Status |
|---|---------|----------------------|---------------------------|--------|
| 1 | Priority chip bank, 12 base criteria, ties | Drags chips into a ranked list | ROC weights and SMAA rank acceptability | DONE |
| 2 | Must-have rules | Ticks hard rules | Listings that fail are out; near misses become tipping points | DONE |
| 3 | Range inputs (budget, months, people) | Drags two thumbs | Keeps every listing that fits anywhere in the range | DONE |
| 4 | **My places** | Picks restaurants, cafes, gym, study spots they actually use, or describes their own and Claude proposes the name, type and location for them to confirm | Each place becomes a chip "Near [place]" scored by walking time, plus an optional "within N min" must-have | DONE |
| 5 | Weekly rhythm ("My week") | Sets days per week at each campus area and which days run late | Drives commute and late-walk scores | DONE |
| 6 | Getting-around style | Chooses walk, bike, bus, car, in any mix | Changes which travel time counts and adds a bike-friendliness chip | PLANNED |
| 7 | Home habits | Cooks at home, hosts friends, studies at home, night owl or early bird | Adds chips for kitchen and grocery access, space for hosting, quiet hours; maps to noise tolerance | PLANNED |
| 8 | Needs, not identities | Ticks access needs such as ground floor, elevator, step-free entry | Hard rules with the same near-miss tipping points | PLANNED |
| 9 | Roommates | Each roommate ranks chips on their own; the group is merged | SMAA with several decision makers; shows where the group agrees and the exact point where they split | PLANNED |
| 10 | Your story card | Sees "why this fits you" with the student's own words quoted | Pulls verbatim evidence from the free-text parse (Claude parses at the edges only) | PLANNED |
| 11 | Compare | Pins up to three listings | Side-by-side values with the best in each row highlighted, what each is strongest on, and what would flip it | DONE |
| 11b | Click-to-apply tipping points | Clicks Apply on "raise your cap", "swap these priorities" or "drop this rule" | The page applies the change, the change strip shows what moved, and Undo reverts it | DONE |
| 11c | Export a one-page summary | Saves the compare view | Printable summary with sources | PLANNED |
| 12 | Paste a listing or lease | Pastes text, reviews extracted fields | Claude extracts, the student confirms, fees and utilities flow into true cost | PLANNED |

## My places (feature 4) in detail

- **Input.** The student searches a curated list of Ann Arbor places grouped by food, coffee, gym and rec, study
  spots, and markets, and adds the ones that matter to them. No account or address is needed.
- **Score.** Walking minutes from the listing to the place, straight-line distance times 1.3 for street layout,
  at 80 meters per minute. Value is 1 at 3 minutes or less, falling linearly to 0 at 25 minutes or more.
  Fixed anchors, so adding or removing a listing never changes another listing's score.
- **Chip.** Each place appears in the bank as "Near [place]" under "My places". It ranks, ties and gets weights
  like any other chip.
- **Must-have.** Each place can also carry a rule "within N min walk". A listing that misses by a small amount
  shows up as a rule tipping point.
- **Provenance.** Place coordinates are approximate and listing coordinates are synthetic, so walking times are
  labeled ESTIMATE in the UI. Real geocoding and routing are a later step.
- **Custom places.** The student types something like "Panera on State St". The API asks Claude, with a forced tool call
  and a strict schema, for the name, type and approximate location. Locations outside Ann Arbor or with low
  confidence are discarded and the student picks the nearest landmark instead. The student always confirms before it
  becomes a chip, and it is labeled CLAUDE ESTIMATE. If the API is down, the built-in places or manual entry still work.
- **Privacy.** Built-in places stay in the browser. For a custom place only the short description is sent, when the
  student clicks "Look up". Nothing is stored.

## Demo story this enables

A student adds the two places they live around (for example a favorite late-night food spot and the cafe where
they study), ranks "Near my cafe" above "Laundry", and watches the leader change. The tipping-point panel then
says exactly how much closer or cheaper a rival would need to be.
