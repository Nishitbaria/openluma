import Link from "next/link";
import { Calendar, CalendarCheck, Clock, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, rsvps } from "@/lib/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");

  const now = new Date();

  const [allEvents, upcomingEvents, pendingRsvps] = await Promise.all([
    db.query.events.findMany({
      where: eq(events.hostId, session.user.id),
      columns: { id: true },
    }),
    db.query.events.findMany({
      where: and(
        eq(events.hostId, session.user.id),
        gte(events.startTime, now),
      ),
      orderBy: [desc(events.startTime)],
      limit: 5,
    }),
    db.query.rsvps
      .findMany({
        where: eq(rsvps.status, "pending"),
        with: {
          event: { columns: { hostId: true, title: true } },
          user: { columns: { name: true } },
        },
        orderBy: [desc(rsvps.createdAt)],
        limit: 20,
      })
      .then((r) =>
        r.filter((rsvp) => rsvp.event.hostId === session.user.id),
      ),
  ]);

  const stats = [
    {
      title: "Total Events",
      value: allEvents.length.toString(),
      icon: Calendar,
      description: "Events you've created",
    },
    {
      title: "Upcoming",
      value: upcomingEvents.length.toString(),
      icon: Clock,
      description: "Events happening soon",
    },
    {
      title: "Pending RSVPs",
      value: pendingRsvps.length.toString(),
      icon: CalendarCheck,
      description: "Awaiting your approval",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name}!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
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
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming events.{" "}
                <Link
                  href="/dashboard/events/new"
                  className="text-primary hover:underline"
                >
                  Create one
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/dashboard/events/${event.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(event.startTime),
                          "MMM d 'at' h:mm a",
                        )}
                      </p>
                    </div>
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
              <p className="text-sm text-muted-foreground">
                No pending RSVPs to approve.
              </p>
            ) : (
              <div className="space-y-3">
                {pendingRsvps.slice(0, 5).map((rsvp) => (
                  <div
                    key={rsvp.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-medium">{rsvp.user.name}</p>
                      <p className="text-xs text-muted-foreground">
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
