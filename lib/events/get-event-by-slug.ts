import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

/**
 * Loads a public event page's full record by slug, memoised per request.
 *
 * `generateMetadata` and the page body both need this row; React's `cache()`
 * collapses them into a single query instead of two round trips per render.
 */
export const getEventBySlug = cache(async (slug: string) =>
  db.query.events.findFirst({
    where: eq(events.slug, slug),
    with: {
      category: true,
      host: { columns: { id: true, image: true, name: true } },
      rsvps: {
        columns: { id: true, status: true },
        with: { user: { columns: { id: true, image: true, name: true } } },
      },
      tags: true,
    },
  })
);

export type EventBySlug = NonNullable<
  Awaited<ReturnType<typeof getEventBySlug>>
>;
