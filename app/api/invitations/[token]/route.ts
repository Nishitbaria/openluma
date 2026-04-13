import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eventCohosts, invitations, rsvps } from "@/lib/db/schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const action = request.nextUrl.searchParams.get("action");

  const invitation = await db.query.invitations.findFirst({
    where: eq(invitations.token, token),
    with: { event: true },
  });

  if (!invitation) {
    return redirect("/invitation-error?reason=invalid");
  }

  if (invitation.status !== "pending") {
    return redirect(
      `/invitation-error?reason=already-${invitation.status}&event=${invitation.eventId}`,
    );
  }

  if (invitation.expiresAt && new Date() > invitation.expiresAt) {
    await db
      .update(invitations)
      .set({ status: "expired" })
      .where(eq(invitations.id, invitation.id));
    return redirect("/invitation-error?reason=expired");
  }

  if (action === "decline") {
    await db
      .update(invitations)
      .set({ status: "declined" })
      .where(eq(invitations.id, invitation.id));
    return redirect(`/events/${invitation.eventId}?declined=true`);
  }

  // Accept: requires auth
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return redirect(
      `/sign-in?callbackUrl=/api/invitations/${token}?action=accept`,
    );
  }

  // Verify the accepting user's email matches the invitation
  if (session.user.email !== invitation.email) {
    return redirect(
      `/invitation-error?reason=wrong-email&expected=${encodeURIComponent(invitation.email)}`,
    );
  }

  // Use a transaction to atomically accept invitation + create RSVP/cohost
  await db.transaction(async (tx) => {
    await tx
      .update(invitations)
      .set({ status: "accepted" })
      .where(eq(invitations.id, invitation.id));

    // Check for existing RSVP to avoid duplicates
    const existingRsvp = await tx.query.rsvps.findFirst({
      where: and(
        eq(rsvps.eventId, invitation.eventId),
        eq(rsvps.userId, session.user.id),
      ),
    });

    if (existingRsvp) {
      if (existingRsvp.status !== "approved") {
        await tx
          .update(rsvps)
          .set({ status: "approved", updatedAt: new Date() })
          .where(eq(rsvps.id, existingRsvp.id));
      }
    } else {
      await tx.insert(rsvps).values({
        eventId: invitation.eventId,
        userId: session.user.id,
        status: "approved",
      });
    }

    // If invited as cohost, add to eventCohosts
    if (invitation.role === "cohost") {
      const existingCohost = await tx.query.eventCohosts.findFirst({
        where: and(
          eq(eventCohosts.eventId, invitation.eventId),
          eq(eventCohosts.userId, session.user.id),
        ),
      });
      if (!existingCohost) {
        await tx.insert(eventCohosts).values({
          eventId: invitation.eventId,
          userId: session.user.id,
        });
      }
    }
  });

  if (invitation.role === "cohost") {
    return redirect(`/dashboard/events/${invitation.eventId}?accepted=true`);
  }
  return redirect(`/events/${invitation.eventId}?accepted=true`);
}
