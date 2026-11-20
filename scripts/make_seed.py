"""Generate data/seed/listings.json — 14 SYNTHETIC listings in real Ann Arbor neighborhoods.

Walking minutes = haversine distance x 1.25 detour factor / 80 m per min (ESTIMATE).
Bus minutes are a placeholder ESTIMATE until scripts/build_commute.py replaces them
with times computed from the U-M Transit + TheRide GTFS feeds.
Names, rents, sizes, amenities and noise levels are invented (SYNTHETIC).
"""
import json, math, pathlib

ANCHORS = {  # approximate public landmarks
    "central": (42.2766, -83.7382),   # Diag / Shapiro (UgLi)
    "north": (42.2913, -83.7175),     # Pierpont Commons
    "kerrytown": (42.2846, -83.7460), # Kerrytown market area
    "medical": (42.2836, -83.7286),   # Michigan Medicine main campus
    "downtown": (42.2808, -83.7487),  # Main St
}

def walk_min(a, b):
    R = 6371000
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp, dl = p2 - p1, math.radians(b[1] - a[1])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    d = 2 * R * math.asin(math.sqrt(h))
    return d * 1.25 / 80, d

TRANSFER_TO_NORTH = {"Kerrytown", "Old West Side", "Downtown", "Burns Park", "Packard / Hill"}

def bus_min(walk, dist_m, hood, anchor):
    if walk < 18:
        return None  # walking wins; bus not modeled
    ride = dist_m / 1000 * 3.2  # ~19 km/h incl. stops
    transfer = 8 if (anchor == "north" and hood in TRANSFER_TO_NORTH) else 0
    return round(4 + 5 + ride + transfer + 3)  # walk to stop + avg wait + ride + transfer + walk from stop

L = [
  # id, name, hood, lat, lng, br, ba, sqft, rent, lease, laundry, utils_incl, heat, park(avail, $), fees, furn, pets, noise, grocery
  ("kt-loft-2br", "Detroit St Loft 2BR", "Kerrytown", 42.2851, -83.7455, 2, 1, 950, 2700, 12, "in_unit", ["water"], "gas", (True, 75), 150, False, True, 2, 4),
  ("kt-carriage-1br", "Fourth Ave Carriage House 1BR", "Kerrytown", 42.2862, -83.7472, 1, 1, 600, 1495, 12, "in_building", ["water", "heat"], "gas", (False, 0), 100, False, False, 2, 5),
  ("su-studio", "South U Tower Studio", "South U", 42.2747, -83.7345, 1, 1, 420, 1425, 12, "in_building", ["water", "heat", "internet"], "gas", (True, 140), 250, True, False, 5, 9),
  ("su-tower-2br", "South U Tower 2BR", "South U", 42.2743, -83.7352, 2, 2, 900, 3150, 12, "in_unit", ["water", "internet"], "electric", (True, 125), 400, True, False, 4, 9),
  ("su-house-4br", "Church St House 4BR", "South U", 42.2735, -83.7330, 4, 2, 1500, 4600, 12, "in_building", ["water"], "gas", (True, 0), 200, False, True, 4, 10),
  ("su-academic-2br", "Willard St 2BR (8-mo lease)", "South U", 42.2752, -83.7362, 2, 1, 820, 2950, 8, "in_unit", ["water", "internet"], "gas", (False, 0), 300, True, False, 4, 9),
  ("ows-1br", "Spring St 1BR", "Old West Side", 42.2771, -83.7585, 1, 1, 650, 1350, 12, "in_unit", ["water"], "gas", (True, 0), 75, False, True, 1, 12),
  ("ows-duplex-2br", "Crest Ave Duplex 2BR", "Old West Side", 42.2764, -83.7612, 2, 1, 1000, 2300, 12, "in_building", ["water"], "gas", (True, 0), 100, False, True, 1, 10),
  ("nc-plymouth-2br", "Plymouth Rd Garden 2BR", "North Campus", 42.2988, -83.7128, 2, 1, 950, 2050, 12, "in_unit", ["water"], "gas", (True, 0), 150, False, True, 2, 7),
  ("nc-hubbard-1br", "Hubbard Rd 1BR", "North Campus", 42.2957, -83.7105, 1, 1, 600, 1250, 12, "in_building", ["water", "heat"], "gas", (True, 0), 100, False, False, 1, 12),
  ("bp-2br", "Wells St 2BR", "Burns Park", 42.2668, -83.7292, 2, 1, 1000, 2400, 12, "in_building", ["water"], "gas", (True, 0), 100, False, True, 1, 14),
  ("dt-main-1br", "Main St Flat 1BR", "Downtown", 42.2797, -83.7483, 1, 1, 650, 1750, 12, "in_unit", ["water"], "electric", (True, 150), 200, False, False, 3, 8),
  ("lt-2br", "Broadway 2BR", "Lower Town", 42.2905, -83.7422, 2, 1, 900, 2150, 12, "in_unit", ["water"], "gas", (True, 0), 150, False, True, 2, 8),
  ("hill-3br", "Hill St 3BR", "Packard / Hill", 42.2722, -83.7418, 3, 1, 1200, 3300, 12, "in_building", ["water"], "gas", (True, 0), 150, False, False, 3, 9),
]

out = []
for (lid, name, hood, lat, lng, br, ba, sqft, rent, lease, laundry, utils, heat, park, fees, furn, pets, noise, groc) in L:
    travel = {}
    for a, pt in ANCHORS.items():
        w, d = walk_min((lat, lng), pt)
        travel[a] = {"walkMin": round(w), "busMin": bus_min(w, d, hood, a)}
    out.append({
        "id": lid, "name": name, "neighborhood": hood,
        "coords": {"lat": lat, "lng": lng},
        "bedrooms": br, "bathrooms": ba, "sqft": sqft,
        "rentTotalMonthly": rent, "leaseMonths": lease, "laundry": laundry,
        "utilitiesIncluded": utils, "heatType": heat,
        "parking": {"available": park[0], "monthly": park[1]},
        "fees": {"oneTimeTotal": fees}, "furnished": furn, "petFriendly": pets,
        "noiseLevel": noise, "groceryWalkMin": groc, "travel": travel,
        "provenance": {
            "name": "SYNTHETIC", "rentTotalMonthly": "SYNTHETIC", "sqft": "SYNTHETIC",
            "laundry": "SYNTHETIC", "noiseLevel": "SYNTHETIC", "groceryWalkMin": "SYNTHETIC",
            "neighborhood": "REAL", "travel": "ESTIMATE",
        },
    })

root = pathlib.Path(__file__).resolve().parents[1]
(root / "data/seed/listings.json").write_text(json.dumps(out, indent=2))
print(f"wrote {len(out)} listings")
for o in out:
    print(o["id"], {k: (v["walkMin"], v["busMin"]) for k, v in o["travel"].items()})
