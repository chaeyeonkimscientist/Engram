/**
 * The Engram mark: a connected-node cluster on a strict 24-unit grid — a memory
 * trace as a core with links out to a corona. Built from circles and
 * round-capped strokes only, in the dot-grid idiom of the reference boards.
 */
export function Logomark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Links: the trace. Round caps read as node-to-node connections. */}
      <g stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
        <path d="M12 12 H18" />
        <path d="M12 12 H6" />
        <path d="M12 12 V6" />
        <path d="M12 12 V18" />
      </g>
      {/* Core */}
      <circle cx="12" cy="12" r="3.4" fill="currentColor" />
      {/* Corona: sparser outer ring, on the same grid. */}
      <g fill="currentColor">
        <circle cx="3" cy="3" r="1.7" opacity="0.55" />
        <circle cx="21" cy="3" r="1.7" opacity="0.55" />
        <circle cx="3" cy="21" r="1.7" opacity="0.55" />
        <circle cx="21" cy="21" r="1.7" opacity="0.55" />
      </g>
    </svg>
  );
}

/** Mark + wordmark lockup. */
export function Wordmark({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-baseline gap-2.5 ${className}`}>
      <Logomark size={size} className="translate-y-[0.15em]" />
      <span
        className="font-sans font-medium text-ink-50"
        style={{ fontSize: size * 0.86, letterSpacing: "-0.03em" }}
      >
        engram
        <span
          className="align-super text-ink-400"
          style={{ fontSize: size * 0.3, letterSpacing: "0" }}
        >
          ®
        </span>
      </span>
    </span>
  );
}
