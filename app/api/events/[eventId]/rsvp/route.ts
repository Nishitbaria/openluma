import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, rsvps, rsvpTimeline, user } from "@/lib/db/schema";
import { sendRsvpConfirmationEmail } from "@/lib/email";
import { submitRsvp } from "@/lib/events/rsvp";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const event = await db.query.events.findFirst({
    columns: { hostId: true, id: true },
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

  const eventRsvps = await db.query.rsvps.findMany({
    orderBy: (rsvpRows, { desc }) => [desc(rsvpRows.createdAt)],
    where: eq(rsvps.eventId, eventId),
    with: {
      user: { columns: { email: true, id: true, image: true, name: true } },
    },
  });

  return Response.json(eventRsvps);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const limited = await checkRateLimit(request, `rsvp:${session.user.id}`);
  if (limited) {
    return limited;
  }

  const body = await request.json().catch(() => ({}));
  const result = await submitRsvp(eventId, session.user, {
    customAnswers: body.customAnswers,
    message: body.message,
  });

  if (!result.ok) {
    return Response.json({ message: result.error }, { status: result.status });
  }
  if (!result.created) {
    return Response.json({ message: "Already RSVP'd", rsvp: result.rsvp });
  }
  return Response.json(result.rsvp, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const event = await db.query.events.findFirst({
    columns: {
      endTime: true,
      hostId: true,
      id: true,
      location: true,
      slug: true,
      startTime: true,
      timezone: true,
      title: true,
    },
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
  const { rsvpId, status, notifyGuest = true, customMessage } = body;

  if (
    !(
      rsvpId &&
      ["approved", "rejected", "waitlisted", "pending"].includes(status)
    )
  ) {
    return Response.json({ message: "Invalid data" }, { status: 400 });
  }

  // Fetch existing status for timeline logging
  const existingRsvp = await db.query.rsvps.findFirst({
    columns: { status: true },
    where: and(eq(rsvps.id, rsvpId), eq(rsvps.eventId, eventId)),
  });

  const [updated] = await db
    .update(rsvps)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(rsvps.id, rsvpId), eq(rsvps.eventId, eventId)))
    .returning();

  if (updated) {
    // Log timeline entry
    db.insert(rsvpTimeline)
      .values({
        changedByName: session.user.name,
        eventId,
        fromStatus: existingRsvp?.status ?? null,
        rsvpId,
        toStatus: status,
        type: "status_changed",
      })
      .catch(() => {
        // ignore: best-effort timeline logging, must not block status update
      });

    // Fire-and-forget: send email if notifyGuest is true
    if (notifyGuest) {
      (async () => {
        try {
          const rsvpUser = await db.query.user.findFirst({
            where: eq(user.id, updated.userId),
          });
          if (rsvpUser?.email) {
            await sendRsvpConfirmationEmail(
              rsvpUser.email,
              event.title,
              status,
              {
                endTime: event.endTime,
                id: event.id,
                location: event.location,
                slug: event.slug ?? undefined,
                startTime: event.startTime,
                timezone: event.timezone,
                title: event.title,
              },
              customMessage?.trim() || undefined
            );
          }
        } catch (err) {
          console.error("Failed to send RSVP notification email:", err);
        }
      })();
    }
  }

  return Response.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
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

    if (!(isHost || isCohost)) {
      return Response.json({ message: "Not authorized" }, { status: 403 });
    }

    await db
      .delete(rsvps)
      .where(and(eq(rsvps.id, body.rsvpId), eq(rsvps.eventId, eventId)));

    return Response.json({ message: "RSVP removed" });
  }

  // User cancelling their own RSVP
  const cancelledRsvp = await db.query.rsvps.findFirst({
    columns: { id: true, status: true },
    where: and(eq(rsvps.eventId, eventId), eq(rsvps.userId, session.user.id)),
  });

  // Deleting a rejected RSVP would let the guest register again from scratch.
  if (cancelledRsvp?.status === "rejected") {
    return Response.json(
      { message: "The host declined your RSVP for this event." },
      { status: 403 }
    );
  }

  await db
    .delete(rsvps)
    .where(and(eq(rsvps.eventId, eventId), eq(rsvps.userId, session.user.id)));

  // Auto-promote oldest waitlisted RSVP when an approved seat opens up
  if (cancelledRsvp?.status === "approved") {
    const event = await db.query.events.findFirst({
      columns: {
        endTime: true,
        id: true,
        location: true,
        slug: true,
        startTime: true,
        timezone: true,
        title: true,
      },
      where: eq(events.id, eventId),
    });

    const nextInLine = await db.query.rsvps.findFirst({
      orderBy: [asc(rsvps.createdAt)],
      where: and(eq(rsvps.eventId, eventId), eq(rsvps.status, "waitlisted")),
      with: { user: { columns: { email: true, id: true } } },
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
            endTime: event.endTime,
            id: event.id,
            location: event.location,
            slug: event.slug ?? undefined,
            startTime: event.startTime,
            timezone: event.timezone,
            title: event.title,
          }
        ).catch((err) =>
          console.error("Failed to send waitlist promotion email:", err)
        );
      }
    }
  }

  return Response.json({ message: "RSVP cancelled" });
}
