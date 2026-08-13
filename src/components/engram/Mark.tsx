"use client";

import { useId } from "react";
import {
  DENSITY_ORDER,
  STATES,
  half,
  latticeAt,
  toCircles,
  type DensityName,
  type LatticeNode,
} from "@/lib/lattice";

/**
 * The Engram mark: one gooey node lattice, rendered at a density.
 *
 * `density` takes either a named state or a number in [0,1]. Passing a belief
 * makes the mark report the state of the system — which is the whole idea.
 * `goo` is the feGaussianBlur stdDeviation: low confidence renders soft and
 * unresolved, high confidence crisp.
 */
export function Mark({
  density = "fused",
  size = 56,
  goo = 2.6,
  fill = "var(--ink)",
  className = "",
  nodes: nodesProp,
}: {
  density?: DensityName | number;
  size?: number;
  goo?: number;
  fill?: string;
  className?: string;
  /** Pre-computed 200-box lattice, e.g. an animating one. Overrides `density`. */
  nodes?: LatticeNode[];
}) {
  const uid = useId().replace(/:/g, "");
  const filterId = `goo-${uid}`;

  const base =
    nodesProp ??
    (typeof density === "number" ? latticeAt(density) : STATES[density]);
  const circles = toCircles(half(base));

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id={filterId}>
          <feGaussianBlur in="SourceGraphic" stdDeviation={goo} result="b" />
          <feColorMatrix
            in="b"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12"
          />
        </filter>
      </defs>
      <g filter={`url(#${filterId})`} fill={fill}>
        {circles.map((c) => (
          <circle key={c.key} cx={c.cx} cy={c.cy} r={c.r} />
        ))}
      </g>
    </svg>
  );
}

/**
 * Full-scale mark in the 200-box, for the interactive stage. Takes nodes
 * directly so the caller can animate them frame by frame.
 */
export function MarkStageSvg({
  nodes,
  goo = 5.2,
  fill = "var(--bone)",
  className = "",
}: {
  nodes: LatticeNode[];
  goo?: number;
  fill?: string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const filterId = `goo-stage-${uid}`;
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" className={className} aria-hidden="true">
      <defs>
        <filter id={filterId}>
          <feGaussianBlur in="SourceGraphic" stdDeviation={goo} result="b" />
          <feColorMatrix
            in="b"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12"
          />
        </filter>
      </defs>
      <g filter={`url(#${filterId})`} fill={fill}>
        {toCircles(nodes).map((c) => (
          <circle key={c.key} cx={c.cx} cy={c.cy} r={c.r} />
        ))}
      </g>
    </svg>
  );
}

/** Mark + wordmark lockup. */
export function Wordmark({
  size = 26,
  fill = "var(--ink)",
  className = "",
}: {
  size?: number;
  fill?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark density="dense" size={size} goo={2.2} fill={fill} />
      <span
        style={{
          fontSize: size * 0.82,
          letterSpacing: "-0.045em",
          fontWeight: 500,
          color: fill,
        }}
      >
        Engram
      </span>
    </span>
  );
}

export { DENSITY_ORDER };
