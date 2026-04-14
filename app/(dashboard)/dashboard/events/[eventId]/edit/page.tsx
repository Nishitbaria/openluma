import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { EventForm } from "@/components/events/event-form";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

export default async function EditEventPage({
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
  });

  if (!event) {
    notFound();
  }

  const isHost = event.hostId === session.user.id;
  const isCohost = event.cohosts.some((c) => c.userId === session.user.id);

  if (!isHost && !isCohost) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Event</h1>
        <p className="text-muted-foreground">Update your event details.</p>
      </div>
      <EventForm
        event={{
          id: event.id,
          title: event.title,
          description: event.description,
          coverImage: event.coverImage,
          startTime: Number.isFinite(event.startTime.getTime()) ? event.startTime.toISOString() : new Date().toISOString(),
          endTime: event.endTime && Number.isFinite(event.endTime.getTime()) ? event.endTime.toISOString() : null,
          timezone: event.timezone,
          location: event.location,
          locationDetails: event.locationDetails,
          type: event.type,
          visibility: event.visibility,
          capacity: event.capacity,
          requiresApproval: event.requiresApproval,
          categoryId: event.categoryId,
          slug: event.slug,
          richDescription: event.richDescription,
        }}
      />
    </div>
  );
}
