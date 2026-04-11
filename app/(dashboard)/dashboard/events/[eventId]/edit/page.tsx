import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { EventForm } from "@/components/events/event-form";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event) {
    notFound();
  }

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
          startTime: event.startTime.toISOString(),
          endTime: event.endTime?.toISOString() ?? null,
          timezone: event.timezone,
          location: event.location,
          locationDetails: event.locationDetails,
          type: event.type,
          visibility: event.visibility,
          capacity: event.capacity,
          requiresApproval: event.requiresApproval,
          categoryId: event.categoryId,
        }}
      />
    </div>
  );
}
