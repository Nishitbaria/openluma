import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, eventCohosts } from "@/lib/db/schema";
import { updateEventSchema } from "@/lib/validators/event";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      host: { columns: { id: true, name: true, image: true, bio: true } },
      category: true,
      tags: true,
      rsvps: {
        columns: { id: true, status: true },
      },
      cohosts: {
        with: {
          user: { columns: { id: true, name: true, image: true } },
        },
      },
    },
  });

  if (!event) {
    return Response.json({ message: "Event not found" }, { status: 404 });
  }

  if (event.visibility === "private") {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;

    const isHost = event.hostId === userId;
    const isCohost = event.cohosts.some((c) => c.userId === userId);

    if (!isHost && !isCohost) {
      return Response.json({ message: "Not authorized" }, { status: 403 });
    }
  }

  const rsvpCounts = {
    total: event.rsvps.length,
    approved: event.rsvps.filter((r) => r.status === "approved").length,
    pending: event.rsvps.filter((r) => r.status === "pending").length,
  };

  return Response.json({ ...event, rsvps: undefined, _count: rsvpCounts });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: { cohosts: true },
  });

  if (!event) {
    return Response.json({ message: "Event not found" }, { status: 404 });
  }

  const isHost = event.hostId === session.user.id;
  const isCohost = event.cohosts.some((c) => c.userId === session.user.id);

  if (!isHost && !isCohost) {
    return Response.json({ message: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateEventSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { message: "Invalid data", errors: parsed.error.issues },
      { status: 400 },
    );
  }

  const { tags, ...updateData } = parsed.data;

  const updates: Record<string, unknown> = { ...updateData, updatedAt: new Date() };
  if (updateData.startTime) updates.startTime = new Date(updateData.startTime);
  if (updateData.endTime) updates.endTime = new Date(updateData.endTime);

  const [updated] = await db
    .update(events)
    .set(updates)
    .where(eq(events.id, eventId))
    .returning();

  return Response.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event) {
    return Response.json({ message: "Event not found" }, { status: 404 });
  }

  if (event.hostId !== session.user.id) {
    return Response.json(
      { message: "Only the host can delete an event" },
      { status: 403 },
    );
  }

  await db.delete(events).where(eq(events.id, eventId));

  return Response.json({ message: "Event deleted" });
}
