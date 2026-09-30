import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eventCohosts, events } from "@/lib/db/schema";

// Cohosts are only added by accepting a host-issued cohost invitation
// (app/api/invitations/[token]), so the invitee has to consent.
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
