"use client";
import { useEffect, useMemo, useRef } from "react";
import { decide, diffResults } from "./engine";
import type { Assumptions, DecisionResult, Listing, StudentProfile } from "./types";

/** decide() memoized on its inputs, plus the previously *shown* result so the UI can say what changed. */
export function useDecision(profile: StudentProfile, listings: Listing[], a: Assumptions, dataUncertainty: boolean) {
  const result = useMemo(
    () => decide(profile, listings, a, { dataUncertainty }),
    [profile, listings, a, dataUncertainty],
  );
  const shown = useRef<DecisionResult | null>(null);
  const prev = shown.current && shown.current !== result ? shown.current : null;
  useEffect(() => { shown.current = result; }, [result]);
  const diff = useMemo(() => (prev ? diffResults(prev, result) : []), [prev, result]);
  return { result, prev, diff };
}
