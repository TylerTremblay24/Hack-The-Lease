# New Lease: demo script

Five minutes of live demo, five minutes of judge Q&A. One person drives, one narrates, one owns Q&A. Rehearse
twice on the projector laptop. Every number below was checked against the app on 2026-11-20.

This replaces the demo section of `Tipping-Point-Presentation-Kit.pdf`, which describes the old three-column
layout. The product is now **New Lease**; **tipping points** is the name of its signature feature.

## Roles

| Role | Job | During Q&A |
|------|-----|-----------|
| Narrator | Tells Maya's story and says the lines below | Product and student-value questions |
| Driver | Clicks and drags on the projector laptop; never talks over the narrator | Points to the screen when a judge asks "show me" |
| Q&A lead | Holds the timer, signals at 4:00 | Engine, data and limitations questions |

## Set up before you start

1. Start the app with `start-demo.cmd prod` (or `npm run build` then `npm start`) at least 5 minutes early and
   load http://localhost:3000/decide once.
2. Profile (bottom of the left nav) is **Maya**. Roommates off, nothing pinned.
3. Click **Data** at the bottom of the left nav and choose **Demo 14**. The page opens on All, so do this first
   or the numbers below won't match.
4. Click **Undo** (under the balance) until it disappears, or reload and repeat step 3, so the line under the
   balance reads "Drag a chip, tick a rule or pull a lever, and watch it tip".
5. Close the chip bank if it is open, and collapse every Your situation dropdown.

## Where things are

- **Top of the page:** the verdict pill, the #1 listing, and the balance ("How the decision leans"). The line
  under the balance names the last change, with **Undo**.
- **Your priorities:** the chip row. **Add chips** (right) opens the chip bank; the maize **Build a smart
  chip** strip opens it with the smart chip builder ready to type in.
- **Your situation (left):** dropdowns for My week, Must-haves, Budget and stay, Roommates, Assumptions.
- **Center:** "Why this fits you" (details in a dropdown), then the ranked listings.
- **Right:** "Why these results?" and **Tipping points** (more levers in a dropdown).
- **Left nav:** Compare (drawer), Roommates, Summary (one-page sheet), Assumptions; profile and Data at the bottom.

## 5-minute script

| Time | Driver does | Narrator says | Screen shows |
|------|-------------|---------------|--------------|
| 0:00-0:30 | Nothing; app is on screen | "Maya is a junior with labs on North Campus Tuesday and Thursday who studies at the UgLi until 1 AM. She can do $1,200 a month, $1,400 max. On Zillow, a dozen 2-bedrooms look the same. The question isn't which apartment is best, it's which is best for her life, and how sure we are." | Plymouth Rd Garden 2BR, **Robust pick**, balance leaning left |
| 0:30-1:10 | Point at the chip row, then at **My week** under Your situation (its summary reads "Central 4d (late) · North 3d") | "She doesn't type weights. She ranks what matters: cost, then laundry, commute, the late walk home, quiet and space tied. The percent on each chip is the weight her order implies. Her week drives commute minutes. Nothing demographic is asked." | Chips with 41%, 24%, 16%...; My week summary |
| 1:10-1:50 | Point at the top, then scroll to "Why this fits you" | "Plymouth Rd Garden 2BR is a robust pick: it wins in 70% of 5,000 weight sets that respect her order. The balance shows how hard it leans. The story card puts her own words next to the real numbers, and names the trade-off: the late walk home." | "Robust pick", 70%, story card |
| 1:50-2:40 | Scroll back up. Drag the **Laundry** chip onto **True monthly cost** | "Watch what happens if laundry matters more than price." Pause. "It tips. The balance swings to Broadway, 56 to 44; it's a toss-up. The line under the balance says exactly what moved. That's decision sensitivity." | Balance swings right; pill turns maize **Toss-up**; "Moved Laundry to #1" under the balance |
| 2:40-3:00 | Click **Undo** under the balance; point at the first **PRICE LEVER** on the right | "Back to robust. And here's a lever: Broadway overtakes if its rent drops just $20 a person. That's a negotiation, not a setting." | "−$20/mo" lever |
| 3:00-3:30 | Click **Build a smart chip**, then **Food**, then **Zingerman's Deli**. Then **Undo** | "Here's what no listing site can do. Maya eats at Zingerman's. One click and that place is a priority, scored by the walk from every apartment. She ranked it last, worth 2%, and Plymouth drops from robust to a toss-up at 53%. Any place she types works the same way: her gym, her job." | "Near Zingerman's Deli · 07 · SMART" chip; **Toss-up**, 53% |
| 3:30-4:00 | Click **Roommates** in the left nav, then **Plan with roommates**, then **Roommate 2**, then **Protect the least happy** | "Most students don't decide alone. Her roommate ranks quiet and laundry first, with their own color everywhere. Both still favor Plymouth, but their own top picks only match in 45% of draws. 'Protect the least happy' scores each place by whoever likes it least, and tipping points name who would have to give." | Group view: "Partly aligned: everyone's own #1 matches in 45% of draws", colored score bars |
| 4:00-4:20 | Click **Just me** (in the Roommates dropdown), then **Data** at the bottom of the nav, then **Web 84** | "These were synthetic, labeled so. Here are 84 real Ann Arbor listings we collected today. Each links to its source; anything we estimated, like location and travel time, is labeled. The answer changes: 518 S 4th Ave leads, at 57%." | WEB LISTING badges with source links; **Leaning**, 57% |
| 4:20-4:40 | Click **Summary** in the left nav | "She can take a one-page summary to her roommates or parents: the pick, why, what would change it, and every source." | Summary sheet |
| 4:40-5:00 | Close the sheet | "New Lease: rank what matters, see how sure you can be, and know exactly what would tip the answer. The engine is plain, explainable code, with no paid AI and no personal data." | Results |

