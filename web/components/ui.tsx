import type { ReactNode } from "react";

/** Shared building blocks so every screen uses the same tokens. */

/** "Your" for the student, "Sam's" for a roommate. */
export const poss = (name: string) => (name === "You" ? "Your" : `${name}'s`);

export const panel = "rounded-card border border-line bg-surface shadow-e1";
export const label = "font-mono text-label uppercase text-ink-muted";
export const btn =
  "inline-flex items-center justify-center gap-2 rounded-full border border-line-strong px-3.5 py-1.5 text-sm font-semibold text-ink transition-colors duration-fast hover:border-mist hover:bg-surface-2 disabled:opacity-40";
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full border border-sage bg-sage px-3.5 py-1.5 text-sm font-semibold text-cream transition-colors duration-fast hover:bg-sage/80 disabled:opacity-40";
export const btnFlip =
  "inline-flex items-center gap-1.5 rounded-full border border-flip/40 px-3 py-1 text-xs font-semibold text-flip transition-colors duration-fast hover:bg-flip/10";
export const field =
  "w-full rounded-ctl border border-line-strong bg-bg px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-mist focus:outline-none";
export const linkBtn = "text-xs text-ink-muted underline decoration-line-strong underline-offset-2 hover:text-ink";

export type BadgeKind = "synth" | "web" | "est" | "user" | "osm" | "claude";
const BADGE: Record<BadgeKind, string> = {
  synth: "bg-badge-synth text-badge-synth-ink",
  web: "bg-badge-web text-badge-web-ink",
  est: "border border-badge-est/40 text-badge-est",
  user: "bg-badge-user text-badge-user-ink",
  osm: "bg-badge-osm text-badge-osm-ink",
  claude: "bg-badge-web text-badge-web-ink",
};
export function Badge({ kind, children, title, className = "" }: { kind: BadgeKind; children: ReactNode; title?: string; className?: string }) {
  return (
    <span title={title} className={`inline-flex shrink-0 items-center whitespace-nowrap rounded px-1.5 py-px font-mono text-micro font-semibold ${BADGE[kind]} ${className}`}>
      {children}
    </span>
  );
}

export function SectionTitle({ children, right, icon }: { children: ReactNode; right?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h2 className="text-title font-bold text-ink">{children}</h2>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

/** Small line icons (24px grid, stroke = currentColor). */
const PATHS: Record<string, ReactNode> = {
  decide: <path d="M4 6h16M4 12h10M4 18h6" />,
  compare: <><rect x="3" y="5" width="7" height="14" rx="1.5" /><rect x="14" y="5" width="7" height="14" rx="1.5" /></>,
  group: <><circle cx="9" cy="8" r="3.2" /><path d="M3 19c.8-3.2 3.2-5 6-5s5.2 1.8 6 5" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14c2.4 0 4.3 1.4 5 4" /></>,
  summary: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5M10 16h5" /></>,
  tune: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  data: <><ellipse cx="12" cy="6" rx="7" ry="2.6" /><path d="M5 6v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6M5 12v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-6" /></>,
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  bars: <path d="M5 20V12M12 20V5M19 20v-9" />,
  lever: <path d="M4 18h16M12 18V8M7 8h10l-5-4z" />,
  undo: <path d="M9 7L4 12l5 5M4 12h11a5 5 0 010 10h-2" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  week: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  pin: <><path d="M12 21s-6-5.4-6-11a6 6 0 0112 0c0 5.6-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></>,
  rules: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 12l3 3 5-6" /></>,
  money: <path d="M15.5 7.5c-.7-1-2-1.5-3.5-1.5-2 0-3.5 1-3.5 2.6 0 3.6 7.5 2 7.5 5.6 0 1.6-1.6 2.8-3.8 2.8-1.6 0-3-.6-3.8-1.7M12 4v2M12 18v2" />,
  plus: <path d="M12 5v14M5 12h14" />,
  grip: <><circle cx="9" cy="7" r="1" /><circle cx="15" cy="7" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="17" r="1" /><circle cx="15" cy="17" r="1" /></>,
  chevron: <path d="M9 6l6 6-6 6" />,
  out: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />,
};
export type IconName = keyof typeof PATHS;
export function Icon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`shrink-0 ${className}`}>
      {PATHS[name]}
    </svg>
  );
}

/** Provenance legend. Always visible: it protects the Decision Quality score. */
export function Legend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-xs text-ink-faint">
      <span className="flex items-center gap-1.5"><Badge kind="synth">SYNTHETIC</Badge>made-up listings and personas for the demo</span>
      <span className="flex items-center gap-1.5"><Badge kind="web">WEB LISTING</Badge>collected by hand from a public page; rent and amenities as listed, location and travel estimated</span>
      <span className="flex items-center gap-1.5"><Badge kind="est">ESTIMATE</Badge>costs, travel and walking times are modeled ranges</span>
      <span className="flex items-center gap-1.5"><Badge kind="user">USER</Badge>something you entered</span>
      <span className="flex items-center gap-1.5"><Badge kind="osm">OSM</Badge>a place found on OpenStreetMap and confirmed by you</span>
      <span className="flex items-center gap-1.5"><Badge kind="claude">CLAUDE ESTIMATE</Badge>a place location Claude proposed and you confirmed</span>
    </div>
  );
}
