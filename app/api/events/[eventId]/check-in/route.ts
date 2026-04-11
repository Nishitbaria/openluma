import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, rsvps, attendeeCheckins } from "@/lib/db/schema";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    return Response.json({ message: "userId required" }, { status: 400 });
  }

  const rsvp = await db.query.rsvps.findFirst({
    where: and(eq(rsvps.eventId, eventId), eq(rsvps.userId, userId)),
  });

  if (!rsvp || rsvp.status !== "approved") {
    return Response.json(
      { message: "User does not have an approved RSVP" },
      { status: 400 },
    );
  }

  const existing = await db.query.attendeeCheckins.findFirst({
    where: and(
      eq(attendeeCheckins.eventId, eventId),
      eq(attendeeCheckins.userId, userId),
    ),
  });

  if (existing) {
    return Response.json({ message: "Already checked in", checkin: existing });
  }

  const [checkin] = await db
    .insert(attendeeCheckins)
    .values({
      eventId,
      userId,
      checkedInBy: session.user.id,
    })
    .returning();

  return Response.json(checkin, { status: 201 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  const checkins = await db.query.attendeeCheckins.findMany({
    where: eq(attendeeCheckins.eventId, eventId),
    with: {
      user: { columns: { id: true, name: true, email: true } },
    },
  });

  return Response.json({
    checkins,
    total: checkins.length,
  });
}
