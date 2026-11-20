#!/usr/bin/env python3
"""Builds data/seed/listings_real.json from listings collected by hand from public web pages on 2026-11-20.

What is REAL: name/address, bedrooms, rent (as listed; ranges use the midpoint), laundry/parking/pets/furnished/utilities
as stated in the listing text, and the source URL.
What is ESTIMATE (and labeled so in each listing's `provenance`): coordinates (block level, from street position),
travel times (straight-line x 1.3 / 80 m per min), grocery walk, noise, square feet when not stated, bathrooms when not
stated, lease length (12 months assumed), one-time fees.
Run `python3 scripts/geocode_listings.py` on a machine with internet to replace the estimated coordinates with
OpenStreetMap geocodes. Then rerun this file's travel step (it reads coords from the JSON if present).
"""
import json, math, re, sys, pathlib

ASOF = "2026-11-20"
Z2 = ("Zumper 2-bedroom search", "https://www.zumper.com/apartments-for-rent/ann-arbor-mi/2-beds")
ZS = ("Zumper studio search", "https://www.zumper.com/apartments-for-rent/ann-arbor-mi/studios")
RC = ("RentCafe 1001 E. University", "https://www.rentcafe.com/apartments/mi/ann-arbor/1001-e-university/default.aspx")
RF = ("Redfin South University 1-bedroom search", "https://www.redfin.com/neighborhood/83579/MI/Ann-Arbor/South-University/1-bedroom-apartments-for-rent")
H2 = ("Homes.com 2-bedroom search", "https://www.homes.com/ann-arbor-mi/homes-for-rent/2-bedroom/p2/")
def UM(slug, n="UM Off-Campus Housing"): return (n, f"https://offcampushousing.umich.edu/city/ann-arbor-mi/listing/{slug}")

# cluster: (lat, lng, neighborhood, noise 1-5)  -- ESTIMATES, block level, about +/-300 m
C = {
 "state_packard": (42.2712, -83.7405, "Packard / Hill", 4),
 "church_state":  (42.2738, -83.7392, "South U", 4),
 "church_tappan": (42.2722, -83.7355, "South U", 4),
 "hill":          (42.2728, -83.7322, "Packard / Hill", 3),
 "forest":        (42.2700, -83.7365, "South U", 3),
 "packard_east":  (42.2693, -83.7345, "Packard / Hill", 3),
 "packard_1300":  (42.2662, -83.7300, "Burns Park", 2),
 "burns":         (42.2655, -83.7255, "Burns Park", 2),
 "geddes":        (42.2748, -83.7268, "Burns Park", 3),
 "south_univ_e":  (42.2715, -83.7310, "South U", 3),
 "state_south":   (42.2690, -83.7395, "Packard / Hill", 4),
 "division_south":(42.2705, -83.7440, "Packard / Hill", 3),
 "main_packard":  (42.2735, -83.7470, "Downtown", 3),
 "main_south":    (42.2700, -83.7488, "Packard / Hill", 3),
 "walnut":        (42.2735, -83.7430, "South U", 4),
 "downtown":      (42.2788, -83.7440, "Downtown", 4),
 "downtown_4th":  (42.2780, -83.7465, "Downtown", 4),
 "ingalls":       (42.2800, -83.7360, "Downtown", 3),
 "thayer":        (42.2800, -83.7390, "Downtown", 3),
 "kerrytown":     (42.2860, -83.7455, "Kerrytown", 2),
 "kerrytown_e":   (42.2868, -83.7415, "Kerrytown", 2),
 "kerrytown_n":   (42.2890, -83.7500, "Kerrytown", 2),
 "ows":           (42.2810, -83.7570, "Old West Side", 2),
 "ows_south":     (42.2730, -83.7565, "Old West Side", 2),
 "ows_far":       (42.2820, -83.7670, "Old West Side", 2),
 "packard_far":   (42.2580, -83.7160, "Burns Park", 2),
}

def kw(text):
    t = text.lower()
    util = []
    if re.search(r"heat|gas", t): util.append("heat")
    if re.search(r"water|sewer", t): util.append("water")
    if "electric" in t and "electricity extra" not in t and "pays electric" not in t: util.append("electric")
    if re.search(r"internet|wi-?fi", t): util.append("internet")
    return util

