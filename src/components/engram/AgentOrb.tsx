"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Cap } from "./Cap";

export type OrbState = "idle" | "thinking" | "wants-to-speak" | "speaking";

/**
 * The escalation ladder. The orb is PRD §6.5's interrupt-safety rules made
 * visual: it never interrupts, it *offers*, and the offer decays if you keep
 * reading.
 *
 *   idle            40% opacity, still         — watching, no ask
 *   thinking        60% opacity, slow pulse    — dwell gate fired, belief updated
 *   wants-to-speak  100%, bloom outward        — question queued at a paragraph boundary
 *   speaking        expands into a pill        — waveform + transcript
 *
 * No hue anywhere: the ladder is carried by opacity, scale and bloom, on the
 * ramp. Emphasis comes from depth and contrast, as the identity requires.
 */
const STATE_META: Record<OrbState, { opacity: number; label: string }> = {
  idle: { opacity: 0.4, label: "watching" },
  thinking: { opacity: 0.6, label: "belief updated" },
  "wants-to-speak": { opacity: 1, label: "has a question" },
  speaking: { opacity: 1, label: "speaking" },
};

const SWIPE_DEFER_PX = 44;

export function AgentOrb({
  state = "idle",
  size = 40,
  /** Tap to invite the agent in. */
  onInvite,
  /** Swipe right to defer the offer. */
  onDefer,
  showDecay = true,
  onDark = false,
  className = "",
}: {
  state?: OrbState;
  size?: number;
  onInvite?: () => void;
  onDefer?: () => void;
  showDecay?: boolean;
  /** Invert the orb for void-dark surfaces. Still no hue — only the ramp. */
  onDark?: boolean;
  className?: string;
}) {
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  const meta = STATE_META[state];
  const wants = state === "wants-to-speak";
  // On void the ladder inverts: the orb is bone, the bloom is bone.
  const edge = onDark ? "239,239,236" : "42,58,61";
  const core = onDark
    ? "radial-gradient(circle at 34% 30%, var(--bone) 0%, var(--slate) 78%)"
    : "radial-gradient(circle at 34% 30%, var(--deep) 0%, var(--void) 70%)";

  const handleDown = (e: PointerEvent<HTMLButtonElement>) => {
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (startX.current === null) return;
    setDragX(Math.max(0, e.clientX - startX.current));
  };
  const handleUp = () => {
    if (dragX > SWIPE_DEFER_PX) onDefer?.();
    startX.current = null;
    setDragX(0);
  };

  const deferring = dragX > SWIPE_DEFER_PX;

  return (
    <div
      className={`relative inline-flex flex-col items-center ${className}`}
      style={{ zIndex: "var(--z-orb)" }}
    >
      <button
        type="button"
        onClick={() => dragX === 0 && onInvite?.()}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        aria-label={`Agent: ${meta.label}. Tap to invite, swipe right to defer.`}
        className="relative grid touch-none cursor-pointer place-items-center rounded-full border-0 bg-transparent outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--deep)]"
        style={{
          width: size,
          height: size,
          transform: `translateX(${dragX}px)`,
          opacity: deferring ? 0.25 : 1,
          transition:
            dragX === 0
              ? "transform var(--dur-calm) var(--ease-panel), opacity var(--dur-quick) linear"
              : "opacity var(--dur-quick) linear",
        }}
      >
        {/* Bloom — the offer reaching out, never grabbing. */}
        {wants && (
          <>
            <span
              data-orb-bloom
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                border: `1px solid rgba(${edge},.45)`,
                animation: "var(--animate-orb-bloom)",
              }}
            />
            <span
              data-orb-bloom
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                border: `1px solid rgba(${edge},.28)`,
                animation: "var(--animate-orb-bloom)",
                animationDelay: "950ms",
              }}
            />
            <span
              className="pointer-events-none absolute rounded-full"
              style={{
                inset: -size * 0.5,
                background:
                  `radial-gradient(circle, rgba(${edge},.16) 0%, transparent 68%)`,
                animation: "var(--animate-orb-halo)",
              }}
            />
          </>
        )}

        {/* Core */}
        <span
          data-orb-core
          data-state={state}
          className="relative rounded-full"
          style={{
            width: size * 0.6,
            height: size * 0.6,
            background: core,
            opacity: meta.opacity,
            boxShadow: wants ? "0 6px 18px -6px rgba(11,17,19,.6)" : undefined,
            animation: state === "thinking" ? "var(--animate-orb-think)" : undefined,
            transition: "opacity var(--dur-slow) var(--ease-panel)",
          }}
        />
      </button>

      {/* Offer decay, rendered. If you keep reading, the ask expires. */}
      {wants && showDecay && (
        <span
          aria-hidden="true"
          className="mt-2 block h-px overflow-hidden"
          style={{ width: size, background: onDark ? "var(--hair-lt)" : "var(--hair)" }}
        >
          <span
            className="block h-px w-full origin-left"
            style={{ background: onDark ? "var(--bone)" : "var(--moss)", animation: "var(--animate-offer-decay)" }}
          />
        </span>
      )}
    </div>
  );
}

/** Waveform for the speaking state. Bars only; no scrubber, no controls. */
export function Waveform({
  bars = 22,
  active = true,
  color = "var(--deep)",
  className = "",
}: {
  bars?: number;
  active?: boolean;
  color?: string;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={`flex h-4 items-center gap-[3px] ${className}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          data-wave-bar
          className="block w-[2px] rounded-full"
          style={{
            height: "100%",
            background: color,
            transform: active ? undefined : "scaleY(0.16)",
            animation: active ? "var(--animate-wave)" : undefined,
            animationDelay: `${(i % 7) * 110 + (i % 3) * 60}ms`,
          }}
        />
      ))}
    </span>
  );
}

/**
 * The speaking state: the orb expanded into an outlined glass pill, with the
 * transcript underneath. Every spoken turn cites the stored posterior that
 * triggered it — that citation is the "state engine that talks" defense, and it
 * is not optional (PRD §6.7 risk 2).
 */
export function SpeakingPill({
  transcript,
  cites,
  onDismiss,
  className = "",
}: {
  transcript: ReactNode;
  cites?: string;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-end gap-2 ${className}`}
      style={{ zIndex: "var(--z-orb)" }}
    >
      <div
        className="flex items-center gap-3 rounded-full py-2.5 pr-3 pl-3.5"
        style={{
          border: "1px solid var(--hair)",
          background: "rgba(239,239,236,.72)",
          backdropFilter: "blur(16px) saturate(1.4)",
          boxShadow: "var(--elev-nav)",
        }}
      >
        <span
          className="block h-2 w-2 rounded-full"
          style={{ background: "var(--void)" }}
        />
        <Waveform />
        <Cap>speaking</Cap>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="cursor-pointer border-0 bg-transparent"
            style={{ color: "var(--moss)", fontSize: "var(--t--1)" }}
          >
            ×
          </button>
        )}
      </div>

      <div
        className="max-w-[23rem] px-3.5 py-3 text-right"
        style={{
          border: "1px solid var(--hair)",
          borderRadius: "var(--r)",
          background: "rgba(255,255,255,.55)",
          backdropFilter: "blur(18px)",
        }}
      >
        <p style={{ fontSize: "var(--t--1)", lineHeight: 1.55, color: "var(--deep)" }}>
          {transcript}
        </p>
        {cites && (
          <p className="mt-2">
            <Cap>cites {cites}</Cap>
          </p>
        )}
      </div>
    </div>
  );
}
