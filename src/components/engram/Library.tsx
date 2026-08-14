"use client";

import { beliefVisual, formatP } from "@/lib/belief";
import { Cap } from "./Cap";
import { Mark } from "./Mark";

/**
 * Overall retention for a document. The retention circle *is* the mark at the
 * document's mean density — sparse for a document that did not land, fused for
 * one that did. The numeral is always present; density never has to carry the
 * reading alone.
 */
export function RetentionMark({
  p,
  confidence = 1,
  size = 44,
  showValue = true,
  onDark = false,
  className = "",
}: {
  p: number;
  confidence?: number;
  size?: number;
  showValue?: boolean;
  onDark?: boolean;
  className?: string;
}) {
  const v = beliefVisual(p, confidence);
  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className}`}
      role="img"
      aria-label={`Retention ${formatP(p)}, ${v.label}`}
    >
      <span
        className="grid place-items-center rounded-full"
        style={{
          width: size,
          height: size,
          border: `1px solid ${onDark ? "var(--hair-lt)" : "var(--hair)"}`,
          background: v.tint,
        }}
      >
        <Mark
          density={v.p}
          size={size * 0.72}
          goo={v.goo * 0.5}
          fill={v.atRisk ? "var(--risk)" : onDark ? "var(--bone)" : "var(--deep)"}
        />
      </span>
      {showValue && (
        <span
          className="tnum"
          style={{
            fontFamily: "var(--mono)",
            fontWeight: 300,
            fontSize: "var(--t--2)",
            color: v.atRisk ? "var(--risk)" : onDark ? "var(--bone)" : "var(--ink)",
          }}
        >
          {formatP(p)}
        </span>
      )}
    </span>
  );
}

/** A previously-read document. */
export function DocumentRow({
  title,
  meta,
  p,
  confidence = 1,
  onOpen,
}: {
  title: string;
  /** e.g. "24 chunks · read 3 days ago". */
  meta: string;
  p: number;
  confidence?: number;
  onOpen?: () => void;
}) {
  const v = beliefVisual(p, confidence);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full cursor-pointer items-center gap-4 border-0 bg-transparent px-1 py-3.5 text-left"
      style={{ borderBottom: "1px solid var(--hair)" }}
    >
      <RetentionMark p={p} confidence={confidence} size={40} showValue={false} />
      <span className="min-w-0 flex-1">
        <span
          className="block truncate"
          style={{ fontSize: "var(--t-0)", letterSpacing: "-0.02em", color: "var(--ink)" }}
        >
          {title}
        </span>
        <Cap className="mt-1 block">{meta}</Cap>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <Cap>{v.label}</Cap>
        <span
          className="tnum"
          style={{
            fontFamily: "var(--mono)",
            fontWeight: 300,
            fontSize: "var(--t--1)",
            color: v.atRisk ? "var(--risk)" : "var(--ink)",
          }}
        >
          {formatP(p)}
        </span>
      </span>
    </button>
  );
}

/**
 * The learning profile card. It must exist on screen before the cold-start
 * beat, so judges see the profile exists before they watch it act on a document
 * it has never seen.
 */
export function ProfileCard({
  claim,
  stats,
  p = 0.42,
  className = "",
}: {
  claim: string;
  stats: { label: string; value: string }[];
  /** Mean belief across the profile, drives the mark density. */
  p?: number;
  className?: string;
}) {
  const v = beliefVisual(p);
  return (
    <div
      className={`p-5 ${className}`}
      style={{
        border: "1px solid var(--hair)",
        borderRadius: "var(--r)",
        background: "#F5F5F2",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <Cap>learning profile</Cap>
        <Cap>{v.density}</Cap>
      </div>
      <div className="mt-4 flex items-start gap-4">
        <Mark density={v.p} size={52} goo={v.goo * 0.6} fill="var(--deep)" />
        <p style={{ fontSize: "var(--t-1)", letterSpacing: "-0.02em", lineHeight: 1.28 }}>
          {claim}
        </p>
      </div>
      <div className="mt-4">
        {stats.map((s) => (
          <div key={s.label} className="stat">
            <span>{s.label}</span>
            <span>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The one primary action on the library screen. Paste a link or drop a PDF —
 * nothing else competes with it.
 */
export function IngestCTA({
  onPaste,
  dragging = false,
  className = "",
}: {
  onPaste?: () => void;
  dragging?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 px-6 py-9 text-center ${className}`}
      style={{
        border: `1px ${dragging ? "solid" : "dashed"} ${dragging ? "var(--deep)" : "var(--hair)"}`,
        borderRadius: "var(--r)",
        background: dragging ? "rgba(42,58,61,.04)" : "var(--bone)",
        transition: "0.22s",
      }}
    >
      <Mark density="linked" size={40} goo={2.4} fill="var(--deep)" />
      <p style={{ fontSize: "var(--t-1)", letterSpacing: "-0.02em" }}>
        Paste a link or drop a PDF.
      </p>
      <Cap>engram scores encoding per passage as you read</Cap>
      <button
        type="button"
        onClick={onPaste}
        className="mt-1 cursor-pointer border-0"
        style={{
          borderRadius: 100,
          padding: ".55rem 1.2rem",
          background: "var(--ink)",
          color: "var(--bone)",
          fontSize: "var(--t--1)",
          letterSpacing: "-0.01em",
        }}
      >
        Paste link
      </button>
    </div>
  );
}
