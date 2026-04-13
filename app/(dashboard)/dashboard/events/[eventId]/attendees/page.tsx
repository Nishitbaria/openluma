import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AttendeeList } from "@/components/events/attendee-list";
import { InviteForm } from "@/components/events/invite-form";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { eventCohosts, events, invitations, rsvps } from "@/lib/db/schema";

export default async function AttendeesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const session = await getSession(await headers());
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

  const [attendees, eventInvitations, cohosts] = await Promise.all([
    db.query.rsvps.findMany({
      where: eq(rsvps.eventId, eventId),
      with: {
        user: { columns: { id: true, name: true, email: true, image: true } },
      },
      orderBy: (rsvps, { desc }) => [desc(rsvps.createdAt)],
    }),
    db.query.invitations.findMany({
      where: eq(invitations.eventId, eventId),
      orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
    }),
    db.query.eventCohosts.findMany({
      where: eq(eventCohosts.eventId, eventId),
      with: {
        user: { columns: { id: true, name: true, email: true, image: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/dashboard/events/${eventId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendees</h1>
            <p className="text-muted-foreground">{event.title}</p>
          </div>
        </div>
      </div>

      {(isHost || isCohost) && <InviteForm eventId={eventId} />}

      <AttendeeList
        attendees={attendees.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
        }))}
        cohosts={cohosts.map((c) => ({
          id: c.id,
          userId: c.userId,
          user: c.user,
        }))}
        invitations={eventInvitations.map((inv) => ({
          ...inv,
          createdAt: inv.createdAt.toISOString(),
          expiresAt: inv.expiresAt?.toISOString() ?? null,
        }))}
        eventId={eventId}
        isHost={isHost}
      />
    </div>
  );
}
