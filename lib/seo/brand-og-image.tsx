import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/seo/brand-mark";
import { OG_SIZE } from "@/lib/seo/event-og-image";

/**
 * Branded 1200×630 card for pages without per-record artwork (landing page,
 * event directory). Matches the visual language of the event card renderer.
 * Callers must run on the Node.js runtime — the background is read from disk.
 */
const background = readFile(join(process.cwd(), "public/og-bg.png"), "base64");

export async function renderBrandOgImage({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}): Promise<ImageResponse> {
  const bgSrc = `data:image/png;base64,${await background}`;

  return new ImageResponse(
    <div
      style={{
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        fontFamily: "sans-serif",
        height: OG_SIZE.height,
        justifyContent: "space-between",
        padding: "72px",
        position: "relative",
        width: OG_SIZE.width,
      }}
    >
      <img
        alt=""
        height={OG_SIZE.height}
        src={bgSrc}
        style={{ left: 0, position: "absolute", top: 0 }}
        width={OG_SIZE.width}
      />

      {/* Left accent bar */}
      <div
        style={{
          background: "#fff",
          borderRadius: "0 4px 4px 0",
          height: 120,
          left: 0,
          position: "absolute",
          top: 72,
          width: 6,
        }}
      />

      <div style={{ alignItems: "center", display: "flex", gap: 16 }}>
        <BrandMark size={64} />
        <span
          style={{
            color: "#fff",
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: -0.5,
          }}
        >
          OpenLuma
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          maxWidth: "85%",
        }}
      >
        <div
          style={{
            color: "#ffffff",
            fontSize: 68,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1.05,
          }}
        >
          {title}
        </div>
        <div style={{ color: "#aaaaaa", fontSize: 28, lineHeight: 1.4 }}>
          {subtitle}
        </div>
      </div>
    </div>,
    { ...OG_SIZE }
  );
}
