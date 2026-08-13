/**
 * Grain overlay — kills the clean-digital tell. Signature element; fixed,
 * multiply-blended, non-interactive. Ported from the identity page, with the
 * noise SVG built at module scope so it is server-rendered rather than injected.
 */
const GRAIN_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="n">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" stitchTiles="stitch"/>` +
    `<feColorMatrix type="saturate" values="0"/></filter>` +
    `<rect width="160" height="160" filter="url(#n)" opacity="0.34"/></svg>`,
);

export function Grain() {
  return (
    <div
      className="grain"
      aria-hidden="true"
      style={{ backgroundImage: `url("data:image/svg+xml,${GRAIN_SVG}")` }}
    />
  );
}
