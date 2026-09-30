import { eq, type SQL, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { sendInvitationEmail } from "@/lib/email";
import { inviteRatelimit } from "@/lib/redis";

export const MAX_INVITES_PER_REQUEST = 50;

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const emailListSchema = z
  .array(z.string().trim().toLowerCase().pipe(z.email().max(254)))
  .min(1)
  .max(MAX_INVITES_PER_REQUEST);

/**
 * Matches an invitation to an account email regardless of case. New
 * invitations are stored lowercased, but older rows kept whatever the host
 * typed, while Better Auth lowercases account emails.
 */
export function invitationEmailMatches(email: string): SQL {
  return sql`lower(${invitations.email}) = ${email.toLowerCase()}`;
}

type InviteResult =
  | { error: string; ok: false; status: 400 | 429 | 503 }
  | {
      failedEmails: string[];
      invitations: (typeof invitations.$inferSelect)[];
      ok: true;
    };

/**
 * The single path for sending event invitations (API route and AI agent).
 * Validates and normalizes the addresses, drops the inviter's own address,
 * enforces a per-inviter hourly budget, and reports which emails could not be
 * delivered. Callers check that the inviter may invite for this event.
 */
export async function createInvitations(
  event: { id: string; title: string },
  inviter: { email: string; id: string },
  rawEmails: unknown,
  role: "attendee" | "cohost" = "attendee"
): Promise<InviteResult> {
  const parsed = emailListSchema.safeParse(rawEmails);
  if (!parsed.success) {
    return {
      error: `Provide between 1 and ${MAX_INVITES_PER_REQUEST} valid email addresses`,
      ok: false,
      status: 400,
    };
  }

  const ownEmail = inviter.email.toLowerCase();
  const emails = [...new Set(parsed.data)].filter((e) => e !== ownEmail);
  if (emails.length === 0) {
    return {
      error: "You cannot invite yourself to your own event",
      ok: false,
      status: 400,
    };
  }

  if (inviteRatelimit) {
    const allowed = await inviteRatelimit
      .limit(`user:${inviter.id}`, { rate: emails.length })
      .then(
        (r) => r.success,
        (error: unknown) => {
          console.error("Invitation rate limiter unavailable:", error);
          return null;
        }
      );
    if (allowed === null) {
      return {
        error: "Service temporarily unavailable. Please try again.",
        ok: false,
        status: 503,
      };
    }
    if (!allowed) {
      return {
        error: "You've sent too many invitations. Try again later.",
        ok: false,
        status: 429,
      };
    }
  }

  const created = await db
    .insert(invitations)
    .values(
      emails.map((email) => ({
        email,
        eventId: event.id,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        invitedBy: inviter.id,
        role,
        token: nanoid(32),
      }))
    )
    .returning();

  const failedEmails: string[] = [];
  await Promise.all(
    created.map(async (invitation) => {
      const sent = await sendInvitationEmail(
        invitation.email,
        event.title,
        invitation.token,
        role
      ).catch((error: unknown) => ({ error }));
      if (sent?.error) {
        console.error(
          `Failed to send invitation email to ${invitation.email}:`,
          sent.error
        );
        failedEmails.push(invitation.email);
      }
    })
  );

  // An invitation nobody received can't be accepted; drop it so the host can
  // simply retry.
  if (failedEmails.length > 0) {
    const failed = created.filter((i) => failedEmails.includes(i.email));
    await Promise.all(
      failed.map((i) => db.delete(invitations).where(eq(invitations.id, i.id)))
    );
  }

  return {
    failedEmails,
    invitations: created.filter((i) => !failedEmails.includes(i.email)),
    ok: true,
  };
}
