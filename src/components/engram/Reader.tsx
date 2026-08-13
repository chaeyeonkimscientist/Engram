"use client";

import type { ReactNode } from "react";
import { beliefVisual } from "@/lib/belief";
import { formatP } from "@/lib/belief";

/**
 * The reading column. Centre, wide, quiet, nothing decorative. Line length is
 * capped by the `--measure-read` token rather than by a hard-coded width so the
 * measure stays a design decision, not an accident.
 */
export function ReadingColumn({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full font-serif text-read text-[color:var(--text-reading)] ${className}`}
      style={{ maxWidth: "var(--measure-read)" }}
    >
      {children}
    </div>
  );
}

/**
 * The dwell rail: a hairline in the left margin that grows over the dwell gate.
 * A chunk is only scored once the viewport has held on it (PRD §5, use case A).
 * This is three seconds of a hairline growing — deliberately not a progress bar.
 */
export function DwellRail({
  /** 0–1 static fill, or omit and pass `running` to animate the full gate. */
  progress,
  running = false,
  state = "idle",
  className = "",
}: {
  progress?: number;
  running?: boolean;
  state?: "idle" | "counting" | "fired";
  className?: string;
}) {
  const fired = state === "fired";
  const color = fired
    ? "var(--color-cool-400)"
    : "color-mix(in oklab, var(--color-ink-100) 62%, transparent)";

  return (
    <div
      className={`absolute top-0 left-0 h-full w-px overflow-hidden ${className}`}
      style={{ zIndex: "var(--z-rail)" }}
      aria-hidden="true"
    >
      <div className="absolute inset-0" style={{ background: "var(--surface-hairline)" }} />
      <div
        data-dwell-fill
        className="absolute inset-0 origin-top"
        style={{
          background: color,
          boxShadow: fired ? "0 0 8px 0 var(--color-cool-500)" : undefined,
          transform: `scaleY(${fired ? 1 : (progress ?? 0)})`,
          transition: running ? undefined : "transform var(--dur-quick) linear",
          animation: running ? "var(--animate-dwell)" : undefined,
        }}
      />
    </div>
  );
}

/**
 * A chunk of the document. Its wash comes from `beliefVisual()` — the only
 * source of belief colour in the system. The wash is atmosphere: at peak it is
 * under 9% alpha, so body text keeps its contrast.
 */
export function Passage({
  children,
  p,
  confidence = 1,
  current = false,
  dwell,
  dwellRunning = false,
  dwellState = "idle",
  showValue = false,
  className = "",
}: {
  children: ReactNode;
  /** P(encoded) for this chunk. */
  p: number;
  confidence?: number;
  /** The chunk currently held in the viewport. */
  current?: boolean;
  dwell?: number;
  dwellRunning?: boolean;
  dwellState?: "idle" | "counting" | "fired";
  showValue?: boolean;
  className?: string;
}) {
  const v = beliefVisual(p, confidence);

  return (
    <div
      className={`relative ${className}`}
      style={{ paddingLeft: "var(--space-rail-gutter)" }}
      data-band={v.band}
    >
      {current && (
        <DwellRail progress={dwell} running={dwellRunning} state={dwellState} />
      )}

      {/* The wash. Inset slightly so it reads as light on the page, not a block. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-[-0.35rem] right-[-1rem] left-[0.35rem] rounded-sm"
        style={{
          background: v.tint,
          zIndex: "var(--z-tint)",
          transition: "background var(--dur-tint) var(--ease-instrument)",
        }}
      />

      <p className="relative py-2" style={{ zIndex: 2 }}>
        {children}
      </p>

      {showValue && (
        <div className="relative flex items-center gap-2 pb-1" style={{ zIndex: 2 }}>
          <span
            className="micro tnum"
            style={{ color: v.ink, letterSpacing: "0.14em" }}
          >
            P {formatP(v.p)}
          </span>
          <span className="micro text-ink-600">{v.label}</span>
        </div>
      )}
    </div>
  );
}
