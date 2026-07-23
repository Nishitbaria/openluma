"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, rsvps, user } from "@/lib/db/schema";
import { sendRsvpConfirmationEmail } from "@/lib/email";

export async function submitRsvpAction(eventId: string, message?: string) {
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

  const existing = await db.query.rsvps.findFirst({
    where: and(eq(rsvps.eventId, eventId), eq(rsvps.userId, session.user.id)),
  });
  if (existing) {
    throw new Error("Already RSVP'd");
  }

  const status = event.requiresApproval ? "pending" : "approved";

  await db.insert(rsvps).values({
    eventId,
    message,
    status,
    userId: session.user.id,
  });

  if (session.user.email) {
    await sendRsvpConfirmationEmail(session.user.email, event.title, status, {
      endTime: event.endTime,
      id: event.id,
      location: event.location,
      slug: event.slug ?? undefined,
      startTime: event.startTime,
      timezone: event.timezone,
      title: event.title,
    }).catch((err) =>
      console.error("Failed to send RSVP confirmation email:", err)
    );
  }

  revalidatePath(`/events/${eventId}`);
  if (event.slug) {
    revalidatePath(`/e/${event.slug}`);
  }
  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function approveRsvpAction(rsvpId: string, eventId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const event = await db.query.events.findFirst({
    columns: { hostId: true },
    where: eq(events.id, eventId),
    with: { cohosts: { columns: { userId: true } } },
  });
  if (!event) {
    throw new Error("Event not found");
  }
  const isHost = event.hostId === session.user.id;
  const isCohost = event.cohosts.some((c) => c.userId === session.user.id);
  if (!(isHost || isCohost)) {
    throw new Error("Not authorized");
  }

  const [updated] = await db
    .update(rsvps)
    .set({ status: "approved", updatedAt: new Date() })
    .where(and(eq(rsvps.id, rsvpId), eq(rsvps.eventId, eventId)))
    .returning();

  if (updated) {
    const rsvpUser = await db.query.user.findFirst({
      where: eq(user.id, updated.userId),
    });
    const eventForEmail = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    if (rsvpUser?.email && eventForEmail) {
      await sendRsvpConfirmationEmail(
        rsvpUser.email,
        eventForEmail.title,
        "approved",
        {
          endTime: eventForEmail.endTime,
          id: eventForEmail.id,
          location: eventForEmail.location,
          slug: eventForEmail.slug ?? undefined,
          startTime: eventForEmail.startTime,
          timezone: eventForEmail.timezone,
          title: eventForEmail.title,
        }
      ).catch((err) =>
        console.error("Failed to send RSVP approval email:", err)
      );
    }
  }

  revalidatePath(`/dashboard/events/${eventId}/attendees`);
}

export async function rejectRsvpAction(rsvpId: string, eventId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const event = await db.query.events.findFirst({
    columns: { hostId: true },
    where: eq(events.id, eventId),
    with: { cohosts: { columns: { userId: true } } },
  });
  if (!event) {
    throw new Error("Event not found");
  }
  const isHost = event.hostId === session.user.id;
  const isCohost = event.cohosts.some((c) => c.userId === session.user.id);
  if (!(isHost || isCohost)) {
    throw new Error("Not authorized");
  }

  const [updated] = await db
    .update(rsvps)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(and(eq(rsvps.id, rsvpId), eq(rsvps.eventId, eventId)))
    .returning();

  if (updated) {
    const rsvpUser = await db.query.user.findFirst({
      where: eq(user.id, updated.userId),
    });
    const eventForEmail = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    if (rsvpUser?.email && eventForEmail) {
      await sendRsvpConfirmationEmail(
        rsvpUser.email,
        eventForEmail.title,
        "rejected",
        {
          endTime: eventForEmail.endTime,
          id: eventForEmail.id,
          location: eventForEmail.location,
          slug: eventForEmail.slug ?? undefined,
          startTime: eventForEmail.startTime,
          timezone: eventForEmail.timezone,
          title: eventForEmail.title,
        }
      ).catch((err) =>
        console.error("Failed to send RSVP rejection email:", err)
      );
    }
  }

  revalidatePath(`/dashboard/events/${eventId}/attendees`);
}

export async function cancelRsvpAction(eventId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  await db
    .delete(rsvps)
    .where(and(eq(rsvps.eventId, eventId), eq(rsvps.userId, session.user.id)));

  const event = await db.query.events.findFirst({
    columns: { slug: true },
    where: eq(events.id, eventId),
  });

  revalidatePath(`/events/${eventId}`);
  if (event?.slug) {
    revalidatePath(`/e/${event.slug}`);
  }
}