ROWS = []
def R(name, addr, cl, beds, baths, sqft, rent, laundry, util, parking, pets, furn, src, note="", rent_basis="listed unit rent"):
    ROWS.append(dict(name=name, addr=addr, cl=cl, beds=beds, baths=baths, sqft=sqft, rent=rent, laundry=laundry,
                     util=util, parking=parking, pets=pets, furn=furn, src=src, note=note, rent_basis=rent_basis))
mid = lambda a, b: round((a + b) / 2)
IU, IB, NO, UNK = "in_unit", "in_building", "none", None

# ---- 2-bedroom units (Zumper, 2-bed search, fetched 2026-11-20)
R("910 Packard St 2BR", "910 Packard St, Ann Arbor, MI 48104", "packard_east", 2, 1, None, 1920, IU, [], "yes", True, None, Z2, "Header says $1,290, description says $1,890-1,950; used the description.")
R("109 N Thayer 2BR", "109 N Thayer St, Ann Arbor, MI 48104", "thayer", 2, 1, None, 1650, IB, [], None, None, True, Z2)
R("Ponds at Georgetown 2BR", "2511 Packard St, Ann Arbor, MI 48104", "packard_far", 2, 2, None, mid(1788, 2373), IU, [], None, True, None, Z2, "Rent is the midpoint of the listed range $1,788-$2,373.")
R("807 Lawrence St #2 2BR", "807 Lawrence St #2, Ann Arbor, MI 48104", "kerrytown_e", 2, 1, None, 3100, IU, ["water"], "free2", None, None, Z2, "Laundry stated as in-unit; description mentions shared basement laundry.")
R("923 S 7th St 2BR", "923 S 7th St, Ann Arbor, MI 48103", "ows_south", 2, 1, None, 1695, IU, [], "yes", True, None, Z2)
R("817 Arch St 2BR", "817 Arch St, Ann Arbor, MI 48104", "packard_east", 2, 1, None, mid(1499, 2245), IU, [], None, True, None, Z2, "Midpoint of $1,499-$2,245.")
R("Fritz Lofts 1014 Church St 2BR", "1014 Church St, Ann Arbor, MI 48104", "church_tappan", 2, 1, None, mid(1745, 2195), IU, [], "yes", True, None, Z2, "Midpoint of $1,745-$2,195.")
R("Atrio 1000 W Huron 2BR", "1000 W Huron St, Ann Arbor, MI 48103", "ows", 2, 1, None, mid(1395, 1750), IU, [], "incl", True, None, Z2, "Midpoint of $1,395-$1,750.")
R("727 E Kingsley 2BR", "727 E Kingsley St, Ann Arbor, MI 48104", "kerrytown_e", 2, 1, None, mid(1795, 1950), IU, [], "yes", True, None, Z2)
R("618 Packard 2BR", "618 Packard St, Ann Arbor, MI 48104", "state_packard", 2, 1, None, 1795, IU, [], None, True, None, Z2)
R("Sans Souci 1036 S Main 2BR", "1036 S Main St, Ann Arbor, MI 48104", "main_south", 2, 1, None, mid(1295, 2095), IU, [], "yes", True, None, Z2, "Midpoint of $1,295-$2,095.")
R("825 Tappan 2BR", "825 Tappan Ave, Ann Arbor, MI 48104", "church_tappan", 2, 1, None, 2150, IU, [], None, True, None, Z2)
R("829 Tappan 2BR", "829 Tappan Ave, Ann Arbor, MI 48104", "church_tappan", 2, 1, None, 1400, IB, ["heat", "water"], "assigned", None, None, Z2)
R("418 2nd St 2BR", "418 Second St, Ann Arbor, MI 48103", "ows", 2, 1, None, 1600, IB, ["heat", "water"], "incl", True, None, UM("spacious-2-bedroom-units-in-ann-arbor-s-old-westside-236059"), "UM page; its generic unit table was ignored (identical template on every page).")
R("628 Packard 2BR", "628 Packard St, Ann Arbor, MI 48104", "state_packard", 2, 1, None, 2200, IB, ["heat", "water", "internet"], "buy", None, True, Z2, "Homes.com shows a 'starting at $1,750'; used the Zumper exact rent.")
R("503 Hill St 2BR", "503 Hill St, Ann Arbor, MI 48104", "hill", 2, 1, 767, mid(2550, 2700), IB, ["heat", "water", "internet"], "yes", True, True, Z2, "Midpoint of $2,550-$2,700 across several units.")
R("Varsity 723 W Madison 2BR", "723 W Madison St, Ann Arbor, MI 48103", "ows_south", 2, 1, None, mid(1875, 1975), IB, ["heat", "water", "electric"], "assigned", True, None, Z2)
R("911 S Forest 2BR", "911 S Forest Ave, Ann Arbor, MI 48104", "forest", 2, 1, None, mid(2400, 2450), None, ["heat", "water", "electric"], "assigned", None, None, Z2, "Laundry not stated.")
R("Varsity 917 Packard 2BR", "917 Packard St, Ann Arbor, MI 48104", "packard_east", 2, 1, None, mid(2395, 2450), IB, ["heat", "water", "electric"], "assigned", None, None, Z2)
R("Varsity 515 Walnut 2BR", "515 Walnut St, Ann Arbor, MI 48104", "walnut", 2, 1, None, mid(2425, 2880), IB, ["heat", "water"], "assigned", None, True, Z2, "Midpoint of $2,425-$2,880. UM page lists furnished.")
R("Varsity 101 N Ingalls 2BR", "101 N Ingalls St, Ann Arbor, MI 48104", "ingalls", 2, 1, None, 2650, IB, [], "assigned", None, None, Z2)
R("Varsity 1001 S Forest 2BR", "1001 S Forest Ave, Ann Arbor, MI 48104", "forest", 2, 1, None, mid(2350, 2440), IB, ["heat", "water"], "incl", None, True, Z2)
R("Varsity 541 Elizabeth 2BR", "541 Elizabeth St, Ann Arbor, MI 48104", "kerrytown", 2, 1, None, mid(2450, 2550), None, ["heat", "water", "electric"], None, None, None, Z2, "Laundry and parking not stated.")
R("518 S 4th Ave #518 2BR", "518 S 4th Ave #518, Ann Arbor, MI 48104", "downtown_4th", 2, 1, None, 1650, IU, ["heat", "water", "electric"], "buy2", None, True, Z2)
R("317 E Ann St #1 2BR", "317 E Ann St #1, Ann Arbor, MI 48104", "kerrytown_e", 2, 1, None, 2020, IB, [], None, None, True, Z2)
R("Michigan Terrace 1025 Packard 2BR", "1025 Packard St, Ann Arbor, MI 48104", "packard_east", 2, 1, None, 1675, IU, ["heat", "water"], "assigned", None, None, Z2)
R("Varsity 1506 Geddes 2BR", "1506 Geddes Ave, Ann Arbor, MI 48104", "geddes", 2, 1, None, 2425, IB, ["heat", "water", "electric"], "assigned", None, True, Z2)
R("1039 Baldwin 2BR", "1039 Baldwin Ave, Ann Arbor, MI 48104", "geddes", 2, 1, None, 2150, IB, [], "free", None, None, Z2)
R("Varsity 526 Packard 2BR", "526 Packard St, Ann Arbor, MI 48104", "state_packard", 2, 1, None, mid(1995, 2395), IB, ["heat", "water", "electric"], "assigned", None, None, Z2)
R("Varsity 848 Tappan 2BR", "848 Tappan Ave, Ann Arbor, MI 48104", "church_tappan", 2, 1, None, mid(2435, 2570), IB, ["heat", "water", "electric"], "assigned", None, None, Z2)
R("543 Church 2BR", "543 Church St, Ann Arbor, MI 48104", "church_state", 2, 1, None, mid(2750, 2950), IB, ["heat", "water", "electric"], None, None, True, Z2)
R("Packard Row 2BR", "2111 Packard St, Ann Arbor, MI 48104", "packard_far", 2, 2, None, mid(2581, 2990), None, [], None, None, None, Z2, "New construction; amenities not listed.")
R("Huron Flats 1117 W Huron 2BR", "1117 W Huron St, Ann Arbor, MI 48103", "ows", 2, 1, None, mid(1355, 1775), IU, [], "30", True, False, UM("huron-flats-1117-w.-huron--6601"), "Midpoint of $1,355-$1,775; parking $30/mo.")
R("1310 Packard 2BR", "1310 Packard St, Ann Arbor, MI 48104", "packard_1300", 2, 1, None, 2000, IB, ["heat", "water"], "free", None, None, Z2, "Coin laundry.")
R("Varsity 921 W Huron 2BR", "921 W Huron St, Ann Arbor, MI 48103", "ows", 2, 1, None, 3295, IU, [], "assigned", None, None, Z2)
R("1809 Jackson Ave #2 2BR", "1809 Jackson Ave #2, Ann Arbor, MI 48103", "ows_far", 2, 1, None, 1550, IU, [], None, None, None, Z2)
R("1313 S State 2BR", "1313 S State St, Ann Arbor, MI 48104", "state_south", 2, 1, None, 2100, IB, [], None, None, None, ("Homes.com 1313 S State", "https://www.homes.com/property/1313-s-state-st-ann-arbor-mi/dwtz4stt694bd/"), "Listed as starting at $2,100 for 26/27.")
R("Bradford House 1010 Catherine 2BR", "1010 Catherine St, Ann Arbor, MI 48104", "kerrytown_e", 2, 1, None, 1650, None, [], None, None, None, H2, "Listed as starting at $1,650.")
R("1335 Geddes 2BR", "1335 Geddes Ave, Ann Arbor, MI 48104", "geddes", 2, 1, None, 1595, None, [], None, None, None, H2, "Listed as starting at $1,595.")
R("1336 Geddes 2BR", "1336 Geddes Ave, Ann Arbor, MI 48104", "geddes", 2, 1, None, 2200, None, [], None, None, None, H2)
R("1001 E University 2BR", "1001 E University Ave, Ann Arbor, MI 48104", "church_tappan", 2, 1, None, 2291, IB, ["heat", "water", "internet"], "covered", True, True, RC, "Mean of four listed 2BR units, $2,225-$2,325.")
R("203 Beakes St 2BR", "203 Beakes St, Ann Arbor, MI 48104", "kerrytown_e", 2, 1, None, 1800, IU, ["heat", "water"], "incl", False, None, UM("perfect-charm-in-the-old-4th-ward--237944"), "Lower level of a four-unit house. UM generic unit table ignored.")
R("915 S Division 2BR", "915 S Division St, Ann Arbor, MI 48104", "division_south", 2, 1, 750, mid(2000, 2100), None, ["heat", "water"], "100", None, True, UM("915-919-s-division-st-7220"), "Parking $100/mo.")
# ---- 1-bedroom
R("1001 E University 1BR", "1001 E University Ave, Ann Arbor, MI 48104", "church_tappan", 1, 1, None, 1750, IB, ["heat", "water", "internet"], "covered", True, True, RC)
R("311 1/2 S 5th Ave 1BR", "311 1/2 S 5th Ave, Ann Arbor, MI 48104", "downtown", 1, 1, None, 1800, None, [], None, None, None, UM("311-1-2-s.-5th-107851"))
R("University Towers 1BR", "536 S Forest Ave, Ann Arbor, MI 48104", "forest", 1, 1, 700, 2148, None, [], None, False, None, RF, "Listed 600-800 sq ft, from $2,148; no pets.")
R("1325 S University #1325-1 1BR", "1325 S University Ave, Ann Arbor, MI 48104", "south_univ_e", 1, 1, 373, 1449, None, [], "yes", None, None, RF)
R("1325 S University #1325-4 1BR", "1325 S University Ave, Ann Arbor, MI 48104", "south_univ_e", 1, 1, 315, 1319, None, [], "yes", None, None, RF)
R("1308 Geddes #1308-2 1BR", "1308 Geddes Ave, Ann Arbor, MI 48104", "geddes", 1, 1, 550, 1699, None, [], "yes", None, None, RF)
R("Gallatin Manor 332 E William 1BR", "332 E William St, Ann Arbor, MI 48104", "downtown", 1, 1, None, 1745, None, [], None, None, None, RF)
R("915 S Division 1BR", "915 S Division St, Ann Arbor, MI 48104", "division_south", 1, 1, 600, 1400, None, ["heat", "water"], "100", None, True, UM("915-919-s-division-st-7220"))
# ---- studios (Zumper studio search)
R("Fritz Lofts 1014 Church St Studio", "1014 Church St, Ann Arbor, MI 48104", "church_tappan", 1, 1, None, mid(1305, 1515), IU, [], "yes", True, None, ZS, "Studio. Midpoint of $1,305-$1,515.")
R("618 Packard Studio", "618 Packard St, Ann Arbor, MI 48104", "state_packard", 1, 1, None, mid(1245, 1295), IU, [], None, True, None, ZS, "Studio.")
R("624 Packard Studio", "624 Packard St, Ann Arbor, MI 48104", "state_packard", 1, 1, None, mid(1145, 1275), IU, [], None, True, None, ZS, "Studio. Tenant pays electricity only.")
R("Sans Souci 1036 S Main Studio", "1036 S Main St, Ann Arbor, MI 48104", "main_south", 1, 1, None, 1215, IU, [], "yes", True, None, ZS, "Studio.")
R("825 Tappan Studio", "825 Tappan Ave, Ann Arbor, MI 48104", "church_tappan", 1, 1, None, 1295, IU, [], None, True, None, ZS, "Studio.")
R("602 Monroe St Studio", "602 Monroe St, Ann Arbor, MI 48104", "church_state", 1, 1, 243, 1500, IB, ["heat", "water", "internet"], None, None, True, ZS, "Studio. Three units listed at $1,450-$1,600.")
R("526 S Division Studio", "526 S Division St, Ann Arbor, MI 48104", "division_south", 1, 1, None, 1375, None, ["internet"], "yes", None, True, ZS, "Studio. Units at $1,350-$1,400.")
R("320 S Division Studio", "320 S Division St, Ann Arbor, MI 48104", "downtown", 1, 1, 400, 1350, IB, ["heat", "water", "internet"], "assigned", True, None, ZS, "Studio, 300-500 sq ft, $1,275-$1,425.")
R("Varsity 515 Walnut Studio", "515 Walnut St, Ann Arbor, MI 48104", "walnut", 1, 1, None, 1625, IB, [], "assigned", None, None, ZS, "Studio.")
R("543 Church Studio", "543 Church St, Ann Arbor, MI 48104", "church_state", 1, 1, None, 1625, IB, ["heat", "water", "electric"], None, None, True, ZS, "Studio. $1,600-$1,650.")
R("The Willows 514 S Forest Studio", "514 S Forest Ave, Ann Arbor, MI 48104", "forest", 1, 1, None, mid(1250, 1369), IB, [], "yes", None, True, ZS, "Studio.")
R("Charter House 1335 S University Studio", "1335 S University Ave, Ann Arbor, MI 48104", "south_univ_e", 1, 1, None, 1499, IB, ["heat", "water", "electric", "internet"], None, None, True, ZS, "Studio.")
R("303 E Madison #1 Studio", "303 E Madison St #1, Ann Arbor, MI 48104", "church_state", 1, 1, None, 1500, IB, ["heat", "water"], "yes", None, None, ZS, "Studio.")
R("Exhibit A2 212 S 4th Ave Studio", "212 S Fourth Ave, Ann Arbor, MI 48104", "downtown_4th", 1, 1, 477, 2063, None, [], None, True, None, ZS, "Studio.")
R("413 Washtenaw Studio", "413 Washtenaw Ave, Ann Arbor, MI 48104", "hill", 1, 1, 246, 1400, IB, ["heat", "water", "electric", "internet"], None, None, None, ZS, "Studio, 239-253 sq ft.")
R("226 Packard Studio", "226 Packard St, Ann Arbor, MI 48104", "main_packard", 1, 1, 310, 1325, IB, ["water"], None, True, None, ZS, "Studio, 300-590 sq ft, $1,300-$1,350.")
R("904 S State Studio", "904 S State St, Ann Arbor, MI 48104", "state_south", 1, 1, 300, 1350, IB, ["heat", "water"], "buy", True, True, ZS, "Studio.")
R("630 Packard Studio", "630 Packard St, Ann Arbor, MI 48104", "state_packard", 1, 1, 450, 1350, IB, ["heat", "water"], "buy", True, True, ZS, "Studio, 400-500 sq ft.")
R("1001 E University Studio", "1001 E University Ave, Ann Arbor, MI 48104", "church_tappan", 1, 1, 475, 1550, IB, ["heat", "water", "internet"], "covered", True, True, ZS, "Studio.")
R("323 Packard #14 Studio", "323 Packard St #14, Ann Arbor, MI 48104", "division_south", 1, 1, 600, 1550, IU, ["water"], "yes", True, True, ZS, "Listed as a studio, 600 sq ft.")
R("1025 Arbordale #7 Studio", "1025 Arbordale St #7, Ann Arbor, MI 48103", "ows_far", 1, 1, None, 1100, IU, ["heat", "water", "internet"], "incl", None, None, ZS, "Studio.")
R("507 Church St Studio", "507 Church St, Ann Arbor, MI 48104", "church_state", 1, 1, 364, 1500, IU, ["heat", "water", "internet"], None, None, True, ZS, "Studio. Units at $1,400-$1,700.")
# ---- 3-bedroom
R("915 S Division 3BR", "915 S Division St, Ann Arbor, MI 48104", "division_south", 3, 1, None, mid(2900, 3100), None, ["heat", "water"], "100", None, True, UM("915-919-s-division-st-7220"))
R("1316 Geddes 3BR", "1316 Geddes Ave, Ann Arbor, MI 48104", "geddes", 3, 1, None, 3750, None, [], None, None, None, UM("1316-geddes-ave-115752"), "UM generic unit table ignored.")
R("1404 E Park Place 3BR", "1404 E Park Pl, Ann Arbor, MI 48104", "burns", 3, 1, None, 3645, IU, [], "garage", None, None, ("ApartmentList 1404 East Park Place", "https://www.apartmentlist.com/mi/ann-arbor/spacious-3-bedroom-near-u-m-athletic-campus-with-parking-yard"))
R("537 Elizabeth St Unit 2 3BR", "537 Elizabeth St Unit 2, Ann Arbor, MI 48104", "kerrytown", 3, 1, None, 3249, None, [], None, None, None, ("Homes.com 3-bedroom condos", "https://www.homes.com/ann-arbor-mi/condos-for-rent/3-bedroom/"))
# ---- 4-bedroom
R("432 S 4th Ave 4BR House", "432 S 4th Ave, Ann Arbor, MI 48104", "downtown_4th", 4, 1, 1650, 2700, IB, ["heat", "water", "electric"], "free3", None, True, ("Apartments.com 432 S 4th Ave", "https://www.apartments.com/432-s-4th-ave-all-utilities-included-ann-arbor-mi/32nxlwf"), "$675 per person, $2,700 total. Sq ft listed 1,500-1,800.")
R("915 Woodlawn Ave 4BR House", "915 Woodlawn Ave, Ann Arbor, MI 48104", "state_south", 4, 2, None, 3200, None, [], "yes2", False, True, UM("915-woodlawn-ave-115348"), "Utilities not included.")
R("942 Woodlawn Ave 4BR House", "942 Woodlawn Ave, Ann Arbor, MI 48104", "state_south", 4, 2, None, 4996, None, [], None, None, None, UM("942-woodlawn-ave.-116513"))
R("555 Packard 4BR", "555 Packard St, Ann Arbor, MI 48104", "state_packard", 4, 2, None, 5300, None, ["heat", "water"], "free3", None, True, UM("555-packard-stann-arbor-mi-48104-107839"), "Includes basic furniture.")
R("845 E University 4BR House", "845 E University Ave, Ann Arbor, MI 48104", "hill", 4, 1, None, 6020, None, [], None, None, None, UM("845-east-university-join-the-waitlist-today--111952"))
R("808 Hutchins Ave 4BR House", "808 Hutchins Ave, Ann Arbor, MI 48103", "ows_south", 4, 3, None, 4000, None, [], "yes", True, None, UM("808-hutchins-ave-230451"))
R("210 Brookridge Ct 4BR Townhouse", "210 Brookridge Ct, Ann Arbor, MI 48103", "kerrytown_n", 4, 2, None, 3580, IU, ["water"], "free3", None, None, UM("4-bedroom-townhouse-near-kerrytown-available-for-2026-2027-233244"), "Description also advertises $3,120 for 4 tenants; used the listed $3,580.")

