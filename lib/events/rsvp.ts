import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, invitations, rsvps, rsvpTimeline } from "@/lib/db/schema";
import { sendRsvpConfirmationEmail } from "@/lib/email";
import { invitationEmailMatches } from "@/lib/events/invitations";

interface RsvpUser {
  email: string;
  emailVerified: boolean;
  id: string;
}

type RsvpResult =
  | { error: string; ok: false; status: 400 | 403 | 404 }
  | { created: boolean; ok: true; rsvp: typeof rsvps.$inferSelect };

/**
 * The single path for a guest registering for an event. Enforces host
 * self-RSVP, private-event invitations, host rejections and capacity, so every
 * entry point (API, AI agent) applies the same rules.
 */
export async function submitRsvp(
  eventId: string,
  rsvpUser: RsvpUser,
  input: {
    customAnswers?: Record<string, string | boolean> | null;
    message?: string;
  } = {}
): Promise<RsvpResult> {
  const event = await db.query.events.findFirst({
    columns: {
      capacity: true,
      endTime: true,
      hostId: true,
      id: true,
      location: true,
      requiresApproval: true,
      slug: true,
      startTime: true,
      timezone: true,
      title: true,
      visibility: true,
    },
    where: eq(events.id, eventId),
    with: {
      rsvps: {
        columns: { id: true },
        where: eq(rsvps.status, "approved"),
      },
    },
  });

  if (!event) {
    return { error: "Event not found", ok: false, status: 404 };
  }

  if (event.hostId === rsvpUser.id) {
    return { error: "You are the host of this event", ok: false, status: 400 };
  }

  // Invitations are matched by email, which only proves identity once verified.
  const userInvitation = rsvpUser.emailVerified
    ? await db.query.invitations.findFirst({
        columns: { status: true },
        where: and(
          eq(invitations.eventId, eventId),
          invitationEmailMatches(rsvpUser.email)
        ),
      })
    : undefined;
  const hasAcceptedInvite = userInvitation?.status === "accepted";

  if (event.visibility === "private" && !hasAcceptedInvite) {
    return {
      error: "This is a private event. You need an invitation to RSVP.",
      ok: false,
      status: 403,
    };
  }

  const existing = await db.query.rsvps.findFirst({
    where: and(eq(rsvps.eventId, eventId), eq(rsvps.userId, rsvpUser.id)),
  });

  if (existing) {
    // A rejection is the host's decision; only the host can reverse it.
    if (existing.status === "rejected") {
      return {
        error: "The host declined your RSVP for this event.",
        ok: false,
        status: 403,
      };
    }
    return { created: false, ok: true, rsvp: existing };
  }

  const isFull = !!(event.capacity && event.rsvps.length >= event.capacity);
  // Invited guests who accepted are approved outright; everyone else follows
  // the event's approval and capacity rules.
  const resolveStatus = () => {
    if (hasAcceptedInvite) {
      return "approved";
    }
    if (isFull) {
      return "waitlisted";
    }
    return event.requiresApproval ? "pending" : "approved";
  };
  const status = resolveStatus();

  const [rsvp] = await db
    .insert(rsvps)
    .values({
      customAnswers: input.customAnswers ?? null,
      eventId,
      message: input.message,
      status,
      userId: rsvpUser.id,
    })
    .returning();

  db.insert(rsvpTimeline)
    .values({ eventId, rsvpId: rsvp.id, toStatus: status, type: "registered" })
    .catch(() => {
      // ignore: best-effort timeline logging, must not block RSVP creation
    });

  // Send confirmation email (ticket if auto-approved, pending notice otherwise)
  if (status === "approved" || status === "pending") {
    await sendRsvpConfirmationEmail(rsvpUser.email, event.title, status, {
      endTime: event.endTime,
      id: event.id,
      location: event.location,
      slug: event.slug ?? undefined,
      startTime: event.startTime,
      timezone: event.timezone,
      title: event.title,
    }).catch((err) => console.error("Failed to send ticket email:", err));
  }

  return { created: true, ok: true, rsvp };
}
