import { and, eq, gte, lt } from "drizzle-orm";
import { Plus } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EventTimeline } from "@/components/events/event-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { eventCohosts, events, rsvps } from "@/lib/db/schema";

export default async function EventsPage() {
  const session = await getSession(await headers());
  if (!session?.user) redirect("/sign-in");

  const now = new Date();

  const [upcomingEvents, pastEvents, attendingRsvps, cohostingRows] =
    await Promise.all([
      db.query.events.findMany({
        where: and(
          eq(events.hostId, session.user.id),
          gte(events.startTime, now),
        ),
        with: {
          host: { columns: { id: true, name: true, image: true } },
          rsvps: { columns: { id: true } },
        },
        orderBy: (events, { asc }) => [asc(events.startTime)],
      }),
      db.query.events.findMany({
        where: and(
          eq(events.hostId, session.user.id),
          lt(events.startTime, now),
        ),
        with: {
          host: { columns: { id: true, name: true, image: true } },
          rsvps: { columns: { id: true } },
        },
        orderBy: (events, { desc }) => [desc(events.startTime)],
      }),
      db.query.rsvps.findMany({
        where: eq(rsvps.userId, session.user.id),
        with: {
          event: {
            with: {
              host: { columns: { id: true, name: true, image: true } },
              rsvps: { columns: { id: true } },
            },
          },
        },
      }),
      db.query.eventCohosts.findMany({
        where: eq(eventCohosts.userId, session.user.id),
        with: {
          event: {
            with: {
              host: { columns: { id: true, name: true, image: true } },
              rsvps: { columns: { id: true } },
            },
          },
        },
      }),
    ]);

  const cohostingEvents = cohostingRows
    .map((r) => r.event)
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  const cohostEventIds = new Set(cohostingEvents.map((e) => e.id));

  const attendingEvents = attendingRsvps
    .filter(
      (r) =>
        r.event.hostId !== session.user.id && !cohostEventIds.has(r.event.id),
    )
    .map((r) => ({ ...r.event, rsvpStatus: r.status }))
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Events</h1>
        <Button asChild>
          <Link href="/dashboard/events/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming
            <Badge variant="secondary" className="ml-1.5 px-1.5 text-xs">
              {upcomingEvents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="past">
            Past
            <Badge variant="secondary" className="ml-1.5 px-1.5 text-xs">
              {pastEvents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="cohosting">
            Co-hosting
            <Badge variant="secondary" className="ml-1.5 px-1.5 text-xs">
              {cohostingEvents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="attending">
            Attending
            <Badge variant="secondary" className="ml-1.5 px-1.5 text-xs">
              {attendingEvents.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <EventTimeline
            events={upcomingEvents}
            href={(e) => `/dashboard/events/${e.id}`}
            emptyTitle="No upcoming events"
            emptyDescription="Create your first event to get started."
            emptyAction={
              <Button asChild className="mt-4">
                <Link href="/dashboard/events/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Event
                </Link>
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          <EventTimeline
            events={pastEvents}
            href={(e) => `/dashboard/events/${e.id}`}
            emptyTitle="No past events"
            emptyDescription="Events you've hosted will appear here."
          />
        </TabsContent>

        <TabsContent value="cohosting" className="mt-6">
          <EventTimeline
            events={cohostingEvents}
            href={(e) => `/dashboard/events/${e.id}`}
            emptyTitle="No co-hosted events"
            emptyDescription="Events where you're a co-host will appear here."
          />
        </TabsContent>

        <TabsContent value="attending" className="mt-6">
          <EventTimeline
            events={attendingEvents}
            href={(e) => (e.slug ? `/e/${e.slug}` : `/events/${e.id}`)}
            emptyTitle="No events attended"
            emptyDescription="Events you've RSVP'd to will appear here."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