# ---- computed estimates
ANCH = {"central": (42.2768, -83.7382), "north": (42.2915, -83.7176), "kerrytown": (42.2852, -83.7460), "medical": (42.2840, -83.7280), "downtown": (42.2797, -83.7486)}
GROC = [(42.2849, -83.7479), (42.2604, -83.7092), (42.2473, -83.7625)]  # People's Food Co-op, Trader Joe's, Whole Foods (approx.)
def km(a, b):
    R_ = 6371.0; rad = math.pi / 180
    dl, dg = (b[0] - a[0]) * rad, (b[1] - a[1]) * rad
    h = math.sin(dl / 2) ** 2 + math.cos(a[0] * rad) * math.cos(b[0] * rad) * math.sin(dg / 2) ** 2
    return 2 * R_ * math.asin(math.sqrt(h))
walk = lambda a, b: max(1, round(km(a, b) * 1000 * 1.3 / 80))
SQFT = {0: 400, 1: 550, 2: 800, 3: 1100, 4: 1500}
SLUG = lambda s: re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def parking_of(p):
    if p is None: return {"available": False, "monthly": 0}
    if p in ("yes", "assigned", "incl", "free", "free2", "free3", "garage", "covered", "yes2"): return {"available": True, "monthly": 0}
    if p in ("buy", "buy2"): return {"available": True, "monthly": 75}
    return {"available": True, "monthly": int(p)}

