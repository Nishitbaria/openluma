import { eq } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/app-url";
import { events } from "@/lib/db/schema";

// Drizzle queries aren't auto-cached the way `fetch` is, so without this the
// sitemap would re-query on every crawler hit.
export const revalidate = 3600;

interface SitemapEvent {
  host: { id: string; updatedAt: Date };
  slug: string;
  startTime: Date;
  updatedAt: Date;
}

/**
 * This route is prerendered at build time, where the database is often
 * unreachable (CI has no Postgres, and `DATABASE_URL` may be absent entirely).
 * A sitemap missing its dynamic entries for one revalidation window is a far
 * better outcome than a failed deploy, so degrade to the static routes instead
 * of throwing. `lib/db` is imported lazily for the same reason — it throws at
 * module scope without `DATABASE_URL`.
 */
async function getPublicEvents(): Promise<SitemapEvent[]> {
  try {
    const { db } = await import("@/lib/db");

    // Past public events stay indexable — they're still legitimate content,
    // even though the /events directory only lists upcoming ones.
    return await db.query.events.findMany({
      columns: { slug: true, startTime: true, updatedAt: true },
      where: eq(events.visibility, "public"),
      with: { host: { columns: { id: true, updatedAt: true } } },
    });
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl();
  const publicEvents = await getPublicEvents();

  const hosts = new Map<string, Date>();
  for (const event of publicEvents) {
    const existing = hosts.get(event.host.id);
    if (!existing || event.host.updatedAt > existing) {
      hosts.set(event.host.id, event.host.updatedAt);
    }
  }

  const now = new Date();

  return [
    {
      changeFrequency: "weekly",
      lastModified: now,
      priority: 1,
      url: appUrl,
    },
    {
      changeFrequency: "hourly",
      lastModified: now,
      priority: 0.9,
      url: `${appUrl}/events`,
    },
    ...publicEvents.map((event) => ({
      // Upcoming events change often (RSVPs, edits); past ones are frozen.
      changeFrequency: (event.startTime > now ? "daily" : "yearly") as
        | "daily"
        | "yearly",
      lastModified: event.updatedAt,
      priority: event.startTime > now ? 0.8 : 0.4,
      url: `${appUrl}/e/${event.slug}`,
    })),
    ...Array.from(hosts, ([id, updatedAt]) => ({
      changeFrequency: "weekly" as const,
      lastModified: updatedAt,
      priority: 0.5,
      url: `${appUrl}/u/${id}`,
    })),
  ];
}
