import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, invitations } from "@/lib/db/schema";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendInvitationEmail } from "@/lib/email";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const eventInvitations = await db.query.invitations.findMany({
    where: eq(invitations.eventId, eventId),
    orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
  });

  return Response.json(eventInvitations);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
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

  if (!isHost && !isCohost) {
    return Response.json({ message: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const emails: string[] = Array.isArray(body.emails)
    ? body.emails
    : [body.email].filter(Boolean);

  const results = [];

  for (const email of emails) {
    const token = nanoid(32);

    const [invitation] = await db
      .insert(invitations)
      .values({
        eventId,
        email,
        token,
        invitedBy: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      })
      .returning();

    await sendInvitationEmail(email, event.title, token);
    results.push(invitation);
  }

  return Response.json(results, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
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

  if (!isHost && !isCohost) {
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
      and(eq(invitations.id, invitationId), eq(invitations.eventId, eventId)),
    );

  return Response.json({ message: "Invitation revoked" });
}