def build():
    out, seen = [], set()
    for r in ROWS:
        lat, lng, hood, noise = C[r["cl"]]
        pt = (lat, lng)
        travel = {}
        for k, a in ANCH.items():
            w = walk(pt, a)
            travel[k] = {"walkMin": w, "busMin": (round(8 + w * 0.35) if w >= 22 else None)}
        bd = max(1, r["beds"])
        lid = "web-" + SLUG(r["name"])
        if lid in seen: raise SystemExit("dup " + lid)
        seen.add(lid)
        prov = {"name": "REAL", "rentTotalMonthly": "REAL", "bedrooms": "REAL", "coords": "ESTIMATE", "travel": "ESTIMATE",
                "groceryWalkMin": "ESTIMATE", "noiseLevel": "ESTIMATE", "leaseMonths": "ESTIMATE", "neighborhood": "ESTIMATE"}
        prov["sqft"] = "REAL" if r["sqft"] else "ESTIMATE"
        prov["bathrooms"] = "REAL" if r["baths"] and r["note"] is not None else "ESTIMATE"
        prov["laundry"] = "REAL" if r["laundry"] else "ESTIMATE"
        prov["parking"] = "REAL" if r["parking"] else "ESTIMATE"
        prov["petFriendly"] = "REAL" if r["pets"] is not None else "ESTIMATE"
        prov["furnished"] = "REAL" if r["furn"] is not None else "ESTIMATE"
        prov["utilitiesIncluded"] = "REAL" if r["util"] else "ESTIMATE"
        prov["fees"] = "ESTIMATE"
        out.append({
            "id": lid, "name": r["name"], "neighborhood": hood,
            "coords": {"lat": lat, "lng": lng}, "bedrooms": bd, "bathrooms": r["baths"] or 1,
            "sqft": r["sqft"] or SQFT[r["beds"]], "rentTotalMonthly": r["rent"], "leaseMonths": 12,
            "laundry": r["laundry"] or "in_building", "utilitiesIncluded": r["util"], "heatType": "gas",
            "parking": parking_of(r["parking"]), "fees": {"oneTimeTotal": 100},
            "furnished": bool(r["furn"]), "petFriendly": bool(r["pets"]), "noiseLevel": noise,
            "groceryWalkMin": min(35, max(3, min(walk(pt, g) for g in GROC))),
            "travel": travel, "provenance": prov,
            "source": {"name": r["src"][0], "url": r["src"][1], "asOf": ASOF, "address": r["addr"], "note": (r["note"] + " " if r["note"] else "") + f"Rent: {r['rent_basis']}."},
        })
    return out

if __name__ == "__main__":
    data = build()
    p = pathlib.Path(__file__).resolve().parent.parent / "data" / "seed" / "listings_real.json"
    p.write_text(json.dumps(data, indent=1) + "\n")
    print(len(data), "listings ->", p)
