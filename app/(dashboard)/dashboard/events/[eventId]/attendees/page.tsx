import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { events, rsvps, invitations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { AttendeeList } from "@/components/events/attendee-list";
import { InviteForm } from "@/components/events/invite-form";

export default async function AttendeesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    columns: { id: true, title: true, hostId: true },
  });

  if (!event) notFound();

  const isHost = event.hostId === session?.user?.id;

  const [attendees, eventInvitations] = await Promise.all([
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

      {isHost && <InviteForm eventId={eventId} />}

      <AttendeeList
        attendees={attendees.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
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
