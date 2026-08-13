"use client";

import { beliefCluster, beliefVisual, formatP } from "@/lib/belief";

/**
 * Overall retention for a document, as a warmth-tinted circle: an arc carrying
 * the value plus the radial dot-cluster from `beliefCluster()`. The numeral is
 * always present — hue alone never carries the reading.
 */
export function RetentionCircle({
  p,
  confidence = 1,
  size = 44,
  showValue = true,
  cluster = true,
  className = "",
}: {
  p: number;
  confidence?: number;
  size?: number;
  showValue?: boolean;
  cluster?: boolean;
  className?: string;
}) {
  const v = beliefVisual(p, confidence);
  const dots = cluster ? beliefCluster(p, confidence) : [];
  const r = 46;
  const circumference = 2 * Math.PI * r;

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Retention ${formatP(v.p)}, ${v.label}`}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {/* Ambient wash inside the ring. */}
        <circle cx="50" cy="50" r={r} fill={v.tint} />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--surface-hairline)"
          strokeWidth="2"
        />
        {cluster && (
          <g>
            {dots.map((d, i) => (
              <circle
                key={i}
                cx={d.x * 100}
                cy={d.y * 100}
                r={d.r * 100 * 0.62}
                fill={v.swatch}
                opacity={d.opacity * 0.8}
              />
            ))}
          </g>
        )}
        {/* Value arc. Dashed when the belief is weakly evidenced. */}
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={v.stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={
            v.dashed
              ? `${circumference * 0.02} ${circumference * 0.02}`
              : `${circumference * v.fill} ${circumference}`
          }
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dasharray var(--dur-tint) var(--ease-instrument)" }}
        />
      </svg>
      {showValue && size >= 40 && (
        <span
          className="absolute inset-0 flex items-center justify-center font-mono tnum"
          style={{ fontSize: size * 0.26, color: v.ink }}
        >
          {formatP(v.p).replace("0.", ".")}
        </span>
      )}
    </div>
  );
}

/**
 * The pure dot-cluster, unringed — the "generative pattern" form. Used where the
 * belief is an atmosphere rather than a figure (profile card, drawer header).
 */
export function BeliefCluster({
  p,
  confidence = 1,
  size = 96,
  label,
  className = "",
}: {
  p: number;
  confidence?: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const v = beliefVisual(p, confidence);
  const dots = beliefCluster(p, confidence, 3);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.x * 100}
            cy={d.y * 100}
            r={d.r * 100 * 0.7}
            fill={v.swatch}
            opacity={d.opacity}
          />
        ))}
      </svg>
      {label && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="micro text-center leading-[1.35] text-void">{label}</span>
        </span>
      )}
    </div>
  );
}
