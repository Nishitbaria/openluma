import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, invitations } from "@/lib/db/schema";
import { createInvitations } from "@/lib/events/invitations";

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

  const body = await request.json().catch(() => null);
  const emails = Array.isArray(body?.emails) ? body.emails : [body?.email];
  const role: "attendee" | "cohost" =
    body?.role === "cohost" ? "cohost" : "attendee";

  // Cohost management is host-only; otherwise a cohost could mint extra
  // cohost seats that survive the host removing them.
  if (role === "cohost" && !isHost) {
    return Response.json(
      { message: "Only the host can invite co-hosts" },
      { status: 403 }
    );
  }

  const result = await createInvitations(event, session.user, emails, role);
  if (!result.ok) {
    return Response.json({ message: result.error }, { status: result.status });
  }

  return Response.json(
    {
      invitations: result.invitations,
      ...(result.failedEmails.length > 0 && {
        failedEmails: result.failedEmails,
      }),
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

  if (!isHost) {
    const invitation = await db.query.invitations.findFirst({
      columns: { role: true },
      where: and(
        eq(invitations.id, invitationId),
        eq(invitations.eventId, eventId)
      ),
    });
    if (invitation?.role === "cohost") {
      return Response.json(
        { message: "Only the host can revoke co-host invitations" },
        { status: 403 }
      );
    }
  }

  await db
    .delete(invitations)
    .where(
      and(eq(invitations.id, invitationId), eq(invitations.eventId, eventId))
    );

  return Response.json({ message: "Invitation revoked" });
}
