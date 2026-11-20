#!/usr/bin/env python3
"""Optional: replace the ESTIMATED block-level coordinates in data/seed/listings_real.json with OpenStreetMap geocodes.

Run on a machine with internet access (the build sandbox blocks these hosts):
    python3 scripts/geocode_listings.py
Uses Nominatim at 1 request per second with a descriptive User-Agent, per its usage policy. Results outside the Ann Arbor
box are ignored. Travel and grocery estimates are recomputed from the new coordinates and coords provenance becomes REAL
(source: OpenStreetMap geocoder). Re-run safely; addresses that fail keep their estimate.
"""
import json, math, pathlib, re, sys, time, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
F = ROOT / "data" / "seed" / "listings_real.json"
sys.path.insert(0, str(ROOT / "scripts"))
from build_real_listings import ANCH, GROC, walk  # noqa: E402

BOX = (42.22, 42.33, -83.82, -83.65)  # south, north, west, east
UA = "TippingPoint-hackathon/0.1 (student project; contact via repo)"

def geocode(addr):
    clean = re.sub(r"\s*(#|Unit|Apt)\s*\S+", "", addr)
    clean = clean.replace("1/2", "")
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({"q": clean, "format": "jsonv2", "limit": 1, "countrycodes": "us"})
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=15) as r:
        rows = json.load(r)
    if not rows: return None
    lat, lng = float(rows[0]["lat"]), float(rows[0]["lon"])
    return (lat, lng) if BOX[0] <= lat <= BOX[1] and BOX[2] <= lng <= BOX[3] else None

def main():
    data = json.loads(F.read_text())
    done = 0
    cache = {}
    for l in data:
        addr = l["source"]["address"]
        if addr not in cache:
            try: cache[addr] = geocode(addr)
            except Exception as e: print("fail", addr, e); cache[addr] = None
            time.sleep(1.1)
        pt = cache[addr]
        if not pt: continue
        l["coords"] = {"lat": round(pt[0], 5), "lng": round(pt[1], 5)}
        for k, a in ANCH.items():
            w = walk(pt, a)
            l["travel"][k] = {"walkMin": w, "busMin": (round(8 + w * 0.35) if w >= 22 else None)}
        l["groceryWalkMin"] = min(35, max(3, min(walk(pt, g) for g in GROC)))
        l["provenance"]["coords"] = "REAL"
        l["provenance"]["travel"] = "ESTIMATE"
        done += 1
    F.write_text(json.dumps(data, indent=1) + "\n")
    print(f"geocoded {done} of {len(data)} listings")

if __name__ == "__main__":
    main()
