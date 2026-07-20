import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { attendeeCheckins, events, rsvps } from "@/lib/db/schema";

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

  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    return Response.json({ message: "userId required" }, { status: 400 });
  }

  const [rsvp, existing] = await Promise.all([
    db.query.rsvps.findFirst({
      where: and(eq(rsvps.eventId, eventId), eq(rsvps.userId, userId)),
    }),
    db.query.attendeeCheckins.findFirst({
      where: and(
        eq(attendeeCheckins.eventId, eventId),
        eq(attendeeCheckins.userId, userId)
      ),
    }),
  ]);

  if (rsvp?.status !== "approved") {
    return Response.json(
      { message: "User does not have an approved RSVP" },
      { status: 400 }
    );
  }

  if (existing) {
    return Response.json({ checkin: existing, message: "Already checked in" });
  }

  const [checkin] = await db
    .insert(attendeeCheckins)
    .values({
      checkedInBy: session.user.id,
      eventId,
      userId,
    })
    .returning();

  return Response.json(checkin, { status: 201 });
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
