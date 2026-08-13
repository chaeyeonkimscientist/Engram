/**
 * belief.ts — the single source of visual truth.
 *
 * Every surface that carries P(encoded) derives its treatment from
 * `beliefVisual()`: passage tint, retention circle, drawer strip, quiz delta,
 * dwell rail. Nothing else is allowed to invent a colour for belief. That is
 * what keeps the tinting legible: a wash at the same warmth always means the
 * same thing everywhere in the product.
 *
 * Axis 1 — belief `p` in [0,1]: warm below 0.5 (under-encoded, at risk),
 * cool above 0.5 (encoded, retained), and near-neutral at 0.5.
 *
 * Axis 2 — `confidence` in [0,1]: how much evidence stands behind `p`. The PRD
 * treats the consumer EEG as a low-SNR prior (§4, §7.1) and degrades
 * continuously toward behavioural evidence. So a belief the system barely
 * holds must not look like one it is sure of: low confidence desaturates the
 * wash, softens the glow, and switches strokes to dashed. Certainty is
 * rendered as crispness, not as a different hue.
 */

import { rgb } from "./tokens";

export type BeliefBand = "at-risk" | "weak" | "forming" | "holding" | "encoded";
export type BeliefHue = "warm" | "cool" | "neutral";

export interface BeliefVisual {
  /** Clamped belief. */
  p: number;
  /** Clamped confidence. */
  confidence: number;
  band: BeliefBand;
  /** Uppercase micro-label copy for the band. */
  label: string;
  hue: BeliefHue;
  /** Distance from indifference, 0 at p=0.5 → 1 at the extremes. */
  magnitude: number;
  /** Passage background wash. Deliberately near-invisible: atmosphere, not highlight. */
  tint: string;
  /** Resolved alpha of `tint`, exposed for tests and for the showcase readout. */
  tintAlpha: number;
  /** Saturated line/edge colour: rails, rings, strokes. */
  stroke: string;
  /** Text colour for numerics and labels sitting on a dark surface. */
  ink: string;
  /** Solid representative swatch for legends and chips. */
  swatch: string;
  /** Volumetric glow, suppressed when confidence is low. */
  glow: string;
  /** Dashed strokes signal a belief the system does not yet stand behind. */
  dashed: boolean;
  /** 0–1 fill fraction for arcs and rails. */
  fill: number;
}

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : Number.isNaN(n) ? 0 : n);

const rgba = (channel: readonly [number, number, number] | number[], alpha: number): string =>
  `rgba(${channel[0]}, ${channel[1]}, ${channel[2]}, ${round(alpha)})`;

const round = (n: number): number => Math.round(n * 1000) / 1000;

/** Peak alpha of the passage wash. Tuned to sit just above perceptual threshold. */
const TINT_ALPHA_WARM = 0.085;
const TINT_ALPHA_COOL = 0.06;

export function beliefBand(p: number): BeliefBand {
  const v = clamp01(p);
  if (v < 0.25) return "at-risk";
  if (v < 0.45) return "weak";
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
 * @param p          P(encoded) in [0,1]. Values outside are clamped.
 * @param confidence Evidence strength in [0,1]. Defaults to 1 (fully evidenced).
 */
export function beliefVisual(p: number, confidence = 1): BeliefVisual {
  const belief = clamp01(p);
  const conf = clamp01(confidence);

  const signed = belief - 0.5;
  const magnitude = Math.min(1, Math.abs(signed) * 2);

  // Below ~12% off-centre we refuse to claim a direction: the wash goes neutral.
  const hue: BeliefHue = magnitude < 0.12 ? "neutral" : signed < 0 ? "warm" : "cool";

  // Low confidence pulls every treatment toward the neutral, quiet end.
  const confWeight = 0.4 + 0.6 * conf;

  const channel =
    hue === "warm" ? rgb.warm300 : hue === "cool" ? rgb.cool300 : rgb.neutral;
  const strokeChannel =
    hue === "warm" ? rgb.warm400 : hue === "cool" ? rgb.cool400 : rgb.neutral;

  const peak = hue === "warm" ? TINT_ALPHA_WARM : TINT_ALPHA_COOL;
  const tintAlpha = round(
    hue === "neutral" ? 0.02 * confWeight : peak * (0.35 + 0.65 * magnitude) * confWeight,
  );

  const strokeAlpha = round(0.3 + 0.6 * magnitude * confWeight);
  const inkAlpha = round(0.55 + 0.45 * confWeight);
  const glowAlpha = round(0.34 * magnitude * conf);

  return {
    p: belief,
    confidence: conf,
    band: beliefBand(belief),
    label: BAND_LABEL[beliefBand(belief)],
    hue,
    magnitude: round(magnitude),
    tint: rgba(channel, tintAlpha),
    tintAlpha,
    stroke: rgba(strokeChannel, strokeAlpha),
    ink: rgba(hue === "neutral" ? rgb.neutral : channel, inkAlpha),
    swatch: rgba(channel, round(0.25 + 0.75 * magnitude * confWeight)),
    glow: conf < 0.35 ? "none" : `0 0 24px -4px ${rgba(strokeChannel, glowAlpha)}`,
    dashed: conf < 0.55,
    fill: belief,
  };
}

/**
 * Radial dot-cluster geometry for the retention circle, in the idiom of the
 * "generative pattern" reference: a dense core with a sparser corona. High
 * belief reads as a tight, cool, settled cluster; low belief as a scattered
 * warm one. Returned in a unit box centred on (0.5, 0.5).
 */
export interface ClusterDot {
  x: number;
  y: number;
  r: number;
  /** Per-dot opacity; the corona fades out first as belief drops. */
  opacity: number;
}

export function beliefCluster(p: number, confidence = 1, rings = 2): ClusterDot[] {
  const belief = clamp01(p);
  const conf = clamp01(confidence);
  const dots: ClusterDot[] = [];

  dots.push({ x: 0.5, y: 0.5, r: 0.14 + 0.05 * belief, opacity: 0.5 + 0.5 * conf });

  for (let ring = 1; ring <= rings; ring += 1) {
    const count = ring === 1 ? 8 : 8;
    const radius = 0.18 + ring * 0.14;
    // Cohesion: well-encoded chunks pull their corona inward.
    const pull = 1 - 0.12 * belief;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + (ring % 2 ? 0 : Math.PI / count);
      const size = (ring === 1 ? 0.075 : 0.04) * (0.6 + 0.4 * belief);
      const reach = ring / rings;
      dots.push({
        x: 0.5 + Math.cos(angle) * radius * pull,
        y: 0.5 + Math.sin(angle) * radius * pull,
        r: size,
        opacity: round(Math.max(0.08, (0.35 + 0.65 * belief) * (1 - 0.35 * reach) * conf)),
      });
    }
  }

  return dots;
}

/** Formats a belief as the two-decimal figure used everywhere on screen. */
export const formatP = (p: number): string => clamp01(p).toFixed(2);

/** Formats a signed contribution, e.g. "+0.12" / "-0.07". */
export const formatDelta = (d: number): string =>
  `${d >= 0 ? "+" : "\u2212"}${Math.abs(d).toFixed(2)}`;
