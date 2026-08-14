/**
 * Engram token module — typed mirror of the CSS custom properties in
 * `src/app/globals.css`, which are themselves ported from
 * `reference/engram-identity.html`.
 *
 * CSS is the source of truth for rendering; this module is the source of truth
 * for computation (belief → density, belief → tint). Keep them in sync.
 */

/** The ramp. One gradient, no accent. */
export const ramp = {
  bone: "#EFEFEC",
  haze: "#DCE2E0",
  slate: "#8A9A9B",
  moss: "#5A6A6B",
  deep: "#2A3A3D",
  void: "#0B1113",
  ink: "#0E1112",
} as const;

/**
 * THE ACCENT BUDGET, SPENT ONCE.
 * Desaturated clay, luminance-matched to slate/moss. Reserved solely for the
 * at-risk tail (P < RISK_THRESHOLD). Setting `risk` to `ramp.deep` — and
 * `--risk` in globals.css — removes the exception entirely.
 */
export const accent = {
  risk: "#9C8467",
  riskLight: "#C9B7A0",
} as const;

export const hairline = {
  light: "rgba(14,17,18,.10)",
  onDark: "rgba(239,239,236,.14)",
} as const;

/** Their fluid clamp scale, verbatim. */
export const type = {
  sizes: {
    "-2": "0.625rem",
    "-1": "clamp(.72rem,.69rem + .14vw,.8rem)",
    "0": "clamp(.94rem,.9rem + .2vw,1.02rem)",
    "1": "clamp(1.15rem,1.05rem + .5vw,1.45rem)",
    "2": "clamp(1.7rem,1.35rem + 1.6vw,2.5rem)",
    "3": "clamp(3rem,1.6rem + 6.4vw,7.5rem)",
  },
  tracking: {
    display: "-0.05em",
    heading: "-0.035em",
    lead: "-0.02em",
    /** Martian Mono is only ever small and tracked out. */
    readout: "0.16em",
  },
  weight: { body: 400, medium: 500, semibold: 600, mono: 300 },
} as const;

export const layout = {
  pad: "clamp(1.25rem,.6rem + 3.2vw,4.5rem)",
  radius: "24px",
  measureRead: "34rem",
  measureNarrow: "26rem",
  wrap: "1180px",
} as const;

/** Motion durations in ms. `dwell` and `offerDecay` are product rules. */
export const duration = {
  quick: 160,
  calm: 320,
  slow: 620,
  tint: 900,
  /** PRD §5 use case A: a chunk is only scored after the viewport holds on it. */
  dwell: 3000,
  /** PRD §6.5: an offer decays if the reader keeps reading. It never interrupts. */
  offerDecay: 12000,
  count: 1100,
  dim: 480,
  drift: 26000,
} as const;

export const easing = {
  panel: "cubic-bezier(.2,.7,.3,1)",
  bloom: "cubic-bezier(.16,1,.3,1)",
  breath: "cubic-bezier(.45,0,.55,1)",
} as const;

export const zLayer = {
  tint: 1,
  rail: 10,
  drawer: 40,
  nav: 60,
  orb: 65,
  scrim: 70,
  overlay: 80,
  grain: 99,
} as const;

export const elevation = {
  panel: "0 24px 60px -28px rgba(11,17,19,.55)",
  app: "0 30px 70px -40px rgba(11,17,19,.4)",
  nav: "0 8px 30px -12px rgba(14,17,18,.22)",
  overlay: "0 40px 120px -40px rgba(11,17,19,.75)",
} as const;

/** The reader dims to ~30% behind the quiz overlay. */
export const scrim = { readerOpacity: 0.3 } as const;

/**
 * The goo channel: feGaussianBlur stdDeviation at each end of the confidence
 * range. `soft` is what a zero-evidence chunk gets once `CONFIDENCE_FLOOR`
 * (lib/belief.ts) is applied — unresolved but still legible.
 */
export const goo = { soft: 5.2, crisp: 2.0 } as const;
