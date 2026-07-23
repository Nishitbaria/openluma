import { eq } from "drizzle-orm";
import { ArrowLeft, CheckCircle, Clock, Users, XCircle } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { attendeeCheckins, events, rsvps } from "@/lib/db/schema";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const [{ eventId }, session] = await Promise.all([
    params,
    getSession(await headers()),
  ]);
  if (!session?.user) {
    redirect("/sign-in");
  }

  const event = await db.query.events.findFirst({
    columns: { hostId: true, id: true, title: true },
    where: eq(events.id, eventId),
    with: { cohosts: { columns: { userId: true } } },
  });

  if (!event) {
    notFound();
  }

  const isHost = event.hostId === session.user.id;
  const isCohost = event.cohosts.some((c) => c.userId === session.user.id);

  if (!(isHost || isCohost)) {
    notFound();
  }

  const [eventRsvps, checkins] = await Promise.all([
    db.query.rsvps.findMany({ where: eq(rsvps.eventId, eventId) }),
    db.query.attendeeCheckins.findMany({
      where: eq(attendeeCheckins.eventId, eventId),
    }),
  ]);

  const counts = { approved: 0, pending: 0, rejected: 0 };
  for (const r of eventRsvps) {
    if (r.status in counts) {
      counts[r.status as keyof typeof counts] += 1;
    }
  }
  const { approved, pending, rejected } = counts;
  const checkedIn = checkins.length;
  const checkInRate =
    approved > 0 ? Math.round((checkedIn / approved) * 100) : 0;

  const stats = [
    { icon: Users, title: "Total RSVPs", value: eventRsvps.length },
    { icon: CheckCircle, title: "Approved", value: approved },
    { icon: Clock, title: "Pending", value: pending },
    { icon: XCircle, title: "Rejected", value: rejected },
    { icon: CheckCircle, title: "Checked In", value: checkedIn },
    { icon: Users, title: "Check-in Rate", value: `${checkInRate}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild size="icon" variant="ghost">
          <Link href={`/dashboard/events/${eventId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">{event.title}</p>
        </div>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
