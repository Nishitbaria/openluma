/**
 * The OpenLuma mark, as plain inline-styled JSX.
 *
 * Rendered by Satori inside `next/og` `ImageResponse` (favicon, apple icon, OG
 * images), so it must avoid Tailwind classes and anything outside Satori's
 * supported CSS subset — inline styles and flexbox only.
 *
 * `public/icon.svg` is a hand-maintained copy of this same geometry for the
 * manifest and SVG favicon; update both together if the logo changes.
 */
export function BrandMark({ size, radius }: { size: number; radius?: number }) {
  const glyph = Math.round(size * 0.56);

  return (
    <div
      style={{
        alignItems: "center",
        background: "#000000",
        borderRadius: radius ?? Math.round(size * 0.22),
        display: "flex",
        height: size,
        justifyContent: "center",
        width: size,
      }}
    >
      <svg fill="none" height={glyph} viewBox="0 0 24 24" width={glyph}>
        <title>OpenLuma</title>
        <path
          d="M7 7v8h6"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        <circle cx="18" cy="6" fill="white" opacity="0.4" r="2.5" />
      </svg>
    </div>
  );
}
