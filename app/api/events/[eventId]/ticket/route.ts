import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, rsvps } from "@/lib/db/schema";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const rsvp = await db.query.rsvps.findFirst({
    where: and(eq(rsvps.eventId, eventId), eq(rsvps.userId, session.user.id)),
  });

  if (!rsvp || rsvp.status !== "approved") {
    return Response.json(
      { message: "No approved RSVP found" },
      { status: 404 },
    );
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    columns: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      location: true,
    },
  });

  if (!event) {
    return Response.json({ message: "Event not found" }, { status: 404 });
  }

  // QR code payload: check-in URL the host scans
  const checkInPayload = JSON.stringify({
    eventId,
    userId: session.user.id,
    url: `${appUrl}/api/events/${eventId}/check-in`,
  });

  const qrDataUrl = await QRCode.toDataURL(checkInPayload, {
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return Response.json({
    ticket: {
      eventId,
      eventTitle: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      userName: session.user.name,
      userEmail: session.user.email,
      rsvpId: rsvp.id,
      qrCode: qrDataUrl,
    },
  });
}
