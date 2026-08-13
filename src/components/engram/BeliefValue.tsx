"use client";

import { useEffect, useRef, useState } from "react";
import { beliefVisual, formatDelta, formatP } from "@/lib/belief";
import { duration } from "@/lib/tokens";
import { MicroLabel } from "./MicroLabel";

/**
 * The counting P value. This is the demo-winning detail: the stored posterior
 * visibly moves on screen while the agent speaks, so judges see a state engine,
 * not a chatbot (PRD §6.7 risk 2). Tabular numerals, so the digits do not
 * jitter as they climb.
 */
export function CountingP({
  value,
  confidence = 1,
  size = "lg",
  animate = true,
  label = "P(encoded)",
  className = "",
}: {
  value: number;
  confidence?: number;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  label?: string | null;
  className?: string;
}) {
  const [shown, setShown] = useState(animate ? value : value);
  const from = useRef(value);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      setShown(value);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(value);
      from.current = value;
      return;
    }

    const start = performance.now();
    const origin = from.current;
    const delta = value - origin;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration.count);
      // easeOutCubic — arrives, then settles.
      const eased = 1 - Math.pow(1 - t, 3);
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

  const v = beliefVisual(shown, confidence);
  const fontSize =
    size === "lg" ? "var(--text-numeric-lg)" : size === "md" ? "var(--text-numeric)" : "1.25rem";

  return (
    <div className={`flex flex-col items-start gap-1.5 ${className}`}>
      {label && <MicroLabel tone="dim">{label}</MicroLabel>}
      <span
        className="font-mono tnum leading-none"
        style={{ fontSize, color: v.ink, textShadow: v.confidence < 0.4 ? "none" : undefined }}
        aria-live="polite"
      >
        {formatP(shown)}
      </span>
    </div>
  );
}

/**
 * A labelled contribution, e.g. "hedged +0.12" vs "fluent +0.31". The label is
 * the point: the number must always name the evidence that moved it.
 */
export function DeltaChip({
  delta,
  label,
  className = "",
}: {
  delta: number;
  label: string;
  className?: string;
}) {
  // A delta's colour is the direction it moves belief, resolved through the one
  // mapping: upward deltas read cool, downward warm.
  const v = beliefVisual(delta >= 0 ? 0.9 : 0.1);
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full py-1 pr-2.5 pl-2 ${className}`}
      style={{ border: `1px solid ${v.stroke}`, background: v.tint }}
    >
      <span className="micro" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span className="font-mono tnum text-label" style={{ color: v.ink }}>
        {formatDelta(delta)}
      </span>
    </span>
  );
}
