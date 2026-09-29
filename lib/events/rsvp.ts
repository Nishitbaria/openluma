import { and, asc, eq, type SQL } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import {
  type eventQuestions,
  events,
  invitations,
  rsvps,
  rsvpTimeline,
  user,
} from "@/lib/db/schema";
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

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Question = Pick<
  typeof eventQuestions.$inferSelect,
  "id" | "label" | "options" | "required" | "type"
>;

const MAX_ANSWER_LENGTH = 2000;
const messageInput = z.string().trim().max(500).optional();

/**
 * Locks the event row for the rest of the transaction. Every change that takes
 * or frees a seat goes through it, so capacity checks can't interleave.
 */
async function lockEvent(tx: Tx, eventId: string) {
  const [event] = await tx
    .select({ capacity: events.capacity })
    .from(events)
    .where(eq(events.id, eventId))
    .for("update");
  return event;
}

function countApproved(tx: Tx, eventId: string) {
  return tx.$count(
    rsvps,
    and(eq(rsvps.eventId, eventId), eq(rsvps.status, "approved"))
  );
}

function toggleError(q: Question, value: unknown) {
  if (value !== undefined && typeof value !== "boolean") {
    return `"${q.label}" must be yes or no.`;
  }
  if (q.required && q.type === "terms" && value !== true) {
    return `You must agree to "${q.label}".`;
  }
}

function textError(q: Question, value: unknown) {
  if (value !== undefined && typeof value !== "string") {
    return `"${q.label}" must be text.`;
  }
  const text = value?.trim() ?? "";
  if (text.length > MAX_ANSWER_LENGTH) {
    return `"${q.label}" is too long.`;
  }
  if (q.type === "dropdown" && text && !q.options?.includes(text)) {
    return `"${q.label}" must be one of the listed options.`;
  }
  if (q.required && !text) {
    return `"${q.label}" is required.`;
  }
}

/**
 * Keeps only answers to the event's questions, checks their types and applies
 * the same required rules as the registration dialog. Returns an error message
 * for invalid answers.
 */
export function parseAnswers(
  questions: Question[],
  raw: unknown
): Record<string, string | boolean> | string {
  const given =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const answers: Record<string, string | boolean> = {};

  for (const q of questions) {
    const value = given[q.id];
    const error =
      q.type === "checkbox" || q.type === "terms"
        ? toggleError(q, value)
        : textError(q, value);
    if (error) {
      return error;
    }
    if (typeof value === "boolean") {
      answers[q.id] = value;
    } else if (typeof value === "string" && value.trim()) {
      answers[q.id] = value.trim();
    }
  }
  return answers;
}

/**
 * The single path for a guest registering for an event. Enforces host
 * self-RSVP, private-event invitations, host rejections, registration
 * questions and capacity, so every entry point (API, AI agent) applies the
 * same rules.
 */
