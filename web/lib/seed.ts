// Seed data (SYNTHETIC listings/personas, ESTIMATE assumptions). Replace with API fetches later.
import listings from "../../data/seed/listings.json";
import assumptions from "../../data/seed/assumptions.json";
import profiles from "../../data/seed/profiles.json";
import type { Assumptions, Listing, StudentProfile } from "./types";

export const LISTINGS = listings as unknown as Listing[];
export const ASSUMPTIONS = assumptions as unknown as Assumptions;
export const PERSONAS = profiles as unknown as StudentProfile[];
