import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, invitations, rsvps, user } from "@/lib/db/schema";
import { sendRsvpConfirmationEmail } from "@/lib/email";

export async function GET(
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
    with: { cohosts: true },
    columns: { id: true, hostId: true },
  });

  if (!event) {
    return Response.json({ message: "Event not found" }, { status: 404 });
  }

  const isHost = event.hostId === session.user.id;
  const isCohost = event.cohosts.some((c) => c.userId === session.user.id);

  if (!isHost && !isCohost) {
    return Response.json({ message: "Not authorized" }, { status: 403 });
  }

  const eventRsvps = await db.query.rsvps.findMany({
    where: eq(rsvps.eventId, eventId),
    with: {
      user: { columns: { id: true, name: true, email: true, image: true } },
    },
    orderBy: (rsvps, { desc }) => [desc(rsvps.createdAt)],
  });

  return Response.json(eventRsvps);
}

export async function POST(
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
    with: {
      rsvps: {
        where: eq(rsvps.status, "approved"),
        columns: { id: true },
      },
    },
    columns: {
      id: true,
      title: true,
      hostId: true,
      capacity: true,
      requiresApproval: true,
      visibility: true,
      startTime: true,
      endTime: true,
      location: true,
    },
  });

  if (!event) {
    return Response.json({ message: "Event not found" }, { status: 404 });
  }

  // Host cannot RSVP to their own event
  if (event.hostId === session.user.id) {
    return Response.json(
      { message: "You are the host of this event" },
      { status: 400 },
    );
  }

  // Private events require an accepted invitation to RSVP
  if (event.visibility === "private" && event.hostId !== session.user.id) {
    const invitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.eventId, eventId),
        eq(invitations.email, session.user.email),
      ),
    });
    if (!invitation || invitation.status !== "accepted") {
      return Response.json(
        { message: "This is a private event. You need an invitation to RSVP." },
        { status: 403 },
      );
    }
  }

  const isFull = !!(event.capacity && event.rsvps.length >= event.capacity);

  const existing = await db.query.rsvps.findFirst({
    where: and(eq(rsvps.eventId, eventId), eq(rsvps.userId, session.user.id)),
  });

  if (existing) {
    // Allow re-RSVP if previously rejected
    if (existing.status === "rejected") {
      const newStatus = isFull
        ? "waitlisted"
        : event.requiresApproval
          ? "pending"
          : "approved";
      const [updated] = await db
        .update(rsvps)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(rsvps.id, existing.id))
        .returning();
      return Response.json(updated, { status: 200 });
    }
    return Response.json({ message: "Already RSVP'd", rsvp: existing });
  }

  const body = await request.json().catch(() => ({}));
  const status = isFull
    ? "waitlisted"
    : event.requiresApproval
      ? "pending"
      : "approved";

  const [rsvp] = await db
    .insert(rsvps)
    .values({
      eventId,
      userId: session.user.id,
      status,
      message: body.message,
      customAnswers: body.customAnswers ?? null,
    })
    .returning();

  // Send ticket email if auto-approved
  if (status === "approved" && session.user.email) {
    sendRsvpConfirmationEmail(session.user.email, event.title, "approved", {
      id: event.id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
    }).catch((err) => console.error("Failed to send ticket email:", err));
  }

  return Response.json(rsvp, { status: 201 });
}

export async function PATCH(
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
    columns: {
      id: true,
      title: true,
      hostId: true,
      startTime: true,
      endTime: true,
      location: true,
    },
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
  const { rsvpId, status } = body;

  if (!rsvpId || !["approved", "rejected", "waitlisted"].includes(status)) {
    return Response.json({ message: "Invalid data" }, { status: 400 });
  }

  const [updated] = await db
    .update(rsvps)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(rsvps.id, rsvpId), eq(rsvps.eventId, eventId)))
    .returning();

  if (updated) {
    // Fire-and-forget: don't block response on email send
    db.query.user
      .findFirst({ where: eq(user.id, updated.userId) })
      .then((rsvpUser) => {
        if (rsvpUser?.email) {
          sendRsvpConfirmationEmail(
            rsvpUser.email,
            event.title,
            status,
            status === "approved"
              ? {
                  id: event.id,
                  title: event.title,
                  startTime: event.startTime,
                  endTime: event.endTime,
                  location: event.location,
                }
              : undefined,
          ).catch((err) =>
            console.error("Failed to send RSVP email:", err),
          );
        }
      })
      .catch((err) => console.error("Failed to fetch user for email:", err));
  }

  return Response.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  // Host can remove any RSVP by passing rsvpId
  if (body.rsvpId) {
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

    await db
      .delete(rsvps)
      .where(and(eq(rsvps.id, body.rsvpId), eq(rsvps.eventId, eventId)));

    return Response.json({ message: "RSVP removed" });
  }

  // User cancelling their own RSVP
  const cancelledRsvp = await db.query.rsvps.findFirst({
    where: and(eq(rsvps.eventId, eventId), eq(rsvps.userId, session.user.id)),
    columns: { id: true, status: true },
  });

  await db
    .delete(rsvps)
    .where(and(eq(rsvps.eventId, eventId), eq(rsvps.userId, session.user.id)));

  // Auto-promote oldest waitlisted RSVP when an approved seat opens up
  if (cancelledRsvp?.status === "approved") {
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
      columns: { id: true, title: true, startTime: true, endTime: true, location: true },
    });

    const nextInLine = await db.query.rsvps.findFirst({
      where: and(eq(rsvps.eventId, eventId), eq(rsvps.status, "waitlisted")),
      orderBy: [asc(rsvps.createdAt)],
      with: { user: { columns: { id: true, email: true } } },
    });

    if (nextInLine && event) {
      await db
        .update(rsvps)
        .set({ status: "approved", updatedAt: new Date() })
        .where(eq(rsvps.id, nextInLine.id));

      if (nextInLine.user.email) {
        sendRsvpConfirmationEmail(
          nextInLine.user.email,
          event.title,
          "approved",
          {
            id: event.id,
            title: event.title,
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location,
          },
        ).catch((err) => console.error("Failed to send waitlist promotion email:", err));
      }
    }
  }

  return Response.json({ message: "RSVP cancelled" });
}
