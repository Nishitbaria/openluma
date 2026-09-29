import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { attendeeCheckins, events, rsvps } from "@/lib/db/schema";
import { verifyTicketCode } from "@/lib/tickets";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const event = await db.query.events.findFirst({
    columns: { hostId: true },
    where: eq(events.id, eventId),
    with: { cohosts: { columns: { userId: true } } },
  });
  if (!event) {
    return Response.json({ message: "Event not found" }, { status: 404 });
  }
  const isHost = event.hostId === session.user.id;
  const isCohost = event.cohosts.some((c) => c.userId === session.user.id);
  if (!(isHost || isCohost)) {
    return Response.json({ message: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const rsvpId = verifyTicketCode(body?.ticket);
  if (!rsvpId) {
    return Response.json({ message: "Invalid ticket" }, { status: 400 });
  }

  const rsvp = await db.query.rsvps.findFirst({
    columns: { status: true, userId: true },
    where: and(eq(rsvps.id, rsvpId), eq(rsvps.eventId, eventId)),
    with: { user: { columns: { name: true } } },
  });

  if (!rsvp) {
    return Response.json(
      { message: "This ticket is not for this event" },
      { status: 400 }
    );
  }
  if (rsvp.status !== "approved") {
    return Response.json(
      { message: "This guest's RSVP is not approved" },
      { status: 400 }
    );
  }

  const { userId } = rsvp;
  const result = await db.transaction(async (tx) => {
    // Serialize scans of the same guest so two scanners reading the same
    // copied code at once can't both check it in.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`checkin:${eventId}:${userId}`}))`
    );
    const existing = await tx.query.attendeeCheckins.findFirst({
      where: and(
        eq(attendeeCheckins.eventId, eventId),
        eq(attendeeCheckins.userId, userId)
      ),
    });
    if (existing) {
      return { checkin: existing, created: false };
    }
    const [checkin] = await tx
      .insert(attendeeCheckins)
      .values({ checkedInBy: session.user.id, eventId, userId })
      .returning();
    return { checkin, created: true };
  });

  // A ticket admits one person. A second scan usually means a copied code, so
  // flag it instead of reporting success.
  if (!result.created) {
    return Response.json(
      {
        checkin: result.checkin,
        message: `${rsvp.user.name} is already checked in`,
      },
      { status: 409 }
    );
  }

  return Response.json(result.checkin, { status: 201 });
}

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
    with: { cohosts: { columns: { userId: true } } },
  });

  if (!event) {
    return Response.json({ message: "Event not found" }, { status: 404 });
  }

  const isHost = event.hostId === session.user.id;
  const isCohost = event.cohosts.some((c) => c.userId === session.user.id);

  if (!(isHost || isCohost)) {
    return Response.json({ message: "Not authorized" }, { status: 403 });
  }

  const checkins = await db.query.attendeeCheckins.findMany({
    where: eq(attendeeCheckins.eventId, eventId),
    with: {
      user: { columns: { email: true, id: true, name: true } },
    },
  });

  return Response.json({
    checkins,
    total: checkins.length,
  });
}
