import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq, and, ilike, desc, gte } from "drizzle-orm";
import { EventCard } from "@/components/events/event-card";
import { EventFilters } from "@/components/events/event-filters";

export default async function PublicEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string }>;
}) {
  const params = await searchParams;

  const conditions = [eq(events.visibility, "public")];

  if (params.search) {
    conditions.push(ilike(events.title, `%${params.search}%`));
  }

  if (params.type && params.type !== "all") {
    conditions.push(
      eq(events.type, params.type as "in_person" | "virtual" | "hybrid"),
    );
  }

  const publicEvents = await db.query.events.findMany({
    where: and(...conditions),
    with: {
      host: { columns: { id: true, name: true, image: true } },
      rsvps: { columns: { id: true } },
    },
    orderBy: [desc(events.startTime)],
    limit: 30,
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Discover Events</h1>
        <p className="text-muted-foreground">
          Browse upcoming public events in the community.
        </p>
      </div>

      <div className="mb-8">
        <EventFilters />
      </div>

      {publicEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-muted-foreground">
            {params.search
              ? `No events found for "${params.search}".`
              : "No public events yet. Be the first to create one!"}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {publicEvents.map((event) => (
            <EventCard
              key={event.id}
              event={{
                ...event,
                _count: { rsvps: event.rsvps.length },
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
