/**
 * lattice.ts — the mark, ported from reference/engram-identity.html.
 *
 * One node lattice. Four densities. Isolated points fuse as memories
 * consolidate, so the identity reports the state of the system.
 *
 * In the product this is not decoration: `latticeAt(p)` interpolates
 * continuously between the four parameter sets, so a chunk's P(encoded) *is*
 * its density. See lib/belief.ts.
 */

export interface LatticeNode {
  x: number;
  y: number;
  r: number;
}

/** Their seven-parameter lattice, unchanged. Drawn in a 200-unit box. */
export function lattice(
  cr: number,
  oR: number,
  oRad: number,
  dR: number,
  dRad: number,
  eR: number,
  eRad: number,
): LatticeNode[] {
  const n: LatticeNode[] = [{ x: 100, y: 100, r: cr }];
  for (let i = 0; i < 4; i += 1) {
    const a = (i * Math.PI) / 2;
    n.push({ x: 100 + Math.cos(a) * oR, y: 100 + Math.sin(a) * oR, r: oRad });
  }
  for (let i = 0; i < 4; i += 1) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    n.push({ x: 100 + Math.cos(a) * dR, y: 100 + Math.sin(a) * dR, r: dRad });
  }
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4;
    n.push({ x: 100 + Math.cos(a) * eR, y: 100 + Math.sin(a) * eR, r: eRad });
  }
  return n;
}

export type DensityName = "sparse" | "linked" | "dense" | "fused";

/** [cr, oR, oRad, dR, dRad, eR, eRad] */
export type LatticeParams = readonly [number, number, number, number, number, number, number];

export const DENSITY_PARAMS: Record<DensityName, LatticeParams> = {
  sparse: [9, 46, 7.5, 50, 6.5, 82, 5],
  linked: [14, 38, 10.5, 43, 8.5, 74, 6.5],
  dense: [20, 32, 13.5, 38, 11, 66, 8.5],
  fused: [29, 26, 17, 32, 14, 56, 11],
};

export const DENSITY_ORDER: DensityName[] = ["sparse", "linked", "dense", "fused"];

export const STATES: Record<DensityName, LatticeNode[]> = {
  sparse: lattice(...DENSITY_PARAMS.sparse),
  linked: lattice(...DENSITY_PARAMS.linked),
  dense: lattice(...DENSITY_PARAMS.dense),
  fused: lattice(...DENSITY_PARAMS.fused),
};

const clamp01 = (n: number) => (Number.isNaN(n) ? 0 : n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Interpolate the lattice parameters at `t` in [0,1] across sparse → fused.
 * Continuous, not stepped: a belief of 0.63 has its own density.
 */
export function latticeParamsAt(t: number): LatticeParams {
  const v = clamp01(t);
  const span = DENSITY_ORDER.length - 1;
  const scaled = v * span;
  const i = Math.min(span - 1, Math.floor(scaled));
  const f = scaled - i;
  const a = DENSITY_PARAMS[DENSITY_ORDER[i]];
  const b = DENSITY_PARAMS[DENSITY_ORDER[i + 1]];
  return a.map((av, k) => av + (b[k] - av) * f) as unknown as LatticeParams;
}

/** The lattice at an arbitrary density. */
export function latticeAt(t: number): LatticeNode[] {
  return lattice(...latticeParamsAt(t));
}

/** Nearest named density, for machine readouts. */
export function densityName(t: number): DensityName {
  const v = clamp01(t);
  if (v < 0.2) return "sparse";
  if (v < 0.5) return "linked";
  if (v < 0.8) return "dense";
  return "fused";
}

/** Scale a 200-box lattice into a 100-box, as their static marks do. */
export const half = (nodes: LatticeNode[]): LatticeNode[] =>
  nodes.map((n) => ({ x: n.x / 2, y: n.y / 2, r: n.r / 2 }));

/** SVG path-free painter: circles only, matching their `paint()`. */
export const toCircles = (nodes: LatticeNode[]) =>
  nodes.map((n, i) => ({ key: i, cx: +n.x.toFixed(2), cy: +n.y.toFixed(2), r: +n.r.toFixed(2) }));
