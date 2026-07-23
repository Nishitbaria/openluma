import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, invitations } from "@/lib/db/schema";
import { sendInvitationEmail } from "@/lib/email";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const event = await db.query.events.findFirst({
    columns: { hostId: true, id: true },
    where: eq(events.id, eventId),
    with: { cohosts: true },
  });

  if (!event) {
    return Response.json({ message: "Event not found" }, { status: 404 });
  }

  const isHost = event.hostId === session.user.id;
  const isCohost = event.cohosts.some((c) => c.userId === session.user.id);

  if (!(isHost || isCohost)) {
    return Response.json({ message: "Not authorized" }, { status: 403 });
  }

  const eventInvitations = await db.query.invitations.findMany({
    orderBy: (invitationRows, { desc }) => [desc(invitationRows.createdAt)],
    where: eq(invitations.eventId, eventId),
  });

  return Response.json(eventInvitations);
}

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
    with: { cohosts: true },
  });

  if (!event) {
    return Response.json({ message: "Event not found" }, { status: 404 });
  }

  const isHost = event.hostId === session.user.id;
  const isCohost = event.cohosts.some((c) => c.userId === session.user.id);

  if (!(isHost || isCohost)) {
    return Response.json({ message: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const emails: string[] = Array.isArray(body.emails)
    ? body.emails
    : [body.email].filter(Boolean);
  const role: "attendee" | "cohost" =
    body.role === "cohost" ? "cohost" : "attendee";

  // Filter out the host's own email
  const filteredEmails = emails.filter(
    (email) => email.toLowerCase() !== session.user.email?.toLowerCase()
  );

  if (filteredEmails.length === 0 && emails.length > 0) {
    return Response.json(
      { message: "You cannot invite yourself to your own event" },
      { status: 400 }
    );
  }

  const failed: string[] = [];

  const results = await Promise.all(
    filteredEmails.map(async (email) => {
      const token = nanoid(32);

      const [invitation] = await db
        .insert(invitations)
        .values({
          email,
          eventId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          invitedBy: session.user.id,
          role,
          token,
        })
        .returning();

      // Fire-and-forget email — don't block other invitations
      sendInvitationEmail(email, event.title, token, role).catch((err) => {
        console.error(`Failed to send invitation email to ${email}:`, err);
        failed.push(email);
      });

      return invitation;
    })
  );

  return Response.json(
    {
      invitations: results,
      ...(failed.length > 0 && { failedEmails: failed }),
    },
    { status: 201 }
  );
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
    with: { cohosts: true },
  });

  if (!event) {
    return Response.json({ message: "Event not found" }, { status: 404 });
  }

  const isHost = event.hostId === session.user.id;
  const isCohost = event.cohosts.some((c) => c.userId === session.user.id);

  if (!(isHost || isCohost)) {
    return Response.json({ message: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const { invitationId } = body;

  if (!invitationId) {
    return Response.json({ message: "Missing invitationId" }, { status: 400 });
  }

  await db
    .delete(invitations)
    .where(
      and(eq(invitations.id, invitationId), eq(invitations.eventId, eventId))
    );

  return Response.json({ message: "Invitation revoked" });
}
