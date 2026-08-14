"use client";

import { useEffect, useRef, useState } from "react";
import { DENSITY_ORDER, STATES, type DensityName, type LatticeNode } from "@/lib/lattice";
import { MarkStageSvg } from "./Mark";

/** Copy rewritten for the real product: reading, not repo conventions. */
const COPY: Record<DensityName, string> = {
  sparse:
    "First pass, no evidence. Every passage sits alone and the agent has nothing to target.",
  linked:
    "The dwell gate fires and the neural prior lands. Neighbouring passages begin to touch.",
  dense:
    "Quiz and spoken answers sharpen the prior. The passages you hold carry most of the weight.",
  fused:
    "Consolidated. One reachable structure — this is what no cold start looks like.",
};

const READ: Record<DensityName, [string, string, string, string]> = {
  sparse: ["142", "0.00", "0.00", "yes"],
  linked: ["142", "0.31", "0.42", "no"],
  dense: ["142", "0.68", "0.71", "no"],
  fused: ["142", "0.91", "0.94", "no"],
};

/**
 * The consolidation stage: one mark, four densities, animated between them.
 * Ported from their `tick()` easing (12% per frame toward target) so the
 * movement matches the identity page exactly.
 */
export function MarkStage({ autoAdvance = true }: { autoAdvance?: boolean }) {
  const [index, setIndex] = useState(0);
  const [nodes, setNodes] = useState<LatticeNode[]>(() =>
    STATES.sparse.map((n) => ({ ...n })),
  );
  const cur = useRef<LatticeNode[]>(STATES.sparse.map((n) => ({ ...n })));
  const raf = useRef<number | null>(null);
  const touched = useRef(false);

  const goTo = (i: number) => {
    setIndex(i);
    const target = STATES[DENSITY_ORDER[i]];
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion:reduce)").matches;

    if (reduce) {
      cur.current = target.map((n) => ({ ...n }));
      setNodes(cur.current);
      return;
    }

    if (raf.current) cancelAnimationFrame(raf.current);
    const tick = () => {
      let moving = false;
      cur.current = cur.current.map((n, k) => {
        const t = target[k];
        const next = { ...n };
        (["x", "y", "r"] as const).forEach((key) => {
          const d = t[key] - n[key];
          if (Math.abs(d) > 0.05) moving = true;
          next[key] = n[key] + d * 0.12;
        });
        return next;
      });
      setNodes(cur.current);
      if (moving) raf.current = requestAnimationFrame(tick);
    };
    tick();
  };

  // Auto-advance once on load so the idea reads without interaction.
  useEffect(() => {
    if (!autoAdvance) return;
    const reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    if (reduce) return;
    let i = 0;
    const id = setInterval(() => {
      if (touched.current) {
        clearInterval(id);
        return;
      }
      i += 1;
      if (i > 3) {
        clearInterval(id);
        return;
      }
      goTo(i);
    }, 1500);
    return () => clearInterval(id);
  }, [autoAdvance]);

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const name = DENSITY_ORDER[index];
  const [chunks, meanP, recall, cold] = READ[name];

  return (
    <div className="consol">
      <div className="stage">
        <MarkStageSvg nodes={nodes} goo={5.2} fill="var(--bone)" />
      </div>

      <div className="ctrl">
        <p className="desc">{COPY[name]}</p>
        <div className="states">
          {DENSITY_ORDER.map((d, i) => (
            <button
              key={d}
              type="button"
              className={`st ${i === index ? "on" : ""}`}
              onClick={() => {
                touched.current = true;
                goTo(i);
              }}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="readout">
          chunks&nbsp;<b>{chunks}</b>
          <br />
          mean P(encoded)&nbsp;<b>{meanP}</b>
          <br />
          targeted recall&nbsp;<b>{recall}</b>
          <br />
          cold start&nbsp;<b>{cold}</b>
        </div>
      </div>
    </div>
  );
}
