// Deterministic randomness. Same inputs -> same numbers, every reload, every demo.
// We use *common random numbers*: draw s for listing X / criterion c is a pure
// function of (seed, s, X, c). So when the student changes a priority, results
// move only because the inputs moved, never because of re-sampling noise.

/** 32-bit string hash (FNV-1a). */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mix integers into one 32-bit state (splitmix-style finalizer). */
function mix(a: number, b: number): number {
  let h = (a ^ Math.imul(b, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Uniform in (0,1) addressed by integer keys. Never returns exactly 0 or 1. */
export function u01(...keys: number[]): number {
  let h = 0x2545f491;
  for (const k of keys) h = mix(h, k >>> 0);
  return (h + 0.5) / 4294967296;
}

/** Triangular(lo, mid, hi) via inverse CDF, driven by a supplied uniform. */
export function triangular(lo: number, mid: number, hi: number, u: number): number {
  if (hi <= lo) return mid;
  const c = (mid - lo) / (hi - lo);
  return u < c
    ? lo + Math.sqrt(u * (hi - lo) * (mid - lo))
    : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mid));
}
