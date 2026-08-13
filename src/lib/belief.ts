/**
 * belief.ts — the single source of visual truth.
 *
 * Every surface carrying P(encoded) derives its treatment from `beliefVisual()`:
 * passage tint, retention mark in the library, belief inspector, quiz delta.
 * Nothing else may invent a treatment for belief.
 *
 * DENSITY IS THE BELIEF. The identity's own idea — one mark at four densities,
 * "isolated points fuse as memories consolidate" — is already an exact metaphor
 * for P(encoded), so it is the primary channel. In priority order:
 *
 *   1. Lattice density (primary). P=0 renders sparse, P=1 renders fused, and
 *      everything between is interpolated continuously.
 *   2. Position on the ramp (secondary). Under-encoded passages sit deeper and
 *      hazier; encoded passages sit clean on bone. This obeys the identity's
 *      "one gradient, no accent" rule exactly.
 *   3. The clay exception (tertiary). Exactly one hue outside the ramp, held
 *      behind `--risk`, reserved solely for the at-risk tail (P < 0.4). See
 *      DESIGN.md, "The accent budget".
 *
 * Uncertainty is cheap and separate: confidence drives the goo blur. The PRD
 * treats the consumer EEG as a low-SNR prior that degrades continuously toward
 * behavioural evidence (§4, §7.1), so a belief the system barely holds renders
 * soft and unresolved; a well-evidenced one renders crisp.
 */

import { densityName, latticeAt, type DensityName, type LatticeNode } from "./lattice";

export type BeliefBand = "at-risk" | "weak" | "forming" | "holding" | "encoded";

export interface BeliefVisual {
  p: number;
  confidence: number;
  band: BeliefBand;
  /** Lowercase readout copy, e.g. "under-encoded". */
  label: string;
  /** Nearest named density, for machine readouts. */
  density: DensityName;
  /** The interpolated lattice for this belief. */
  nodes: LatticeNode[];
  /** Goo blur: low confidence reads soft, high confidence crisp. */
  goo: number;
  /** Passage wash. Ramp-only above the risk threshold; clay below it. */
  tint: string;
  /** Resolved alpha of `tint`, exposed for the showcase readout. */
  tintAlpha: number;
  /** Line/rail colour for this belief. */
  stroke: string;
  /** Ink for numerics sitting on bone. */
  ink: string;
  /** True below the risk threshold — the only place clay is permitted. */
  atRisk: boolean;
  /** 0–1, for arcs, rails and bars. */
  fill: number;
}

const clamp01 = (n: number): number => (Number.isNaN(n) ? 0 : n < 0 ? 0 : n > 1 ? 1 : n);
const round = (n: number): number => Math.round(n * 1000) / 1000;

/** Below this, a chunk is at risk and may spend the accent budget. */
export const RISK_THRESHOLD = 0.4;

/** Ramp channels, as RGB triples for alpha compositing. */
const SLATE = [138, 154, 155] as const;
const CLAY = [156, 132, 103] as const;

const rgba = (c: readonly [number, number, number], a: number) =>
  `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${round(a)})`;

export function beliefBand(p: number): BeliefBand {
  const v = clamp01(p);
  if (v < 0.25) return "at-risk";
  if (v < RISK_THRESHOLD) return "weak";
  if (v < 0.6) return "forming";
  if (v < 0.8) return "holding";
  return "encoded";
}

const BAND_LABEL: Record<BeliefBand, string> = {
  "at-risk": "at risk",
  weak: "under-encoded",
  forming: "forming",
  holding: "holding",
  encoded: "encoded",
};

/**
 * The one mapping. Pure; safe to call during render.
 *
 * @param p          P(encoded) in [0,1]. Clamped.
 * @param confidence Evidence strength in [0,1]. Defaults to 1.
 */
export function beliefVisual(p: number, confidence = 1): BeliefVisual {
  const belief = clamp01(p);
  const conf = clamp01(confidence);
  const atRisk = belief < RISK_THRESHOLD;

  // Confidence softens every treatment toward "not yet claimed".
  const confWeight = 0.45 + 0.55 * conf;

  // The wash deepens as belief drops. Encoded chunks get nothing — clean bone.
  // Peak alpha stays low: this is atmosphere, not highlighting.
  const distance = 1 - belief;
  const tintAlpha = atRisk
    ? round((0.07 + 0.09 * ((RISK_THRESHOLD - belief) / RISK_THRESHOLD)) * confWeight)
    : round(0.115 * Math.max(0, (distance - 0.2) / 0.8) * confWeight);

  const channel = atRisk ? CLAY : SLATE;

  return {
    p: belief,
    confidence: conf,
    band: beliefBand(belief),
    label: BAND_LABEL[beliefBand(belief)],
    density: densityName(belief),
    nodes: latticeAt(belief),
    // 2.0 crisp → 6.2 unresolved. Their marks use 5.2 / 2.6.
    goo: round(6.2 - 4.2 * conf),
    tint: rgba(channel, tintAlpha),
    tintAlpha,
    stroke: atRisk ? "var(--risk)" : "var(--deep)",
    ink: atRisk ? "var(--risk)" : "var(--ink)",
    atRisk,
    fill: belief,
  };
}

/** Formats a belief as the two-decimal figure used everywhere on screen. */
export const formatP = (p: number): string => clamp01(p).toFixed(2);

/** Formats a signed contribution, e.g. "+0.12" / "−0.07". */
export const formatDelta = (d: number): string =>
  `${d >= 0 ? "+" : "\u2212"}${Math.abs(d).toFixed(2)}`;
