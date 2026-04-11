import Link from "next/link";
import { Plus, Calendar } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, rsvps } from "@/lib/db/schema";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventCard } from "@/components/events/event-card";

export default async function EventsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");

  const now = new Date();

  const [upcomingEvents, pastEvents, attendingRsvps] = await Promise.all([
    db.query.events.findMany({
      where: and(eq(events.hostId, session.user.id), gte(events.startTime, now)),
      with: {
        host: { columns: { id: true, name: true, image: true } },
        rsvps: { columns: { id: true } },
      },
      orderBy: [desc(events.startTime)],
    }),
    db.query.events.findMany({
      where: and(eq(events.hostId, session.user.id), lt(events.startTime, now)),
      with: {
        host: { columns: { id: true, name: true, image: true } },
        rsvps: { columns: { id: true } },
      },
      orderBy: [desc(events.startTime)],
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
      orderBy: [desc(rsvps.createdAt)],
    }),
  ]);

  const attendingEvents = attendingRsvps
    .filter((r) => r.event.hostId !== session.user.id)
    .map((r) => r.event);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Events</h1>
          <p className="text-muted-foreground">
            Manage your created and attended events.
          </p>
        </div>
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
            Upcoming ({upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="past">Past ({pastEvents.length})</TabsTrigger>
          <TabsTrigger value="attending">
            Attending ({attendingEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {upcomingEvents.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={{ ...event, _count: { rsvps: event.rsvps.length } }}
                  href={`/dashboard/events/${event.id}`}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {pastEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
              <p className="text-sm text-muted-foreground">No past events.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pastEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={{ ...event, _count: { rsvps: event.rsvps.length } }}
                  href={`/dashboard/events/${event.id}`}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attending" className="mt-6">
          {attendingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
              <p className="text-sm text-muted-foreground">
                You haven&apos;t RSVP&apos;d to any events yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {attendingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={{ ...event, _count: { rsvps: event.rsvps.length } }}
                  href={`/dashboard/events/${event.id}`}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
      <Calendar className="h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">No upcoming events</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Create your first event to get started.
      </p>
      <Button asChild className="mt-4">
        <Link href="/dashboard/events/new">
          <Plus className="mr-2 h-4 w-4" />
          Create Event
        </Link>
      </Button>
    </div>
  );
}
