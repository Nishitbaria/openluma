import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";
import { getAppUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { redis } from "@/lib/redis";

/**
 * Renders the 1200×630 social card for an event.
 *
 * Shared by the `opengraph-image` file convention on `/e/[slug]` and the legacy
 * `/api/og?slug=` route, which stays alive so previews already cached by social
 * platforms keep resolving.
 */

export const OG_SIZE = { height: 630, width: 1200 };
export const OG_CONTENT_TYPE = "image/png";

const CACHE_TTL = 60 * 60; // 1 hour

interface OGEventData {
  coverImage: string | null;
  description: string | null;
  hostName: string;
  location: string | null;
  startTime: string;
  title: string;
}

async function getEventData(slug: string): Promise<OGEventData | null> {
  const cacheKey = `og:event:${slug}`;

  // Redis is a nice-to-have here. If Upstash is unreachable, fall through to
  // the database rather than 500 — an unrendered social card is a far worse
  // outcome than an uncached one.
  if (redis) {
    try {
      const cached = await redis.get<OGEventData>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch {
      // Ignore and read through to Postgres.
    }
  }

  const event = await db.query.events.findFirst({
    columns: {
      coverImage: true,
      description: true,
      location: true,
      startTime: true,
      title: true,
      visibility: true,
    },
    where: eq(events.slug, slug),
    with: {
      host: { columns: { name: true } },
    },
  });

  if (!event || event.visibility === "private") {
    return null;
  }

  // Satori rejects relative `src` values, and preset covers are bundled paths
  // like `/presets/abstract-1.svg`. Absolutise before caching so both the
  // cached and uncached paths carry a fetchable URL.
  const coverImage = event.coverImage?.startsWith("/")
    ? `${getAppUrl()}${event.coverImage}`
    : event.coverImage;

  const data: OGEventData = {
    coverImage,
    description: event.description,
    hostName: event.host.name,
    location: event.location,
    startTime: event.startTime.toISOString(),
    title: event.title,
  };

  if (redis) {
    try {
      await redis.set(cacheKey, data, { ex: CACHE_TTL });
    } catch {
      // Caching is best-effort; still serve the image.
    }
  }

  return data;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    weekday: "short",
    year: "numeric",
  });
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function metaRow(icon: string, text: string) {
  return (
    <div style={{ alignItems: "center", display: "flex", gap: 10 }}>
      <div
        style={{
          alignItems: "center",
          background: "rgba(255,255,255,0.1)",
          borderRadius: 8,
          display: "flex",
          fontSize: 18,
          height: 36,
          justifyContent: "center",
          width: 36,
        }}
      >
        {icon}
      </div>
      <span style={{ color: "#e0e0e0", fontSize: 22, fontWeight: 500 }}>
        {text}
      </span>
    </div>
  );
}

/** Branded fallback used for missing, private, or slug-less requests. */
export function renderFallbackOgImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "sans-serif",
        height: OG_SIZE.height,
        justifyContent: "center",
        width: OG_SIZE.width,
      }}
    >
      <div style={{ color: "#fff", fontSize: 48, fontWeight: 700 }}>
        OpenLuma
      </div>
      <div style={{ color: "#888", fontSize: 24, marginTop: 16 }}>
        Open-source event management
      </div>
    </div>,
    { ...OG_SIZE }
  );
}

export async function renderEventOgImage(slug: string): Promise<ImageResponse> {
  const event = await getEventData(slug);

  if (!event) {
    return renderFallbackOgImage();
  }

  const hasCover = !!event.coverImage;

  return new ImageResponse(
    <div
      style={{
        background: "#0f0f0f",
        display: "flex",
        fontFamily: "sans-serif",
        height: OG_SIZE.height,
        position: "relative",
        width: OG_SIZE.width,
      }}
    >
      {hasCover && (
        <img
          alt=""
          height={OG_SIZE.height}
          src={event.coverImage ?? ""}
          style={{
            height: "100%",
            left: 0,
            objectFit: "cover",
            opacity: 0.25,
            position: "absolute",
            top: 0,
            width: "100%",
          }}
          width={OG_SIZE.width}
        />
      )}

      {/* Dark overlay gradient */}
      <div
        style={{
          background: hasCover
            ? "linear-gradient(to right, rgba(0,0,0,0.92) 55%, rgba(0,0,0,0.5) 100%)"
            : "linear-gradient(135deg, #0f0f0f 0%, #1c1c1c 100%)",
          display: "flex",
          height: "100%",
          left: 0,
          position: "absolute",
          top: 0,
          width: "100%",
        }}
      />

      {/* Left accent bar */}
      <div
        style={{
          background: "#fff",
          borderRadius: "0 4px 4px 0",
          height: 120,
          left: 0,
          position: "absolute",
          top: 60,
          width: 6,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "60px 72px",
          position: "relative",
          width: "100%",
        }}
      >
        {/* Brand */}
        <div style={{ alignItems: "center", display: "flex", gap: 10 }}>
          <div
            style={{
              alignItems: "center",
              background: "#fff",
              borderRadius: 8,
              color: "#000",
              display: "flex",
              fontSize: 18,
              fontWeight: 900,
              height: 36,
              justifyContent: "center",
              width: 36,
            }}
          >
            O
          </div>
          <span
            style={{
              color: "#fff",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}
          >
            OpenLuma
          </span>
        </div>

        {/* Title + description */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxWidth: hasCover ? "62%" : "80%",
          }}
        >
          <div
            style={{
              color: "#ffffff",
              fontSize: event.title.length > 40 ? 52 : 64,
              fontWeight: 800,
              letterSpacing: -1.5,
              lineHeight: 1.1,
            }}
          >
            {event.title}
          </div>

          {event.description ? (
            // One interpolated string, not two nodes: Satori rejects a
            // multi-child element without an explicit `display`, and the
            // 120-char truncation already does the clamping.
            <div
              style={{
                color: "#aaaaaa",
                fontSize: 22,
                lineHeight: 1.4,
                overflow: "hidden",
              }}
            >
              {truncate(event.description, 120)}
            </div>
          ) : null}
        </div>

        {/* Meta */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {metaRow("📅", formatDate(event.startTime))}
          {event.location ? metaRow("📍", truncate(event.location, 60)) : null}
          {metaRow("👤", `Hosted by ${event.hostName}`)}
        </div>
      </div>

      {/* Cover preview */}
      {hasCover && (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 20,
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            display: "flex",
            height: 510,
            overflow: "hidden",
            position: "absolute",
            right: 72,
            top: 60,
            width: 380,
          }}
        >
          <img
            alt=""
            height={510}
            src={event.coverImage ?? ""}
            style={{ height: "100%", objectFit: "cover", width: "100%" }}
            width={380}
          />
        </div>
      )}
    </div>,
    { ...OG_SIZE }
  );
}
