"use server";

import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, invitations } from "@/lib/db/schema";
import { sendInvitationEmail } from "@/lib/email";

export async function sendInvitationAction(eventId: string, email: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });
  if (!event) {
    throw new Error("Event not found");
  }
  if (event.hostId !== session.user.id) {
    throw new Error("Not authorized");
  }

  const token = nanoid(32);

  await db.insert(invitations).values({
    email,
    eventId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    invitedBy: session.user.id,
    token,
  });

  await sendInvitationEmail(email, event.title, token);
  revalidatePath(`/dashboard/events/${eventId}/attendees`);
}

export async function bulkSendInvitationsAction(
  eventId: string,
  emails: string[]
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });
  if (!event) {
    throw new Error("Event not found");
  }
  if (event.hostId !== session.user.id) {
    throw new Error("Not authorized");
  }

  // Each email's invitation is independent (its own token/insert/send), so send them
  // concurrently rather than sequentially.
  await Promise.all(
    emails.map(async (email) => {
      const token = nanoid(32);
      await db.insert(invitations).values({
        email,
        eventId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedBy: session.user.id,
        token,
      });
      await sendInvitationEmail(email, event.title, token);
    })
  );

  revalidatePath(`/dashboard/events/${eventId}/attendees`);
}
