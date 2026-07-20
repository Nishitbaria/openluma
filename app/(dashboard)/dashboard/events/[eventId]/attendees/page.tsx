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
import {
  eventCohosts,
  eventQuestions,
  events,
  invitations,
  rsvps,
} from "@/lib/db/schema";

export default async function AttendeesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const session = await getSession(await headers());
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

  const [attendees, eventInvitations, cohosts, questions] = await Promise.all([
    db.query.rsvps.findMany({
      orderBy: (rsvpRows, { desc }) => [desc(rsvpRows.createdAt)],
      where: eq(rsvps.eventId, eventId),
      with: {
        timeline: { orderBy: (t, { desc }) => [desc(t.createdAt)] },
        user: { columns: { email: true, id: true, image: true, name: true } },
      },
    }),
    db.query.invitations.findMany({
      orderBy: (invitationRows, { desc }) => [desc(invitationRows.createdAt)],
      where: eq(invitations.eventId, eventId),
    }),
    db.query.eventCohosts.findMany({
      where: eq(eventCohosts.eventId, eventId),
      with: {
        user: { columns: { email: true, id: true, image: true, name: true } },
      },
    }),
    db.query.eventQuestions.findMany({
      columns: { id: true, label: true, type: true },
      orderBy: (q, { asc }) => [asc(q.order)],
      where: eq(eventQuestions.eventId, eventId),
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild size="icon" variant="ghost">
            <Link href={`/dashboard/events/${eventId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-bold text-3xl tracking-tight">Attendees</h1>
            <p className="text-muted-foreground">{event.title}</p>
          </div>
        </div>
      </div>

      {isHost || isCohost ? <InviteForm eventId={eventId} /> : null}

      <AttendeeList
        attendees={attendees.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
          timeline: a.timeline.map((t) => ({
            ...t,
            createdAt: t.createdAt.toISOString(),
          })),
        }))}
        cohosts={cohosts.map((c) => ({
          id: c.id,
          user: c.user,
          userId: c.userId,
        }))}
        eventId={eventId}
        invitations={eventInvitations.map((inv) => ({
          ...inv,
          createdAt: inv.createdAt.toISOString(),
          expiresAt: inv.expiresAt?.toISOString() ?? null,
        }))}
        isHost={isHost}
        questions={questions}
      />
    </div>
  );
}
