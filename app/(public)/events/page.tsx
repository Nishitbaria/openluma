import { format, isToday, isTomorrow } from "date-fns";
import { and, asc, eq, gte, ilike } from "drizzle-orm";
import { CalendarX } from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import { EventFilters } from "@/components/events/event-filters";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

function dayLabel(date: Date) {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMMM d");
}

export default async function PublicEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string }>;
}) {
  const params = await searchParams;

  const conditions = [
    eq(events.visibility, "public"),
    gte(events.startTime, new Date()),
  ];

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
    orderBy: [asc(events.startTime)],
    limit: 30,
  });

  const groups: { key: string; label: string; items: typeof publicEvents }[] =
    [];

  for (const event of publicEvents) {
    const startTime =
      typeof event.startTime === "string"
        ? new Date(event.startTime)
        : event.startTime;
    const key = format(startTime, "yyyy-MM-dd");
    const lastGroup = groups.at(-1);
    if (lastGroup?.key === key) {
      lastGroup.items.push(event);
    } else {
      groups.push({ key, label: dayLabel(startTime), items: [event] });
    }
  }

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
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarX />
            </EmptyMedia>
            <EmptyTitle>No events found</EmptyTitle>
            <EmptyDescription>
              {params.search
                ? `No upcoming events found for "${params.search}".`
                : "No public events yet. Be the first to create one!"}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <div key={group.key}>
              <h2 className="mb-4 text-xl font-semibold tracking-tight">
                {group.label}
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((event) => (
                  <EventCard
                    key={event.id}
                    event={{
                      ...event,
                      _count: { rsvps: event.rsvps.length },
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
