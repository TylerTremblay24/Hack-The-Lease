"use client";
import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/** A number that counts to its new value (tabular figures, so nothing jiggles). Respects reduced motion. */
export function Count({ value, format = (n) => String(Math.round(n)), className = "" }: { value: number; format?: (n: number) => string; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduce) { setShown(value); from.current = value; return; }
    const c = animate(from.current, value, { duration: 0.5, ease: [0.2, 0.8, 0.2, 1], onUpdate: (v) => { from.current = v; setShown(v); } });
    return () => c.stop();
  }, [value, reduce]);
  return <span className={`num ${className}`}>{format(shown)}</span>;
}
