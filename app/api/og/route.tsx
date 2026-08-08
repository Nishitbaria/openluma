import type { NextRequest } from "next/server";
import { renderEventOgImage } from "@/lib/seo/event-og-image";

export const runtime = "nodejs";

/**
 * Legacy OG image endpoint.
 *
 * `/e/[slug]` now uses the `opengraph-image` file convention instead, but this
 * route stays so previews already cached by social platforms (and links shared
 * before the migration) keep resolving. It delegates to the same renderer.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");

  if (!slug) {
    return new Response("Missing slug", { status: 400 });
  }

  return await renderEventOgImage(slug);
}
