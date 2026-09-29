import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, rsvps } from "@/lib/db/schema";
import { createTicketCode } from "@/lib/tickets";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [rsvp, event] = await Promise.all([
    db.query.rsvps.findFirst({
      where: and(eq(rsvps.eventId, eventId), eq(rsvps.userId, session.user.id)),
    }),
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
  ]);

  if (rsvp?.status !== "approved") {
    return Response.json(
      { message: "No approved RSVP found" },
      { status: 404 }
    );
  }

  if (!event) {
    return Response.json({ message: "Event not found" }, { status: 404 });
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
      userEmail: session.user.email,
      userName: session.user.name,
    },
  });
}
