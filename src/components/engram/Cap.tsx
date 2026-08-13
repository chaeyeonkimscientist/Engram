import type { ReactNode } from "react";

/**
 * A machine readout. Martian Mono, small and tracked out — the only way this
 * face is ever used. Anything a human reads is Inter Tight.
 */
export function Cap({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`cap ${className}`} style={style}>
      {children}
    </span>
  );
}

/** A section header: numbered kicker, title, and a right-aligned note. */
export function SectionHead({
  kicker,
  title,
  note,
}: {
  kicker: string;
  title: string;
  note: string;
}) {
  return (
    <div className="shead">
      <div>
        <Cap className="mb-[.7rem] block">{kicker}</Cap>
        <h2>{title}</h2>
      </div>
      <p className="note">{note}</p>
    </div>
  );
}
