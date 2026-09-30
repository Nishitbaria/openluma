/**
 * The OpenLuma mark, as plain inline-styled JSX.
 *
 * Rendered by Satori inside `next/og` `ImageResponse` (favicon, apple icon, OG
 * images), so it must avoid Tailwind classes and anything outside Satori's
 * supported CSS subset — inline styles and flexbox only.
 *
 * Geometry sits on a 16×16 pixel grid: a 2-unit-thick L inside the centred
 * 8×8 area, plus one dimmed pixel top-right. `public/icon.svg` is a
 * hand-maintained copy of this same geometry for the manifest and SVG favicon;
 * update both together if the logo changes.
 */
export function BrandMark({ size, radius }: { size: number; radius?: number }) {
  return (
    <div
      style={{
        background: "#000000",
        borderRadius: radius ?? Math.round(size * 0.22),
        display: "flex",
        height: size,
        width: size,
      }}
    >
      {/* No <title>: Satori draws it as visible text over the glyph. */}
      <svg
        aria-hidden="true"
        fill="white"
        height={size}
        shapeRendering="crispEdges"
        viewBox="0 0 16 16"
        width={size}
      >
        <path d="M4 4h2v6h6v2H4z" />
        <rect height="1" opacity="0.4" width="1" x="11" y="4" />
      </svg>
    </div>
  );
}
