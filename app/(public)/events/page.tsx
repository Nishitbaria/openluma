import { formatInTimeZone } from "date-fns-tz";
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

function dayLabel(date: Date, timezone: string) {
  const now = new Date();
  const dateKey = formatInTimeZone(date, timezone, "yyyy-MM-dd");
  const todayKey = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const tomorrowKey = formatInTimeZone(
    new Date(now.getTime() + 24 * 60 * 60 * 1000),
    timezone,
    "yyyy-MM-dd"
  );
  if (dateKey === todayKey) {
    return "Today";
  }
  if (dateKey === tomorrowKey) {
    return "Tomorrow";
  }
  return formatInTimeZone(date, timezone, "EEEE, MMMM d");
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
      eq(events.type, params.type as "in_person" | "virtual" | "hybrid")
    );
  }

  const publicEvents = await db.query.events.findMany({
    limit: 30,
    orderBy: [asc(events.startTime)],
    where: and(...conditions),
    with: {
      host: { columns: { id: true, image: true, name: true } },
      rsvps: { columns: { id: true } },
    },
  });

  const groupsByKey = new Map<
    string,
    { key: string; label: string; items: typeof publicEvents }
  >();

  for (const event of publicEvents) {
    const startTime =
      typeof event.startTime === "string"
        ? new Date(event.startTime)
        : event.startTime;
    const dateKey = formatInTimeZone(startTime, event.timezone, "yyyy-MM-dd");
    const key = `${event.timezone}|${dateKey}`;
    const existing = groupsByKey.get(key);
    if (existing) {
      existing.items.push(event);
    } else {
      groupsByKey.set(key, {
        items: [event],
        key,
        label: dayLabel(startTime, event.timezone),
      });
    }
  }

  const groups = [...groupsByKey.values()];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-bold text-3xl tracking-tight">Discover Events</h1>
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
              <h2 className="mb-4 font-semibold text-xl tracking-tight">
                {group.label}
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((event) => (
                  <EventCard
                    event={{
                      ...event,
                      _count: { rsvps: event.rsvps.length },
                    }}
                    key={event.id}
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
