import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventCohosts, rsvps } from "@/lib/db/schema";

/**
 * Whether `userId` (possibly undefined for an anonymous caller) may view a
 * private event hosted by `hostId`. Public events don't need this check.
 */
export async function canViewPrivateEvent(
  eventId: string,
  hostId: string,
  userId: string | undefined
) {
  if (!userId) {
    return false;
  }
  if (userId === hostId) {
    return true;
  }

  const [cohost, rsvp] = await Promise.all([
    db.query.eventCohosts.findFirst({
      columns: { userId: true },
      where: and(
        eq(eventCohosts.eventId, eventId),
        eq(eventCohosts.userId, userId)
      ),
    }),
    db.query.rsvps.findFirst({
      columns: { status: true },
      where: and(eq(rsvps.eventId, eventId), eq(rsvps.userId, userId)),
    }),
  ]);

  return Boolean(cohost) || rsvp?.status === "approved";
}
