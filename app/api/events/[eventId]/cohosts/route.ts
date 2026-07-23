import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eventCohosts, events, user } from "@/lib/db/schema";

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
    where: eq(events.id, eventId),
  });

  if (!event || event.hostId !== session.user.id) {
    return Response.json({ message: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const { userId: cohostUserId, email: cohostEmail } = body;

  let targetUserId = cohostUserId;

  if (!targetUserId && cohostEmail) {
    const found = await db.query.user.findFirst({
      where: eq(user.email, cohostEmail),
    });
    if (!found) {
      return Response.json({ message: "User not found" }, { status: 404 });
    }
    targetUserId = found.id;
  }

  if (!targetUserId) {
    return Response.json(
      { message: "userId or email required" },
      { status: 400 }
    );
  }

  const existing = await db.query.eventCohosts.findFirst({
    where: and(
      eq(eventCohosts.eventId, eventId),
      eq(eventCohosts.userId, targetUserId)
    ),
  });

  if (existing) {
    return Response.json({ message: "Already a co-host" });
  }

  const [cohost] = await db
    .insert(eventCohosts)
    .values({ eventId, userId: targetUserId })
    .returning();

  return Response.json(cohost, { status: 201 });
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

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event || event.hostId !== session.user.id) {
    return Response.json({ message: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const { userId: cohostUserId } = body;

  await db
    .delete(eventCohosts)
    .where(
      and(
        eq(eventCohosts.eventId, eventId),
        eq(eventCohosts.userId, cohostUserId)
      )
    );

  return Response.json({ message: "Co-host removed" });
}
