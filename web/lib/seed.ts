// Seed data (SYNTHETIC listings/personas, ESTIMATE assumptions). Replace with API fetches later.
import listings from "../../data/seed/listings.json";
import realListings from "../../data/seed/listings_real.json";
import assumptions from "../../data/seed/assumptions.json";
import profiles from "../../data/seed/profiles.json";
import places from "../../data/seed/places.json";
import type { Assumptions, Listing, StudentProfile, UserPlace } from "./types";

export const DEMO_LISTINGS = listings as unknown as Listing[]; // SYNTHETIC, tuned for the demo personas
export const WEB_LISTINGS = realListings as unknown as Listing[]; // collected from public web pages, see data/seed/listings_real.json
export const LISTINGS = [...DEMO_LISTINGS, ...WEB_LISTINGS];
export type Bank = "all" | "web" | "demo";
export const bankListings = (b: Bank) => (b === "demo" ? DEMO_LISTINGS : b === "web" ? WEB_LISTINGS : LISTINGS);
export const ASSUMPTIONS = assumptions as unknown as Assumptions;
export const PERSONAS = profiles as unknown as StudentProfile[];
export const PLACES = places as unknown as UserPlace[]; // approximate coordinates (ESTIMATE)
