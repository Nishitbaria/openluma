import { format } from "date-fns";
import { and, desc, eq, gte } from "drizzle-orm";
import { Calendar, CalendarCheck, Clock, ShieldCheck } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { eventCohosts, events, rsvps } from "@/lib/db/schema";

export default async function DashboardPage() {
  const session = await getSession(await headers());
  if (!session?.user) {
    redirect("/sign-in");
  }

  const now = new Date();

  const [allEvents, upcomingEvents, pendingRsvps, cohostingRows] =
    await Promise.all([
      db.query.events.findMany({
        columns: { id: true },
        where: eq(events.hostId, session.user.id),
      }),
      db.query.events.findMany({
        limit: 5,
        orderBy: [desc(events.startTime)],
        where: and(
          eq(events.hostId, session.user.id),
          gte(events.startTime, now)
        ),
      }),
      db.query.rsvps
        .findMany({
          limit: 20,
          orderBy: [desc(rsvps.createdAt)],
          where: eq(rsvps.status, "pending"),
          with: {
            event: {
              columns: { hostId: true, title: true },
              with: { cohosts: { columns: { userId: true } } },
            },
            user: { columns: { name: true } },
          },
        })
        .then((r) =>
          r.filter(
            (rsvp) =>
              rsvp.event.hostId === session.user.id ||
              rsvp.event.cohosts.some((c) => c.userId === session.user.id)
          )
        ),
      db.query.eventCohosts.findMany({
        where: eq(eventCohosts.userId, session.user.id),
        with: { event: true },
      }),
    ]);

  const cohostingEvents = cohostingRows.map((r) => r.event);
  const upcomingCohosted = cohostingEvents.filter(
    (e) => new Date(e.startTime) >= now
  );

  // Merge hosted + cohosted upcoming, sort by start time, take 5
  const allUpcoming = [
    ...upcomingEvents.map((e) => ({ ...e, isCohost: false })),
    ...upcomingCohosted.map((e) => ({ ...e, isCohost: true })),
  ]
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
    .slice(0, 5);

  const stats = [
    {
      description: "Events you host or co-host",
      icon: Calendar,
      title: "Total Events",
      value: (allEvents.length + cohostingEvents.length).toString(),
    },
    {
      description: "Events happening soon",
      icon: Clock,
      title: "Upcoming",
      value: (upcomingEvents.length + upcomingCohosted.length).toString(),
    },
    {
      description: "Awaiting your approval",
      icon: CalendarCheck,
      title: "Pending RSVPs",
      value: pendingRsvps.length.toString(),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name}!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{stat.value}</div>
              <p className="text-muted-foreground text-xs">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {allUpcoming.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No upcoming events.{" "}
                <Link
                  className="text-primary hover:underline"
                  href="/dashboard/events/new"
                >
                  Create one
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {allUpcoming.map((event) => (
                  <Link
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                    href={`/dashboard/events/${event.id}`}
                    key={event.id}
                  >
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {format(
                            new Date(event.startTime),
                            "MMM d 'at' h:mm a"
                          )}
                        </p>
                      </div>
                    </div>
                    {event.isCohost ? (
                      <Badge className="shrink-0" variant="outline">
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Co-host
                      </Badge>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRsvps.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No pending RSVPs to approve.
              </p>
            ) : (
              <div className="space-y-3">
                {pendingRsvps.slice(0, 5).map((rsvp) => (
                  <div
                    className="flex items-center justify-between text-sm"
                    key={rsvp.id}
                  >
                    <div>
                      <p className="font-medium">{rsvp.user.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {rsvp.event.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
