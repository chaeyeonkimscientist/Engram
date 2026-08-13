import type { ReactNode } from "react";

/**
 * A registration mark. Tiny uppercase monospace, placed at frame edges as on
 * the reference boards. Never used to explain the UI — only to locate it.
 */
export function MicroLabel({
  children,
  tone = "quiet",
  className = "",
}: {
  children: ReactNode;
  tone?: "quiet" | "bright" | "dim";
  className?: string;
}) {
  const color =
    tone === "bright"
      ? "text-ink-200"
      : tone === "dim"
        ? "text-ink-500"
        : "text-ink-400";
  return <span className={`micro ${color} ${className}`}>{children}</span>;
}

/**
 * A run of micro-labels separated by `//`, as in "HEALTH CARE INDUSTRY // 2026".
 */
export function MicroRule({
  items,
  className = "",
}: {
  items: string[];
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {items.map((item, i) => (
        <span key={item} className="flex items-center gap-3">
          {i > 0 && <span className="micro text-ink-600">//</span>}
          <MicroLabel>{item}</MicroLabel>
        </span>
      ))}
    </div>
  );
}
