"""Dev A, H0-10: replace the placeholder travel times in data/seed/listings.json with
OSM walking times + GTFS bus times. Output: data/derived/commute.json, then merge.

pip install osmnx networkx pandas
Feeds (download once, commit nothing large):
  - U-M Transit Services GTFS  (Transitland: f-dps2w-universityofmichigantransitservices) -> check feed date range
  - TheRide GTFS               (theride.org/business/software-developers)  attribution required:
    "Transit scheduling, geographic, and real-time data provided by permission of AAATA/TheRide"

Plan (keep it simple; this is cut-line 4 -- decide at H10):
  1. walk: G = osmnx.graph_from_point((42.2808, -83.7430), dist=6000, network_type="walk");
     shortest path length (m) listing->anchor / 80 m/min.
  2. bus: for each listing/anchor pair with walk > 18 min:
       - candidate origin stops within 600 m of listing, destination stops within 600 m of anchor
       - from stop_times on a typical weekday (pick one service_id active on a Tue in the feed range),
         find direct trips o->d departing 8:00-10:00; ride = arr - dep (median)
       - wait = median headway / 2 on that route in the window
       - busMin = walk_to_o + wait + ride + walk_from_d   (one transfer: allow o->Central Campus Transit Center->d)
  3. late: count trips with departures after 23:00 from anchor stops; if none, keep walk-only for lateNight.
  4. spot-check 5 pairs by hand against the published schedule; write the 5 checks in the Assumptions drawer.
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]


def merge(commute_path=ROOT / "data/derived/commute.json"):
    """commute.json shape: {listingId: {anchorId: {"walkMin": int, "busMin": int|null}}}"""
    listings = json.loads((ROOT / "data/seed/listings.json").read_text())
    commute = json.loads(commute_path.read_text())
    for l in listings:
        if l["id"] in commute:
            l["travel"] = commute[l["id"]]
            l["provenance"]["travel"] = "REAL"
    (ROOT / "data/seed/listings.json").write_text(json.dumps(listings, indent=2))


if __name__ == "__main__":
    raise SystemExit("TODO(Dev A): implement steps 1-3, write data/derived/commute.json, then call merge().")
