"use client";
import { motion } from "framer-motion";
import { Count } from "./Count";

/** Share-of-#1 ring. The arc and the number both animate to new values. */
export function Ring({ value, size = 84, stroke = 7, tone = "leader", label }: { value: number; size?: number; stroke?: number; tone?: "leader" | "sage" | "muted"; label?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const color = tone === "leader" ? "stroke-leader" : tone === "sage" ? "stroke-sage" : "stroke-line-strong";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(value * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" className="stroke-line" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" strokeLinecap="round" className={color}
          strokeDasharray={c} initial={false} animate={{ strokeDashoffset: c * (1 - Math.max(0.0001, value)) }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono font-semibold" style={{ fontSize: size * 0.26 }}>
        <Count value={value * 100} />
        <span className="text-[0.5em] text-ink-muted">%</span>
      </span>
    </div>
  );
}
