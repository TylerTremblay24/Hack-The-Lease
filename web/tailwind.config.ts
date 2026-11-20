import type { Config } from "tailwindcss";

// New Lease design tokens. Every color, font, radius, shadow and duration used in components comes from here
// (backed by CSS variables in app/globals.css). Do not use raw hex values or Tailwind's default palette in components.
const c = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: { wide: "1400px" },
      colors: {
        bg: c("bg"),
        surface: { DEFAULT: c("surface"), 2: c("surface-2") },
        line: { DEFAULT: c("line"), strong: c("line-strong") },
        ink: { DEFAULT: c("ink"), muted: c("ink-muted"), faint: c("ink-faint"), inverse: c("ink-inverse") },
        forest: c("forest"),
        sage: c("sage"),
        mist: c("mist"),
        navy: c("navy"),
        cream: c("cream"),
        leader: c("leader"), // the current #1 / "favors the leader"
        flip: c("flip"), // Michigan maize: anything that would flip the answer
        against: c("against"), // "favors the runner-up" / over the cap / remove
        badge: {
          synth: c("badge-synth"), "synth-ink": c("badge-synth-ink"),
          web: c("badge-web"), "web-ink": c("badge-web-ink"),
          est: c("badge-est-ink"),
          user: c("badge-user"), "user-ink": c("badge-user-ink"),
          osm: c("badge-osm"), "osm-ink": c("badge-osm-ink"),
        },
        mate: { 1: c("mate-1"), 2: c("mate-2"), 3: c("mate-3"), 4: c("mate-4") }, // one color per roommate
        paper: { DEFAULT: c("paper"), ink: c("paper-ink"), muted: c("paper-muted"), line: c("paper-line"), desk: c("paper-desk") }, // print sheet
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        micro: ["10px", { lineHeight: "14px", letterSpacing: "0.06em" }],
        label: ["11px", { lineHeight: "16px", letterSpacing: "0.08em" }],
        display: ["44px", { lineHeight: "1.04", letterSpacing: "-0.035em", fontWeight: "800" }],
        "display-sm": ["30px", { lineHeight: "1.08", letterSpacing: "-0.03em", fontWeight: "800" }],
      },
      borderRadius: { ctl: "8px", card: "16px" },
      boxShadow: {
        e1: "0 1px 0 rgb(255 255 255 / 0.03) inset, 0 1px 2px rgb(0 0 0 / 0.4)",
        e2: "0 1px 0 rgb(255 255 255 / 0.04) inset, 0 16px 40px -16px rgb(0 0 0 / 0.75)",
      },
      transitionDuration: { fast: "150ms", base: "220ms" },
      transitionTimingFunction: { out: "cubic-bezier(.2,.8,.2,1)" },
      width: { nav: "216px", "nav-sm": "72px", rail: "264px", side: "312px", balance: "400px" },
      maxWidth: { page: "1600px" },
    },
  },
  plugins: [],
} satisfies Config;
