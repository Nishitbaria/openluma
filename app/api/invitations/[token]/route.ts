import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  eventCohosts,
  eventQuestions,
  events,
  invitations,
  rsvps,
} from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";

function isPending(invitationId: string) {
  return and(
    eq(invitations.id, invitationId),
    eq(invitations.status, "pending")
  );
}

/**
 * Accepts a pending invitation and, when `grantRsvp`, the RSVP (and co-host
 * seat) that comes with it. Returns false if the invitation was no longer
 * pending.
 */
function acceptInvitation(
  invitation: { eventId: string; id: string; role: "attendee" | "cohost" },
  userId: string,
  grantRsvp: boolean
) {
  // Use a transaction to atomically accept invitation + create RSVP/cohost
  return db.transaction(async (tx) => {
    // Only one request can move the invitation out of pending; a concurrent
    // accept or decline finds nothing to update and stops here.
    const [claimed] = await tx
      .update(invitations)
      .set({ status: "accepted" })
      .where(isPending(invitation.id))
      .returning({ id: invitations.id });
    if (!claimed) {
      return false;
    }
    if (!grantRsvp) {
      return true;
    }

    // Check for existing RSVP to avoid duplicates
    const existingRsvp = await tx.query.rsvps.findFirst({
      where: and(
        eq(rsvps.eventId, invitation.eventId),
        eq(rsvps.userId, userId)
      ),
    });

    if (existingRsvp) {
      // A rejection stands until the host changes it; an invitation link
      // (possibly issued before the rejection) must not silently undo it.
      if (
        existingRsvp.status !== "approved" &&
        existingRsvp.status !== "rejected"
      ) {
        await tx
          .update(rsvps)
          .set({ status: "approved", updatedAt: new Date() })
          .where(eq(rsvps.id, existingRsvp.id));
      }
    } else {
      await tx.insert(rsvps).values({
        eventId: invitation.eventId,
        status: "approved",
        userId,
      });
    }

    // If invited as cohost, add to eventCohosts
    if (invitation.role === "cohost") {
      const existingCohost = await tx.query.eventCohosts.findFirst({
        where: and(
          eq(eventCohosts.eventId, invitation.eventId),
          eq(eventCohosts.userId, userId)
        ),
      });
      if (!existingCohost) {
        await tx.insert(eventCohosts).values({
          eventId: invitation.eventId,
          userId,
        });
      }
    }
    return true;
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Token lookup is unauthenticated — throttle to blunt token-guessing.
  const limited = await checkRateLimit(request, "invitation");
  if (limited) {
    return limited;
  }

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
      `/invitation-error?reason=already-${invitation.status}&event=${invitation.eventId}`
    );
  }

  if (invitation.expiresAt && new Date() > invitation.expiresAt) {
    await db
      .update(invitations)
      .set({ status: "expired" })
      .where(isPending(invitation.id));
    return redirect("/invitation-error?reason=expired");
  }

  // GET must not change state: mail scanners prefetch links in emails. Ask the
  // invitee to confirm, which POSTs back here.
  if (action === "decline") {
    return redirect(`/invitations/${encodeURIComponent(token)}/decline`);
  }

  // Accept: requires auth
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return redirect(
      `/sign-in?callbackUrl=/api/invitations/${token}?action=accept`
    );
  }

  // Verify the accepting user's email matches the invitation
  if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return redirect(
      `/invitation-error?reason=wrong-email&expected=${encodeURIComponent(invitation.email)}`
    );
  }

  // The email match is only proof of identity once the address is verified.
  if (!session.user.emailVerified) {
    return redirect(
      `/invitation-error?reason=unverified-email&invite=${encodeURIComponent(token)}`
    );
  }

  // Attendees invited to an event with registration questions must answer them
  // before an RSVP is created. Grant access by accepting the invitation, then
  // send them to the event page to complete registration (which creates the
  // approved RSVP together with their answers). Cohosts skip this — they're
  // organizers, not registrants.
  const needsRegistration =
    invitation.role !== "cohost" &&
    !!(await db.query.eventQuestions.findFirst({
      columns: { id: true },
      where: eq(eventQuestions.eventId, invitation.eventId),
    }));

  const accepted = await acceptInvitation(
    invitation,
    session.user.id,
    !needsRegistration
  );
  if (!accepted) {
    return redirect(
      `/invitation-error?reason=already-handled&event=${invitation.eventId}`
    );
  }

  if (needsRegistration) {
    return redirect(
      invitation.event.slug
        ? `/e/${invitation.event.slug}?register=1`
        : `/events/${invitation.eventId}?register=1`
    );
  }

  if (invitation.role === "cohost") {
    return redirect(`/dashboard/events/${invitation.eventId}?accepted=true`);
  }
  return redirect(
    invitation.event.slug
      ? `/e/${invitation.event.slug}?accepted=true`
      : `/events/${invitation.eventId}?accepted=true`
  );
}

/** Declines an invitation. Reached from the confirmation page's form. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const limited = await checkRateLimit(request, "invitation");
  if (limited) {
    return limited;
  }

  const { token } = await params;
  const [declined] = await db
    .update(invitations)
    .set({ status: "declined" })
    .where(and(eq(invitations.token, token), eq(invitations.status, "pending")))
    .returning({ eventId: invitations.eventId });

  if (!declined) {
    return Response.redirect(
      new URL("/invitation-error?reason=already-handled", request.url),
      303
    );
  }

  const event = await db.query.events.findFirst({
    columns: { slug: true },
    where: eq(events.id, declined.eventId),
  });
  const destination = event?.slug
    ? `/e/${event.slug}?declined=true`
    : `/events/${declined.eventId}?declined=true`;
  // 303 so the browser follows up with a GET.
  return Response.redirect(new URL(destination, request.url), 303);
}
