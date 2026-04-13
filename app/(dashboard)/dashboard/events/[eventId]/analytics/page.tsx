import { eq } from "drizzle-orm";
import { ArrowLeft, CheckCircle, Clock, Users, XCircle } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { attendeeCheckins, events, rsvps } from "@/lib/db/schema";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: { cohosts: { columns: { userId: true } } },
    columns: { id: true, title: true, hostId: true },
  });

  if (!event) notFound();

  const isHost = event.hostId === session.user.id;
  const isCohost = event.cohosts.some((c) => c.userId === session.user.id);

  if (!isHost && !isCohost) notFound();

  const eventRsvps = await db.query.rsvps.findMany({
    where: eq(rsvps.eventId, eventId),
  });

  const checkins = await db.query.attendeeCheckins.findMany({
    where: eq(attendeeCheckins.eventId, eventId),
  });

  const approved = eventRsvps.filter((r) => r.status === "approved").length;
  const pending = eventRsvps.filter((r) => r.status === "pending").length;
  const rejected = eventRsvps.filter((r) => r.status === "rejected").length;
  const checkedIn = checkins.length;
  const checkInRate =
    approved > 0 ? Math.round((checkedIn / approved) * 100) : 0;

  const stats = [
    { title: "Total RSVPs", value: eventRsvps.length, icon: Users },
    { title: "Approved", value: approved, icon: CheckCircle },
    { title: "Pending", value: pending, icon: Clock },
    { title: "Rejected", value: rejected, icon: XCircle },
    { title: "Checked In", value: checkedIn, icon: CheckCircle },
    { title: "Check-in Rate", value: `${checkInRate}%`, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/dashboard/events/${eventId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">{event.title}</p>
        </div>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
