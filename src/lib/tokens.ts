/**
 * Engram token module.
 *
 * Mirrors the CSS custom properties declared in `src/app/globals.css` so that
 * tokens can be consumed in logic (e.g. mapping a belief float to a tint).
 * CSS is the source of truth for rendering; this module is the source of truth
 * for computation. Keep them in sync.
 */

export const warm = {
  100: "#f7dcb2",
  200: "#f0c489",
  300: "#e5a862",
  400: "#d88c3f",
  500: "#c1712b",
  600: "#9d5920",
  700: "#764218",
  800: "#4d2b10",
  900: "#281608",
} as const;

export const cool = {
  100: "#c9ebf4",
  200: "#9bd9ea",
  300: "#68c2dc",
  400: "#3fa7c6",
  500: "#278aa9",
  600: "#1c6b85",
  700: "#145062",
  800: "#0d3541",
  900: "#071c23",
} as const;

export const ink = {
  void: "#050607",
  950: "#060708",
  900: "#08090a",
  850: "#0c0e10",
  800: "#121416",
  700: "#1a1e20",
  600: "#262b2e",
  500: "#3a4145",
  400: "#5b6367",
  300: "#838b8f",
  200: "#aeb5b8",
  100: "#d5dadb",
  50: "#eef1f1",
} as const;

/** RGB triples for the two semantic ramps, for alpha compositing. */
export const rgb = {
  warm300: [229, 168, 98],
  warm400: [216, 140, 63],
  cool300: [104, 194, 220],
  cool400: [63, 167, 198],
  neutral: [131, 139, 143],
} as const;

export const typography = {
  fonts: {
    reading: "var(--font-serif)",
    ui: "var(--font-sans)",
    micro: "var(--font-mono)",
  },
  sizes: {
    micro: "0.5625rem",
    label: "0.6875rem",
    meta: "0.8125rem",
    body: "0.9375rem",
    read: "1.1875rem",
    lede: "1.5rem",
    numeric: "2.25rem",
    numericLg: "3.5rem",
  },
} as const;

export const measure = {
  read: "34rem",
  narrow: "24rem",
  wide: "46rem",
} as const;

export const radius = {
  xs: "2px",
  sm: "3px",
  md: "6px",
  lg: "12px",
  xl: "20px",
  pill: "999px",
} as const;

/** Motion durations in ms. `dwell` and `offerDecay` are product rules, not taste. */
export const duration = {
  instant: 90,
  quick: 160,
  calm: 320,
  slow: 620,
  tint: 900,
  /** PRD §5 use case A: a chunk is only scored after the viewport holds on it. */
  dwell: 3000,
  /** PRD §6.5: the offer decays if the reader keeps reading. Never interrupts. */
  offerDecay: 12000,
  count: 1100,
  dim: 480,
} as const;

export const easing = {
  instrument: "cubic-bezier(0.22, 0.61, 0.36, 1)",
  bloom: "cubic-bezier(0.16, 1, 0.3, 1)",
  breath: "cubic-bezier(0.45, 0, 0.55, 1)",
} as const;

export const zLayer = {
  base: 0,
  tint: 1,
  rail: 10,
  drawer: 40,
  orb: 60,
  scrim: 70,
  overlay: 80,
} as const;

export const glow = {
  warm: "var(--glow-warm)",
  cool: "var(--glow-cool)",
  neutral: "var(--glow-neutral)",
  card: "var(--elev-card)",
  overlay: "var(--elev-overlay)",
} as const;

export type WarmStep = keyof typeof warm;
export type CoolStep = keyof typeof cool;
