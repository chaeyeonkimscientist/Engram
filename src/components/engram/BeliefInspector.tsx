"use client";

import { useState } from "react";
import { beliefVisual, formatDelta, formatP } from "@/lib/belief";
import { Cap } from "./Cap";
import { Mark } from "./Mark";
import { PReadout } from "./BeliefValue";

export interface BeliefEvent {
  /** Monospace timestamp, e.g. "00:14:02". */
  at: string;
  /** What happened, in machine voice: "dwell gate fired", "prior ingested". */
  kind: string;
  /** Chunk reference, e.g. "c-14". */
  chunk?: string;
  /** Signed posterior change, if this event moved belief. */
  delta?: number;
}

export interface ChunkBelief {
  id: string;
  /** First few words of the chunk, for orientation. */
  excerpt: string;
  p: number;
  confidence?: number;
}

export interface Contribution {
  source: "prior" | "quiz" | "voice";
  detail: string;
  delta: number;
}

/**
 * Collapsed state: a thin vertical strip at the right edge showing the current
 * P value. Closed by default — the reader is the product, not the telemetry.
 */
export function BeliefStrip({
  p,
  confidence = 1,
  onOpen,
  className = "",
}: {
  p: number;
  confidence?: number;
  onOpen?: () => void;
  className?: string;
}) {
  const v = beliefVisual(p, confidence);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open belief inspector. Current P is ${formatP(p)}.`}
      className={`flex w-[38px] cursor-pointer flex-col items-center justify-between border-0 py-3 ${className}`}
      style={{
        background: "var(--void)",
        color: "var(--bone)",
        borderLeft: "1px solid var(--hair-lt)",
        zIndex: "var(--z-drawer)",
      }}
    >
      <Mark density={v.p} size={20} goo={v.goo * 0.42} fill="var(--bone)" />
      <span
        className="tnum"
        style={{
          fontFamily: "var(--mono)",
          fontWeight: 300,
          fontSize: "var(--t--2)",
          letterSpacing: ".1em",
          writingMode: "vertical-rl",
          color: v.atRisk ? "var(--risk-lt)" : "var(--bone)",
        }}
      >
        P {formatP(p)}
      </span>
      <Cap style={{ writingMode: "vertical-rl", color: "var(--slate)" }}>belief</Cap>
    </button>
  );
}

/** One line of the live event log. */
export function EventLogRow({ event, index = 0 }: { event: BeliefEvent; index?: number }) {
  return (
    <div
      className="flex items-baseline gap-3 py-[.42rem]"
      style={{
        borderBottom: "1px solid var(--hair-lt)",
        animation: "var(--animate-log-in)",
        animationDelay: `${index * 40}ms`,
      }}
    >
      <span
        className="tnum shrink-0"
        style={{ fontFamily: "var(--mono)", fontWeight: 300, fontSize: "var(--t--2)", color: "var(--slate)" }}
      >
        {event.at}
      </span>
      <span style={{ fontSize: "var(--t--1)", color: "var(--haze)", letterSpacing: "-.01em" }}>
        {event.kind}
      </span>
      {event.chunk && <Cap style={{ color: "var(--moss)" }}>{event.chunk}</Cap>}
      {event.delta !== undefined && (
        <span
          className="tnum ml-auto shrink-0"
          style={{
            fontFamily: "var(--mono)",
            fontWeight: 300,
            fontSize: "var(--t--2)",
            color: event.delta < 0 ? "var(--risk-lt)" : "var(--bone)",
          }}
        >
          {formatDelta(event.delta)}
        </span>
      )}
    </div>
  );
}

/**
 * Contribution breakdown — their `.mem` citation block, repurposed. Same idea
 * (show what you pulled), correct subject: the three fused signals behind this
 * chunk's posterior.
 */
export function ContributionBreakdown({
  contributions,
  className = "",
}: {
  contributions: Contribution[];
  className?: string;
}) {
  return (
    <div className={`mem ${className}`}>
      <div className="h">posterior from {contributions.length} signals</div>
      <div className="l">
        {contributions.map((c) => (
          <div key={c.source + c.detail} className="flex items-baseline gap-2">
            <span style={{ minWidth: "3.2rem", color: "var(--slate)" }}>{c.source}</span>
            <em>{c.detail}</em>
            <span
              className="tnum ml-auto"
              style={{
                fontFamily: "var(--mono)",
                fontSize: "var(--t--2)",
                color: c.delta < 0 ? "var(--risk-lt)" : "var(--bone)",
              }}
            >
              {formatDelta(c.delta)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Per-chunk row: the mark reports density, the numeral reports the value. */
export function ChunkRow({ chunk }: { chunk: ChunkBelief }) {
  const v = beliefVisual(chunk.p, chunk.confidence ?? 1);
  return (
    <div
      className="flex items-center gap-3 py-[.45rem]"
      style={{ borderBottom: "1px solid var(--hair-lt)" }}
    >
      <Mark density={v.p} size={22} goo={v.goo * 0.45} fill="var(--bone)" />
      <Cap style={{ color: "var(--moss)", minWidth: "2.6rem" }}>{chunk.id}</Cap>
      <span
        className="truncate"
        style={{ fontSize: "var(--t--1)", color: "var(--haze)", letterSpacing: "-.01em" }}
      >
        {chunk.excerpt}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-2">
        <Cap style={{ color: "var(--moss)" }}>{v.density}</Cap>
        <PReadout p={chunk.p} confidence={chunk.confidence ?? 1} onDark />
      </span>
    </div>
  );
}

/**
 * Pulled open: the live event log, the per-chunk breakdown, and the
 * prior/quiz/voice contributions. Void-dark so it is legible on stage when
 * opened mid-demo.
 */
export function BeliefDrawer({
  p,
  confidence = 1,
  events,
  chunks,
  contributions,
  onClose,
  className = "",
}: {
  p: number;
  confidence?: number;
  events: BeliefEvent[];
  chunks: ChunkBelief[];
  contributions: Contribution[];
  onClose?: () => void;
  className?: string;
}) {
  const v = beliefVisual(p, confidence);
  return (
    <aside
      className={`flex w-full flex-col gap-5 p-5 ${className}`}
      style={{
        background: "var(--void)",
        color: "var(--bone)",
        borderLeft: "1px solid var(--hair-lt)",
        zIndex: "var(--z-drawer)",
      }}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Mark density={v.p} size={40} goo={v.goo} fill="var(--bone)" />
          <div>
            <Cap style={{ color: "var(--slate)" }}>current chunk</Cap>
            <div className="flex items-baseline gap-2">
              <span
                className="tnum"
                style={{
                  fontFamily: "var(--mono)",
                  fontWeight: 300,
                  fontSize: "1.5rem",
                  color: v.atRisk ? "var(--risk-lt)" : "var(--bone)",
                }}
              >
                {formatP(p)}
              </span>
              <Cap style={{ color: "var(--slate)" }}>{v.label}</Cap>
            </div>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close belief inspector"
            className="cursor-pointer border-0 bg-transparent"
            style={{ color: "var(--slate)" }}
          >
            ×
          </button>
        )}
      </header>

      <div>
        <Cap style={{ color: "var(--slate)" }}>fusion</Cap>
        <div className="mt-2">
          <ContributionBreakdown contributions={contributions} />
        </div>
        <p className="mt-3" style={{ fontSize: "var(--t--2)", color: "var(--moss)", fontFamily: "var(--mono)", fontWeight: 300, lineHeight: 1.8 }}>
          confidence {confidence.toFixed(2)} — prior is low-SNR by design; soft goo means
          the estimate is not yet claimed
        </p>
      </div>

      <div>
        <Cap style={{ color: "var(--slate)" }}>event log</Cap>
        <div className="mt-2">
          {events.map((e, i) => (
            <EventLogRow key={`${e.at}-${e.kind}`} event={e} index={i} />
          ))}
        </div>
      </div>

      <div>
        <Cap style={{ color: "var(--slate)" }}>per-chunk belief</Cap>
        <div className="mt-2">
          {chunks.map((c) => (
            <ChunkRow key={c.id} chunk={c} />
          ))}
        </div>
      </div>
    </aside>
  );
}

/** Strip + drawer, with the open/closed transition. Closed by default. */
export function BeliefInspector(props: {
  p: number;
  confidence?: number;
  events: BeliefEvent[];
  chunks: ChunkBelief[];
  contributions: Contribution[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);
  return open ? (
    <div style={{ width: "min(360px, 78vw)" }}>
      <BeliefDrawer {...props} onClose={() => setOpen(false)} />
    </div>
  ) : (
    <BeliefStrip p={props.p} confidence={props.confidence} onOpen={() => setOpen(true)} />
  );
}
