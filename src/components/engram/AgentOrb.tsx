"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { MicroLabel } from "./MicroLabel";

export type OrbState = "idle" | "thinking" | "wants-to-speak" | "speaking";

/**
 * Escalation ladder. The orb is PRD §6.5's interrupt-safety rules made visual:
 * it never interrupts, it *offers*, and the offer decays if you keep reading.
 *
 *  idle           40% opacity, still           — watching, no ask
 *  thinking       60% opacity, slow pulse      — dwell gate fired, belief updated
 *  wants-to-speak 100% opacity, bloom outward  — question queued at a paragraph boundary
 *  speaking       expands to a pill            — waveform + transcript
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
  /** Show the decay hairline under a queued offer. */
  showDecay = true,
  className = "",
}: {
  state?: OrbState;
  size?: number;
  onInvite?: () => void;
  onDefer?: () => void;
  showDecay?: boolean;
  className?: string;
}) {
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  const meta = STATE_META[state];
  const wants = state === "wants-to-speak";

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
        aria-label={`Agent: ${meta.label}. Tap to invite, swipe to defer.`}
        className="relative grid touch-none place-items-center rounded-full outline-none focus-visible:ring-1 focus-visible:ring-cool-400"
        style={{
          width: size,
          height: size,
          transform: `translateX(${dragX}px)`,
          opacity: deferring ? 0.25 : 1,
          transition: dragX === 0 ? "transform var(--dur-calm) var(--ease-instrument), opacity var(--dur-quick) linear" : "opacity var(--dur-quick) linear",
        }}
      >
        {/* Bloom rings — the offer reaching out, never grabbing. */}
        {wants && (
          <>
            <span
              data-orb-bloom
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                border: "1px solid color-mix(in oklab, var(--color-ink-50) 40%, transparent)",
                animation: "var(--animate-orb-bloom)",
              }}
            />
            <span
              data-orb-bloom
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                border: "1px solid color-mix(in oklab, var(--color-ink-50) 24%, transparent)",
                animation: "var(--animate-orb-bloom)",
                animationDelay: "900ms",
              }}
            />
          </>
        )}

        {/* Volumetric halo — light in fog. */}
        {wants && (
          <span
            className="pointer-events-none absolute rounded-full"
            style={{
              inset: -size * 0.5,
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--color-ink-50) 22%, transparent) 0%, transparent 68%)",
              animation: "var(--animate-orb-halo)",
            }}
          />
        )}

        {/* Core */}
        <span
          data-orb-core
          data-state={state}
          className="relative rounded-full"
          style={{
            width: size * 0.62,
            height: size * 0.62,
            background:
              "radial-gradient(circle at 34% 30%, var(--color-ink-50) 0%, var(--color-ink-200) 46%, var(--color-ink-400) 100%)",
            opacity: meta.opacity,
            boxShadow: wants ? "0 0 18px -2px color-mix(in oklab, var(--color-ink-50) 55%, transparent)" : undefined,
            animation: state === "thinking" ? "var(--animate-orb-think)" : undefined,
            transition: "opacity var(--dur-slow) var(--ease-instrument), box-shadow var(--dur-slow) var(--ease-instrument)",
          }}
        />
      </button>

      {/* Offer decay: a real token, rendered. If you keep reading, the ask expires. */}
      {wants && showDecay && (
        <span
          aria-hidden="true"
          className="mt-2 block h-px origin-left overflow-hidden"
          style={{ width: size }}
        >
          <span
            className="block h-px w-full origin-left"
            style={{
              background: "color-mix(in oklab, var(--color-ink-50) 45%, transparent)",
              animation: "var(--animate-offer-decay)",
            }}
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
  className = "",
}: {
  bars?: number;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-4 items-center gap-[3px] ${className}`}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          data-wave-bar
          className="block w-[2px] rounded-full"
          style={{
            height: "100%",
            background: "color-mix(in oklab, var(--color-ink-100) 78%, transparent)",
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
 * The speaking state: the orb expanded into an outlined pill, in the idiom of
 * the pill lockups on the reference boards. Transcript sits underneath, so the
 * spoken turn is always visible alongside the belief that triggered it.
 */
export function SpeakingPill({
  transcript,
  cites,
  onDismiss,
  className = "",
}: {
  transcript: ReactNode;
  /** The stored posterior this intervention cites (PRD §6.7 risk 2). */
  cites?: string;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-end gap-2 ${className}`} style={{ zIndex: "var(--z-orb)" }}>
      <div
        className="flex items-center gap-3 rounded-full py-2.5 pr-3.5 pl-3"
        style={{
          border: "1px solid var(--surface-line)",
          background: "color-mix(in oklab, var(--color-ink-850) 92%, transparent)",
          boxShadow: "var(--elev-card), var(--glow-neutral)",
          backdropFilter: "blur(8px)",
        }}
      >
        <span
          className="block h-2.5 w-2.5 rounded-full"
          style={{
            background: "var(--color-ink-50)",
            boxShadow: "0 0 12px 0 color-mix(in oklab, var(--color-ink-50) 70%, transparent)",
          }}
        />
        <Waveform />
        <MicroLabel tone="dim">speaking</MicroLabel>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="micro text-ink-500 transition-colors hover:text-ink-200"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>

      <div
        className="max-w-[22rem] rounded-md px-3 py-2.5 text-right"
        style={{
          border: "1px solid var(--surface-line)",
          background: "color-mix(in oklab, var(--color-ink-900) 88%, transparent)",
        }}
      >
        <p className="text-meta leading-relaxed text-ink-200">{transcript}</p>
        {cites && (
          <p className="mt-2">
            <MicroLabel tone="dim">cites {cites}</MicroLabel>
          </p>
        )}
      </div>
    </div>
  );
}