**If the drag misbehaves at 1:50:** click **Apply** on the **PRIORITY LEVER** (always shown, second in the list) ("If Laundry mattered more than
True monthly cost, Broadway 2BR would be #1"). It makes the same swap but keeps Quiet and Space tied, so the
screen shows **54% to 46%** instead of 56% to 44%. Keyboard also works: Tab to the Laundry chip, Space, Left
arrow, Space.

## Likely judge questions

| Question | Answer (30 seconds or less) |
|----------|-----------------------------|
| Why ranking instead of sliders? | People can reliably say "cost beats laundry", not "cost is 0.37". SMAA-2 samples every weight set consistent with the order, so no answer depends on numbers the student never gave. |
| What does "70%" mean? | Share of 5,000 random weight sets (each respecting her order, with cost and bus-time uncertainty) in which that listing ranks first. Error is about ±1 point, shown next to the verdict. |
| What does the balance show? | The #1 share of the top two listings. It tilts toward the one that wins more often and swings across when the leader changes. |
| Is it the same every time? | Yes. Seeded random numbers: same inputs, same output. A reordering changes results only because the inputs changed. |
| Where does the data come from? | 84 web listings collected 2026-11-20 from Zumper, UM Off-Campus Housing, RentCafe, Redfin, Homes.com, Apartments.com and ApartmentList, each linked. 14 demo listings and both personas are synthetic and labeled. |
| How accurate are travel times? | Estimates: straight-line distance × 1.3 at 80 m a minute, with a bus estimate. Locations are block-level, about 300 m. Labeled ESTIMATE. |
| What is "true cost"? | Rent share + utility ranges + parking + one-time fees spread over the months she lives there − sublet credit for unused months. A range, with the chance it exceeds her cap. |
| Where is the AI? | Optional, at the edges only: Claude can parse a free-text place description. The default lookup is free OpenStreetMap. Rankings never come from a language model. |
| How do you handle roommates fairly? | Two rules: average happiness, or protect the least happy roommate. The tightest budget sets the group cap, and tipping points name the roommate who would have to change. |
| Why doesn't adding a listing change the others? | Scores use fixed anchors (cost is 1 at 85% of target and 0 at the cap), not min/max of the list, so there is no rank reversal. We test this. |
| How do you know it works? | 46 engine tests (weights, determinism, Pareto dominance, no rank reversal, every tipping point flips the pick when applied, group properties) plus 12 API tests and browser checks. |
| What about privacy? | No account, no demographics. Everything stays in the browser except a place search sent to OpenStreetMap when the student clicks Look up. |
| Biggest limitation? | Listings are a one-day snapshot with estimated locations and travel times, and roommates share one schedule. Next: geocode every address, real bus routing from AATA data, a schedule per roommate. |
| Why not just filters? | Filters silently drop near misses. We show them as tipping points: "relax this one rule and this becomes your #1." |

## Pre-demo checklist

- Latest `claude/decide-page` (or `main`, once merged) pulled on the projector laptop.
- App started with `start-demo.cmd prod` at least 5 minutes early; /decide loaded once.
- Browser full screen, zoom 100%, other tabs and notifications closed, laptop plugged in, sleep disabled.
- Data on **Demo 14**, profile **Maya**, roommates off, no pins, no smart chips, nothing under the balance.
- Projector resolution checked: at 1280 px wide the nav collapses to icons and all three columns still fit.
  If the projector is smaller, zoom the browser to 90%.
- Backup PDF of the summary saved on the desktop; backup screenshots of each demo step in a folder.
- Second laptop with the app running, in case the first fails.
- No internet needed: fonts and images are bundled. Skip the live place lookup unless Wi-Fi is confirmed.
- Timer set for 5:00; Q&A lead signals at 4:00.

## If something goes wrong

| Problem | Do this |
|---------|---------|
| Page will not load | Switch to the second laptop; or close the window and run `start-demo.cmd prod` again |
| Drag does not drop | Use **Apply** on the PRIORITY LEVER (54% to 46%) |
| Numbers differ from the script | Check Data is **Demo 14** and the profile is **Maya**; reload the page to reset |
| Out of time | Skip the Web step, then the roommates step; go straight to the closing line |
| Smart chip lookup is offline | Use a local favorite (Food, Zingerman's Deli). It needs no internet |
| Something breaks within 30 minutes of the demo | Run `git checkout pre-ui` for the previous UI (only if the `pre-ui` tag was created) |
| Total failure | Walk through the backup screenshots and the summary PDF, and say so honestly |
