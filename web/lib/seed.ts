// Seed data (SYNTHETIC listings/personas, ESTIMATE assumptions). Replace with API fetches later.
import listings from "../../data/seed/listings.json";
import assumptions from "../../data/seed/assumptions.json";
import profiles from "../../data/seed/profiles.json";
import places from "../../data/seed/places.json";
import type { Assumptions, Listing, StudentProfile, UserPlace } from "./types";

export const LISTINGS = listings as unknown as Listing[];
export const ASSUMPTIONS = assumptions as unknown as Assumptions;
export const PERSONAS = profiles as unknown as StudentProfile[];
export const PLACES = places as unknown as UserPlace[]; // approximate coordinates (ESTIMATE)
