import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
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

  // Try Redis cache first
  if (redis) {
    const cached = await redis.get<OGEventData>(cacheKey);
    if (cached) {
      return cached;
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

  const data: OGEventData = {
    coverImage: event.coverImage,
    description: event.description,
    hostName: event.host.name,
    location: event.location,
    startTime: event.startTime.toISOString(),
    title: event.title,
  };

  if (redis) {
    await redis.set(cacheKey, data, { ex: CACHE_TTL });
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

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");

  if (!slug) {
    return new Response("Missing slug", { status: 400 });
  }

  const event = await getEventData(slug);

  if (!event) {
    // Fallback OG image for not-found or private events
    return new ImageResponse(
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "sans-serif",
          height: OG_HEIGHT,
          justifyContent: "center",
          width: OG_WIDTH,
        }}
      >
        <div style={{ color: "#fff", fontSize: 48, fontWeight: 700 }}>
          OpenLuma
        </div>
        <div style={{ color: "#888", fontSize: 24, marginTop: 16 }}>
          Open-source event management
        </div>
      </div>,
      { height: OG_HEIGHT, width: OG_WIDTH }
    );
  }

  const hasCover = !!event.coverImage;

  return new ImageResponse(
    <div
      style={{
        background: "#0f0f0f",
        display: "flex",
        fontFamily: "sans-serif",
        height: OG_HEIGHT,
        position: "relative",
        width: OG_WIDTH,
      }}
    >
      {/* Cover image background */}
      {hasCover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          height={OG_HEIGHT}
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
          width={OG_WIDTH}
        />
      )}

      {/* Dark overlay gradient */}
      <div
        style={{
          background: hasCover
            ? "linear-gradient(to right, rgba(0,0,0,0.92) 55%, rgba(0,0,0,0.5) 100%)"
            : "linear-gradient(135deg, #0f0f0f 0%, #1c1c1c 100%)",
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

      {/* Content */}
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
        {/* Top: OpenLuma brand */}
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 10,
          }}
        >
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

        {/* Middle: event title */}
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
            <div
              style={{
                color: "#aaaaaa",
                display: "-webkit-box",
                fontSize: 22,
                lineHeight: 1.4,
                overflow: "hidden",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
              }}
            >
              {event.description.slice(0, 120)}
              {event.description.length > 120 ? "…" : ""}
            </div>
          ) : null}
        </div>

        {/* Bottom: meta info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Date row */}
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: 10,
            }}
          >
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
              📅
            </div>
            <span style={{ color: "#e0e0e0", fontSize: 22, fontWeight: 500 }}>
              {formatDate(event.startTime)}
            </span>
          </div>

          {/* Location row */}
          {event.location ? (
            <div
              style={{
                alignItems: "center",
                display: "flex",
                gap: 10,
              }}
            >
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
                📍
              </div>
              <span style={{ color: "#e0e0e0", fontSize: 22, fontWeight: 500 }}>
                {event.location.slice(0, 60)}
                {event.location.length > 60 ? "…" : ""}
              </span>
            </div>
          ) : null}

          {/* Host row */}
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: 10,
            }}
          >
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
              👤
            </div>
            <span style={{ color: "#e0e0e0", fontSize: 22, fontWeight: 500 }}>
              Hosted by {event.hostName}
            </span>
          </div>
        </div>
      </div>

      {/* Right side: cover image preview (if exists) */}
      {hasCover && (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 20,
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            height: 510,
            overflow: "hidden",
            position: "absolute",
            right: 72,
            top: 60,
            width: 380,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
    { height: OG_HEIGHT, width: OG_WIDTH }
  );
}
