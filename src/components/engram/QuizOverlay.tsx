"use client";

import type { ReactNode } from "react";
import { beliefVisual } from "@/lib/belief";
import { Cap } from "./Cap";
import { CountingP, DeltaChip } from "./BeliefValue";
import { Mark } from "./Mark";
import { Waveform } from "./AgentOrb";

/** Mic button for a spoken answer. Idle / listening. */
export function MicButton({
  listening = false,
  onClick,
  className = "",
}: {
  listening?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={listening ? "Listening — tap to stop" : "Answer out loud"}
      aria-pressed={listening}
      className={`inline-flex cursor-pointer items-center gap-2.5 border-0 ${className}`}
      style={{
        borderRadius: 100,
        padding: ".6rem 1.1rem .6rem .95rem",
        background: listening ? "var(--bone)" : "transparent",
        border: `1px solid ${listening ? "var(--bone)" : "var(--hair-lt)"}`,
        color: listening ? "var(--void)" : "var(--bone)",
        transition: "0.22s",
      }}
    >
      {listening ? (
        <Waveform bars={9} color="var(--void)" className="h-3" />
      ) : (
        <span className="block h-[7px] w-[7px] rounded-full" style={{ background: "var(--bone)" }} />
      )}
      <span
        style={{
          fontFamily: "var(--mono)",
          fontWeight: 300,
          fontSize: "var(--t--2)",
          textTransform: "uppercase",
          letterSpacing: ".16em",
        }}
      >
        {listening ? "listening" : "answer aloud"}
      </span>
    </button>
  );
}

/**
 * The quiz overlay. The reader dims to ~30% and the orb expands into a card in
 * the middle of the screen; the question is spoken aloud. After the answer the
 * P value counts to its new posterior with the contribution labelled — the
 * single most important beat in the demo, because it shows the state engine
 * updating while the agent talks (PRD §6.7 risk 2).
 *
 * Presentational only: pass `p` and re-render with the new value to make it count.
 */
export function QuizOverlay({
  question,
  chunkRef,
  p,
  confidence = 1,
  delta,
  deltaLabel,
  listening = false,
  onMic,
  onDismiss,
  transcript,
  className = "",
}: {
  question: string;
  /** The chunk this question targets, e.g. "c-14 · definitional". */
  chunkRef: string;
  /** Current posterior. Change it to trigger the count. */
  p: number;
  confidence?: number;
  /** The signed contribution just applied, if any. */
  delta?: number;
  /** What the evidence was, e.g. "hedged" / "fluent". */
  deltaLabel?: string;
  listening?: boolean;
  onMic?: () => void;
  onDismiss?: () => void;
  transcript?: ReactNode;
  className?: string;
}) {
  const v = beliefVisual(p, confidence);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ zIndex: "var(--z-overlay)" }}
    >
      <div
        className="w-full max-w-[30rem] p-6"
        style={{
          borderRadius: "var(--r)",
          background: "var(--void)",
          border: "1px solid var(--hair-lt)",
          boxShadow: "var(--elev-overlay)",
          color: "var(--bone)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <Cap style={{ color: "var(--slate)" }}>{chunkRef}</Cap>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Defer question"
              className="cursor-pointer border-0 bg-transparent"
              style={{ color: "var(--slate)" }}
            >
              ×
            </button>
          )}
        </div>

        <div className="mt-4 flex items-start gap-4">
          <Mark density={v.p} size={44} goo={v.goo} fill="var(--bone)" />
          <p
            style={{
              fontSize: "var(--t-1)",
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
              color: "var(--bone)",
            }}
          >
            {question}
          </p>
        </div>

        {/* The belief and its update, visible while the agent speaks. */}
        <div
          className="mt-6 flex items-end justify-between gap-4 pt-5"
          style={{ borderTop: "1px solid var(--hair-lt)" }}
        >
          <CountingP value={p} confidence={confidence} onDark size="lg" />
          {delta !== undefined && deltaLabel && (
            <DeltaChip delta={delta} label={deltaLabel} onDark />
          )}
        </div>

        {transcript && (
          <p
            className="mt-4"
            style={{ fontSize: "var(--t--1)", color: "var(--haze)", lineHeight: 1.55 }}
          >
            {transcript}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <MicButton listening={listening} onClick={onMic} />
          <Cap style={{ color: "var(--moss)" }}>{v.density}</Cap>
        </div>
      </div>
    </div>
  );
}

/**
 * The dim state. Wraps the reader and drops it to ~30% while the overlay is up,
 * then un-dims. Reading stays visible behind the card — the question is about
 * the page, so the page does not disappear.
 */
export function ReaderScrim({
  active,
  children,
  className = "",
}: {
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        opacity: active ? 0.3 : 1,
        filter: active ? "saturate(0.6)" : undefined,
        transition: "opacity var(--dur-dim) var(--ease-panel), filter var(--dur-dim) linear",
        pointerEvents: active ? "none" : undefined,
      }}
    >
      {children}
    </div>
  );
}
