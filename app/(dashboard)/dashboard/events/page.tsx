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
  if (!session?.user) {
    redirect("/sign-in");
  }

  const now = new Date();

  const [upcomingEvents, pastEvents, attendingRsvps, cohostingRows] =
    await Promise.all([
      db.query.events.findMany({
        orderBy: (eventRows, { asc }) => [asc(eventRows.startTime)],
        where: and(
          eq(events.hostId, session.user.id),
          gte(events.startTime, now)
        ),
        with: {
          host: { columns: { id: true, image: true, name: true } },
          rsvps: { columns: { id: true } },
        },
      }),
      db.query.events.findMany({
        orderBy: (eventRows, { desc }) => [desc(eventRows.startTime)],
        where: and(
          eq(events.hostId, session.user.id),
          lt(events.startTime, now)
        ),
        with: {
          host: { columns: { id: true, image: true, name: true } },
          rsvps: { columns: { id: true } },
        },
      }),
      db.query.rsvps.findMany({
        where: eq(rsvps.userId, session.user.id),
        with: {
          event: {
            with: {
              host: { columns: { id: true, image: true, name: true } },
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
              host: { columns: { id: true, image: true, name: true } },
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
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  const cohostEventIds = new Set(cohostingEvents.map((e) => e.id));

  const attendingEvents = attendingRsvps
    .filter(
      (r) =>
        r.event.hostId !== session.user.id && !cohostEventIds.has(r.event.id)
    )
    .map((r) => ({ ...r.event, rsvpStatus: r.status }))
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-3xl tracking-tight">Events</h1>
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
            <Badge className="ml-1.5 px-1.5 text-xs" variant="secondary">
              {upcomingEvents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="past">
            Past
            <Badge className="ml-1.5 px-1.5 text-xs" variant="secondary">
              {pastEvents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="cohosting">
            Co-hosting
            <Badge className="ml-1.5 px-1.5 text-xs" variant="secondary">
              {cohostingEvents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="attending">
            Attending
            <Badge className="ml-1.5 px-1.5 text-xs" variant="secondary">
              {attendingEvents.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-6" value="upcoming">
          <EventTimeline
            emptyAction={
              <Button asChild className="mt-4">
                <Link href="/dashboard/events/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Event
                </Link>
              </Button>
            }
            emptyDescription="Create your first event to get started."
            emptyTitle="No upcoming events"
            events={upcomingEvents}
            href={(e) => `/dashboard/events/${e.id}`}
          />
        </TabsContent>

        <TabsContent className="mt-6" value="past">
          <EventTimeline
            emptyDescription="Events you've hosted will appear here."
            emptyTitle="No past events"
            events={pastEvents}
            href={(e) => `/dashboard/events/${e.id}`}
          />
        </TabsContent>

        <TabsContent className="mt-6" value="cohosting">
          <EventTimeline
            emptyDescription="Events where you're a co-host will appear here."
            emptyTitle="No co-hosted events"
            events={cohostingEvents}
            href={(e) => `/dashboard/events/${e.id}`}
          />
        </TabsContent>

        <TabsContent className="mt-6" value="attending">
          <EventTimeline
            emptyDescription="Events you've RSVP'd to will appear here."
            emptyTitle="No events attended"
            events={attendingEvents}
            href={(e) => (e.slug ? `/e/${e.slug}` : `/events/${e.id}`)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
