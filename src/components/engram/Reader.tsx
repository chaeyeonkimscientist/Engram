"use client";

import type { ReactNode } from "react";
import { beliefVisual, formatP } from "@/lib/belief";
import { Cap } from "./Cap";

/**
 * The reading column. Centre, wide, quiet, nothing decorative. Bone, because
 * long-form reading on near-black is fatiguing and the wash reads better here.
 * Line-length is a token, not an accident.
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
      className={`mx-auto w-full ${className}`}
      style={{
        maxWidth: "var(--measure-read)",
        fontSize: "var(--t-0)",
        lineHeight: 1.72,
        letterSpacing: "-0.005em",
        color: "var(--deep)",
      }}
    >
      {children}
    </div>
  );
}

/**
 * The dwell rail: a hairline in the left margin that grows over the dwell gate.
 * A chunk is only scored once the viewport has held on it (PRD §5, use case A).
 * Three seconds of a hairline growing — deliberately not a progress bar.
 */
export function DwellRail({
  progress,
  running = false,
  state = "idle",
  className = "",
}: {
  /** 0–1 static fill. Ignored while `running`. */
  progress?: number;
  /** Animate the full gate duration from the `--dur-dwell` token. */
  running?: boolean;
  state?: "idle" | "counting" | "fired";
  className?: string;
}) {
  const fired = state === "fired";
  return (
    <div
      className={`absolute top-0 left-0 h-full w-px overflow-hidden ${className}`}
      style={{ zIndex: "var(--z-rail)", background: "var(--hair)" }}
      aria-hidden="true"
    >
      <div
        data-dwell-fill
        className="absolute inset-0 origin-top"
        style={{
          background: fired ? "var(--deep)" : "var(--moss)",
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
 * source of belief treatment in the system. Encoded chunks get nothing at all:
 * clean bone. Under-encoded ones sit deeper on the ramp; the at-risk tail is
 * the single place clay is permitted.
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
      style={{ paddingLeft: "1.15rem", paddingBlock: "0.15rem" }}
      data-band={v.band}
    >
      {current && <DwellRail progress={dwell} running={dwellRunning} state={dwellState} />}

      {/* The wash. Inset so it reads as depth on the page, not a block. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          inset: "-0.3rem -0.9rem",
          left: "0.3rem",
          borderRadius: 10,
          background: v.tint,
          zIndex: "var(--z-tint)",
          transition: "background var(--dur-tint) var(--ease-panel)",
        }}
      />

      <p className="relative py-2" style={{ zIndex: 2 }}>
        {children}
      </p>

      {showValue && (
        <div className="relative flex items-center gap-2.5 pb-1.5" style={{ zIndex: 2 }}>
          <Cap style={{ color: v.ink, letterSpacing: "0.14em" }}>P {formatP(v.p)}</Cap>
          <Cap>{v.label}</Cap>
          {v.confidence < 0.55 && <Cap>low confidence</Cap>}
        </div>
      )}
    </div>
  );
}
