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

type OGEventData = {
  title: string;
  description: string | null;
  coverImage: string | null;
  startTime: string;
  location: string | null;
  hostName: string;
};

async function getEventData(slug: string): Promise<OGEventData | null> {
  const cacheKey = `og:event:${slug}`;

  // Try Redis cache first
  if (redis) {
    const cached = await redis.get<OGEventData>(cacheKey);
    if (cached) return cached;
  }

  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
    columns: {
      title: true,
      description: true,
      coverImage: true,
      startTime: true,
      location: true,
      visibility: true,
    },
    with: {
      host: { columns: { name: true } },
    },
  });

  if (!event || event.visibility === "private") return null;

  const data: OGEventData = {
    title: event.title,
    description: event.description,
    coverImage: event.coverImage,
    startTime: event.startTime.toISOString(),
    location: event.location,
    hostName: event.host.name,
  };

  if (redis) {
    await redis.set(cacheKey, data, { ex: CACHE_TTL });
  }

  return data;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
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
          width: OG_WIDTH,
          height: OG_HEIGHT,
          background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 48, fontWeight: 700, color: "#fff" }}>
          OpenLuma
        </div>
        <div style={{ fontSize: 24, color: "#888", marginTop: 16 }}>
          Open-source event management
        </div>
      </div>,
      { width: OG_WIDTH, height: OG_HEIGHT },
    );
  }

  const hasCover = !!event.coverImage;

  return new ImageResponse(
    <div
      style={{
        width: OG_WIDTH,
        height: OG_HEIGHT,
        display: "flex",
        fontFamily: "sans-serif",
        position: "relative",
        background: "#0f0f0f",
      }}
    >
      {/* Cover image background */}
      {hasCover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.coverImage ?? ""}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.25,
          }}
        />
      )}

      {/* Dark overlay gradient */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: hasCover
            ? "linear-gradient(to right, rgba(0,0,0,0.92) 55%, rgba(0,0,0,0.5) 100%)"
            : "linear-gradient(135deg, #0f0f0f 0%, #1c1c1c 100%)",
        }}
      />

      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          width: 6,
          height: 120,
          background: "#fff",
          borderRadius: "0 4px 4px 0",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 72px",
          width: "100%",
          height: "100%",
        }}
      >
        {/* Top: OpenLuma brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: "#fff",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 900,
              color: "#000",
            }}
          >
            O
          </div>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
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
              fontSize: event.title.length > 40 ? 52 : 64,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.1,
              letterSpacing: -1.5,
            }}
          >
            {event.title}
          </div>

          {event.description && (
            <div
              style={{
                fontSize: 22,
                color: "#aaaaaa",
                lineHeight: 1.4,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {event.description.slice(0, 120)}
              {event.description.length > 120 ? "…" : ""}
            </div>
          )}
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
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                background: "rgba(255,255,255,0.1)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              📅
            </div>
            <span style={{ fontSize: 22, color: "#e0e0e0", fontWeight: 500 }}>
              {formatDate(event.startTime)}
            </span>
          </div>

          {/* Location row */}
          {event.location && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                📍
              </div>
              <span style={{ fontSize: 22, color: "#e0e0e0", fontWeight: 500 }}>
                {event.location.slice(0, 60)}
                {event.location.length > 60 ? "…" : ""}
              </span>
            </div>
          )}

          {/* Host row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                background: "rgba(255,255,255,0.1)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              👤
            </div>
            <span style={{ fontSize: 22, color: "#e0e0e0", fontWeight: 500 }}>
              Hosted by {event.hostName}
            </span>
          </div>
        </div>
      </div>

      {/* Right side: cover image preview (if exists) */}
      {hasCover && (
        <div
          style={{
            position: "absolute",
            top: 60,
            right: 72,
            width: 380,
            height: 510,
            borderRadius: 20,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.coverImage ?? ""}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}
    </div>,
    { width: OG_WIDTH, height: OG_HEIGHT },
  );
}
