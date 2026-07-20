import { and, eq, ne } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, rsvps } from "@/lib/db/schema";
import { updateEventSchema } from "@/lib/validators/event";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      category: true,
      cohosts: {
        with: {
          user: { columns: { id: true, image: true, name: true } },
        },
      },
      host: { columns: { bio: true, id: true, image: true, name: true } },
      rsvps: {
        columns: { id: true, status: true },
      },
      tags: true,
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

    let hasApprovedRsvp = false;
    if (userId) {
      const userRsvp = await db.query.rsvps.findFirst({
        columns: { status: true },
        where: and(eq(rsvps.eventId, eventId), eq(rsvps.userId, userId)),
      });
      hasApprovedRsvp = userRsvp?.status === "approved";
    }

    if (!(isHost || isCohost || hasApprovedRsvp)) {
      return Response.json({ message: "Not authorized" }, { status: 403 });
    }
  }

  const rsvpCounts = {
    approved: event.rsvps.filter((r) => r.status === "approved").length,
    pending: event.rsvps.filter((r) => r.status === "pending").length,
    total: event.rsvps.length,
  };

  return Response.json({ ...event, _count: rsvpCounts, rsvps: undefined });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
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

  if (!(isHost || isCohost)) {
    return Response.json({ message: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateEventSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { errors: parsed.error.issues, message: "Invalid data" },
      { status: 400 }
    );
  }

  const { tags: _tags, slug, ...updateData } = parsed.data;

  if (slug) {
    const existing = await db.query.events.findFirst({
      columns: { id: true },
      where: and(eq(events.slug, slug), ne(events.id, eventId)),
    });
    if (existing) {
      return Response.json(
        { message: "This slug is already taken" },
        { status: 409 }
      );
    }
  }

  const updates: Record<string, unknown> = {
    ...updateData,
    ...(slug ? { slug } : {}),
    updatedAt: new Date(),
  };
  if (updateData.startTime) {
    updates.startTime = new Date(updateData.startTime);
  }
  if (updateData.endTime) {
    updates.endTime = new Date(updateData.endTime);
  }

  const [updated] = await db
    .update(events)
    .set(updates)
    .where(eq(events.id, eventId))
    .returning();

  return Response.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
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
      { status: 403 }
    );
  }

  await db.delete(events).where(eq(events.id, eventId));

  return Response.json({ message: "Event deleted" });
}
