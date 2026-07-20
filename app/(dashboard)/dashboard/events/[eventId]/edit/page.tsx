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
  if (!session?.user) {
    redirect("/sign-in");
  }

  const event = await db.query.events.findFirst({
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Edit Event</h1>
        <p className="text-muted-foreground">Update your event details.</p>
      </div>
      <EventForm
        event={{
          capacity: event.capacity,
          categoryId: event.categoryId,
          coverImage: event.coverImage,
          description: event.description,
          endTime:
            event.endTime && Number.isFinite(event.endTime.getTime())
              ? event.endTime.toISOString()
              : null,
          id: event.id,
          location: event.location,
          locationDetails: event.locationDetails,
          requiresApproval: event.requiresApproval,
          richDescription: event.richDescription,
          slug: event.slug,
          startTime: Number.isFinite(event.startTime.getTime())
            ? event.startTime.toISOString()
            : new Date().toISOString(),
          timezone: event.timezone,
          title: event.title,
          type: event.type,
          visibility: event.visibility,
        }}
      />
    </div>
  );
}
