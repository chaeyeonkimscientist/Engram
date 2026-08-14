"use client";

import { useEffect, useRef, useState } from "react";
import { beliefVisual, formatDelta, formatP } from "@/lib/belief";
import { duration } from "@/lib/tokens";
import { Cap } from "./Cap";

/**
 * The counting P value. This is the demo-winning detail: the stored posterior
 * visibly moves on screen while the agent speaks, so judges see a state engine,
 * not a tutor bot with a database attached (PRD §6.7 risk 2). Martian Mono is
 * monospaced, so the digits are tabular and cannot jitter as they climb.
 */
export function CountingP({
  value,
  confidence = 1,
  size = "lg",
  animate = true,
  label = "P(encoded)",
  onDark = false,
  className = "",
}: {
  value: number;
  confidence?: number;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  label?: string | null;
  onDark?: boolean;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      from.current = value;
      return;
    }
    // Reduced motion: arrive at the value on the next frame, without counting.
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) {
      raf.current = requestAnimationFrame(() => {
        setShown(value);
        from.current = value;
      });
      return;
    }

    const start = performance.now();
    const origin = from.current;
    const delta = value - origin;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration.count);
      const eased = 1 - Math.pow(1 - t, 3); // arrives, then settles
      setShown(origin + delta * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      from.current = value;
    };
  }, [value, animate]);

  const display = animate ? shown : value;
  const v = beliefVisual(display, confidence);
  const fontSize = size === "lg" ? "3.4rem" : size === "md" ? "2.1rem" : "1.2rem";
  // On dark the ramp inverts; clay is still permitted for the at-risk tail.
  const color = v.atRisk ? "var(--risk-lt)" : onDark ? "var(--bone)" : "var(--ink)";

  return (
    <div className={`flex flex-col items-start gap-1.5 ${className}`}>
      {label && <Cap>{label}</Cap>}
      <span
        className="tnum"
        style={{
          fontFamily: "var(--mono)",
          fontWeight: 300,
          fontSize,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color,
        }}
        aria-live="polite"
      >
        {formatP(display)}
      </span>
    </div>
  );
}

/**
 * A labelled contribution: "hedged +0.12" vs "fluent +0.31". The label is the
 * point — a number that moves without naming its evidence is just a number.
 */
export function DeltaChip({
  delta,
  label,
  onDark = false,
  className = "",
}: {
  delta: number;
  label: string;
  onDark?: boolean;
  className?: string;
}) {
  const negative = delta < 0;
  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      style={{
        border: `1px solid ${onDark ? "var(--hair-lt)" : "var(--hair)"}`,
        borderRadius: 100,
        padding: ".34rem .7rem .34rem .6rem",
        // Downward moves sit deeper on the ramp; the at-risk direction may use clay.
        background: negative
          ? onDark
            ? "rgba(156,132,103,.16)"
            : "rgba(156,132,103,.12)"
          : onDark
            ? "rgba(239,239,236,.06)"
            : "var(--bone)",
      }}
    >
      <span
        className="block h-[5px] w-[5px] rounded-full"
        style={{ background: negative ? "var(--risk)" : onDark ? "var(--bone)" : "var(--deep)" }}
      />
      <span
        style={{
          fontSize: "var(--t--1)",
          letterSpacing: "-0.01em",
          color: onDark ? "var(--slate)" : "var(--moss)",
        }}
      >
        {label}
      </span>
      <span
        className="tnum"
        style={{
          fontFamily: "var(--mono)",
          fontWeight: 300,
          fontSize: "var(--t--2)",
          color: negative ? (onDark ? "var(--risk-lt)" : "var(--risk)") : onDark ? "var(--bone)" : "var(--ink)",
        }}
      >
        {formatDelta(delta)}
      </span>
    </span>
  );
}

/** Inline P readout for dense contexts (log rows, list items). */
export function PReadout({
  p,
  confidence = 1,
  onDark = false,
}: {
  p: number;
  confidence?: number;
  onDark?: boolean;
}) {
  const v = beliefVisual(p, confidence);
  return (
    <span
      className="tnum"
      style={{
        fontFamily: "var(--mono)",
        fontWeight: 300,
        fontSize: "var(--t--2)",
        letterSpacing: ".06em",
        color: v.atRisk ? (onDark ? "var(--risk-lt)" : "var(--risk)") : onDark ? "var(--bone)" : "var(--ink)",
      }}
    >
      {formatP(p)}
    </span>
  );
}
