import { test } from "node:test";
import assert from "node:assert/strict";
import { categoryFor, normalizeQuery, fromPhoton, fromNominatim, dedupe, searchPlaces } from "../../geocode";

test("category mapping from OSM tags", () => {
  assert.equal(categoryFor("amenity", "fast_food"), "food");
  assert.equal(categoryFor("amenity", "cafe"), "coffee");
  assert.equal(categoryFor("leisure", "fitness_centre"), "gym");
  assert.equal(categoryFor("shop", "supermarket"), "market");
  assert.equal(categoryFor("amenity", "library"), "study");
  assert.equal(categoryFor("tourism", "hotel"), "other");
});

test("query gets city added once", () => {
  assert.equal(normalizeQuery("  Panera   State St "), "Panera State St Ann Arbor");
  assert.equal(normalizeQuery("Zingerman's Ann Arbor"), "Zingerman's Ann Arbor");
});

test("Photon results outside Ann Arbor are dropped", () => {
  const out = fromPhoton({ features: [
    { geometry: { coordinates: [-83.7430, 42.2808] }, properties: { name: "Panera Bread", street: "State St", housenumber: "1", city: "Ann Arbor", osm_key: "amenity", osm_value: "restaurant" } },
    { geometry: { coordinates: [-81.5, 41.5] }, properties: { name: "Panera Bread", city: "Cleveland", osm_key: "amenity", osm_value: "restaurant" } },
    { geometry: { coordinates: [-83.74, 42.28] }, properties: {} },
  ] });
  assert.equal(out.length, 1);
  assert.equal(out[0].category, "food");
  assert.equal(out[0].address, "1 State St, Ann Arbor");
});

test("Nominatim rows map and dedupe", () => {
  const rows = [
    { name: "Literati", lat: "42.2795", lon: "-83.7488", class: "shop", type: "books", address: { house_number: "124", road: "E Washington St" } },
    { name: "Literati", lat: "42.27951", lon: "-83.74881", class: "shop", type: "books" },
    { lat: "x", lon: "y" },
  ];
  const out = dedupe(fromNominatim(rows));
  assert.equal(out.length, 1);
  assert.equal(out[0].address, "124 E Washington St");
});

test("searchPlaces falls back to Nominatim when Photon fails", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    if (String(url).includes("photon")) throw new TypeError("blocked");
    return new Response(JSON.stringify([{ name: "Blue Leaf Cafe", lat: "42.28", lon: "-83.74", class: "amenity", type: "cafe" }]), { status: 200 });
  }) as typeof fetch;
  try {
    const r = await searchPlaces("blue leaf");
    assert.equal(r[0].category, "coffee");
  } finally { globalThis.fetch = real; }
});

test("searchPlaces throws a friendly error when both services are unreachable", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = (async () => { throw new TypeError("offline"); }) as typeof fetch;
  try { await assert.rejects(searchPlaces("x y"), /enter the place by hand/); }
  finally { globalThis.fetch = real; }
});
