"use client";
import { useEffect, useMemo, useRef } from "react";
import { decide, diffResults } from "./engine";
import { decideGroup, type GroupExtras, type GroupRule, type Member } from "./engine/group";
import type { Assumptions, DecisionResult, Listing, StudentProfile } from "./types";

/** decide() memoized on its inputs, plus the previously *shown* result so the UI can say what changed. */
export interface GroupInput { members: Member[]; rule: GroupRule }
export function useDecision(profile: StudentProfile, listings: Listing[], a: Assumptions, dataUncertainty: boolean, group?: GroupInput) {
  const { result, extra } = useMemo((): { result: DecisionResult; extra: GroupExtras | null } => {
    if (group) return decideGroup(profile, group.members, listings, a, group.rule, { dataUncertainty });
    return { result: decide(profile, listings, a, { dataUncertainty }), extra: null };
  }, [profile, listings, a, dataUncertainty, group]);
  const shown = useRef<DecisionResult | null>(null);
  const prev = shown.current && shown.current !== result ? shown.current : null;
  useEffect(() => { shown.current = result; }, [result]);
  const diff = useMemo(() => (prev ? diffResults(prev, result) : []), [prev, result]);
  return { result, prev, diff, extra };
}
