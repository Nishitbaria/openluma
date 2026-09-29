import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, rsvps } from "@/lib/db/schema";
import { createTicketCode } from "@/lib/tickets";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Hosts and co-hosts may open a guest's ticket (`?userId=`) from the guest
  // list; everyone else only gets their own.
  const guestId = request.nextUrl.searchParams.get("userId") || session.user.id;

  const [rsvp, event] = await Promise.all([
    db.query.rsvps.findFirst({
      where: and(eq(rsvps.eventId, eventId), eq(rsvps.userId, guestId)),
      with: { user: { columns: { email: true, name: true } } },
    }),
    db.query.events.findFirst({
      columns: {
        endTime: true,
        hostId: true,
        id: true,
        location: true,
        slug: true,
        startTime: true,
        timezone: true,
        title: true,
      },
      where: eq(events.id, eventId),
      with: { cohosts: { columns: { userId: true } } },
    }),
  ]);

  if (!event) {
    return Response.json({ message: "Event not found" }, { status: 404 });
  }

  const canManage =
    event.hostId === session.user.id ||
    event.cohosts.some((c) => c.userId === session.user.id);
  if (guestId !== session.user.id && !canManage) {
    return Response.json({ message: "Not authorized" }, { status: 403 });
  }

  if (rsvp?.status !== "approved") {
    return Response.json(
      { message: "No approved RSVP found" },
      { status: 404 }
    );
  }

  // Signed so a ticket can't be forged from a guessable user or RSVP id.
  const qrDataUrl = await QRCode.toDataURL(createTicketCode(rsvp.id), {
    color: { dark: "#000000", light: "#ffffff" },
    margin: 2,
    width: 300,
  });

  return Response.json({
    ticket: {
      endTime: event.endTime,
      eventId,
      eventSlug: event.slug,
      eventTitle: event.title,
      location: event.location,
      qrCode: qrDataUrl,
      rsvpId: rsvp.id,
      startTime: event.startTime,
      timezone: event.timezone,
      userEmail: rsvp.user.email,
      userName: rsvp.user.name,
    },
  });
}