export async function submitRsvp(
  eventId: string,
  rsvpUser: RsvpUser,
  input: { customAnswers?: unknown; message?: unknown } = {}
): Promise<RsvpResult> {
  const event = await db.query.events.findFirst({
    columns: {
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
      questions: {
        columns: {
          id: true,
          label: true,
          options: true,
          required: true,
          type: true,
        },
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

  const message = messageInput.safeParse(input.message);
  if (!message.success) {
    return {
      error: "Message must be 500 characters or fewer",
      ok: false,
      status: 400,
    };
  }

  const outcome = await db.transaction(async (tx) => {
    const locked = await lockEvent(tx, eventId);
    if (!locked) {
      return { kind: "missing" } as const;
    }

    const existing = await tx.query.rsvps.findFirst({
      where: and(eq(rsvps.eventId, eventId), eq(rsvps.userId, rsvpUser.id)),
    });
    if (existing) {
      return { existing, kind: "existing" } as const;
    }

    const answers = parseAnswers(event.questions, input.customAnswers);
    if (typeof answers === "string") {
      return { error: answers, kind: "invalid" } as const;
    }

    // Invited guests who accepted are approved outright; everyone else follows
    // the event's approval and capacity rules.
    const resolveStatus = async () => {
      if (hasAcceptedInvite) {
        return "approved";
      }
      if (
        locked.capacity &&
        (await countApproved(tx, eventId)) >= locked.capacity
      ) {
        return "waitlisted";
      }
      return event.requiresApproval ? "pending" : "approved";
    };

    const [rsvp] = await tx
      .insert(rsvps)
      .values({
        customAnswers: event.questions.length > 0 ? answers : null,
        eventId,
        message: message.data || null,
        status: await resolveStatus(),
        userId: rsvpUser.id,
      })
      .returning();
    return { kind: "created", rsvp } as const;
  });

  if (outcome.kind === "missing") {
    return { error: "Event not found", ok: false, status: 404 };
  }
  if (outcome.kind === "invalid") {
    return { error: outcome.error, ok: false, status: 400 };
  }
  if (outcome.kind === "existing") {
    // A rejection is the host's decision; only the host can reverse it.
    if (outcome.existing.status === "rejected") {
      return {
        error: "The host declined your RSVP for this event.",
        ok: false,
        status: 403,
      };
    }
    return { created: false, ok: true, rsvp: outcome.existing };
  }

  const { rsvp } = outcome;
  db.insert(rsvpTimeline)
    .values({
      eventId,
      rsvpId: rsvp.id,
      toStatus: rsvp.status,
      type: "registered",
    })
    .catch(() => {
      // ignore: best-effort timeline logging, must not block RSVP creation
    });

  // Send confirmation email (ticket if auto-approved, pending notice otherwise)
  if (rsvp.status === "approved" || rsvp.status === "pending") {
    await sendRsvpConfirmationEmail(rsvpUser.email, event.title, rsvp.status, {
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

/**
 * Deletes the event's RSVP matching `match`. If it held a seat and the event
 * now has room, the longest-waiting waitlisted guest gets the seat and is
 * emailed their ticket. Returns whether an RSVP was deleted.
 */
export async function removeRsvp(eventId: string, match: SQL) {
  const { promoted, removed } = await db.transaction(async (tx) => {
    const locked = await lockEvent(tx, eventId);
    const [deleted] = await tx
      .delete(rsvps)
      .where(and(eq(rsvps.eventId, eventId), match))
      .returning({ status: rsvps.status });
    if (!(locked && deleted?.status === "approved")) {
      return { promoted: undefined, removed: !!deleted };
    }
    if (
      locked.capacity &&
      (await countApproved(tx, eventId)) >= locked.capacity
    ) {
      return { promoted: undefined, removed: true };
    }

    const next = await tx.query.rsvps.findFirst({
      columns: { id: true, userId: true },
      orderBy: [asc(rsvps.createdAt)],
      where: and(eq(rsvps.eventId, eventId), eq(rsvps.status, "waitlisted")),
    });
    if (next) {
      await tx
        .update(rsvps)
        .set({ status: "approved", updatedAt: new Date() })
        .where(eq(rsvps.id, next.id));
    }
    return { promoted: next, removed: true };
  });

  if (promoted) {
    db.insert(rsvpTimeline)
      .values({
        eventId,
        fromStatus: "waitlisted",
        rsvpId: promoted.id,
        toStatus: "approved",
        type: "status_changed",
      })
      .catch(() => {
        // ignore: best-effort timeline logging
      });
    notifyPromoted(eventId, promoted.userId).catch((err) =>
      console.error("Failed to send waitlist promotion email:", err)
    );
  }
  return removed;
}

async function notifyPromoted(eventId: string, userId: string) {
  const [event, guest] = await Promise.all([
    db.query.events.findFirst({
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
    }),
    db.query.user.findFirst({
      columns: { email: true },
      where: eq(user.id, userId),
    }),
  ]);
  if (!(event && guest?.email)) {
    return;
  }
  await sendRsvpConfirmationEmail(guest.email, event.title, "approved", {
    endTime: event.endTime,
    id: event.id,
    location: event.location,
    slug: event.slug ?? undefined,
    startTime: event.startTime,
    timezone: event.timezone,
    title: event.title,
  });
}
