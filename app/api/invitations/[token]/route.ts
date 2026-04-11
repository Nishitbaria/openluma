import { db } from "@/lib/db";
import { invitations, rsvps } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const action = request.nextUrl.searchParams.get("action");

  const invitation = await db.query.invitations.findFirst({
    where: eq(invitations.token, token),
    with: { event: true },
  });

  if (!invitation) {
    return Response.json({ message: "Invalid invitation" }, { status: 404 });
  }

  if (invitation.status !== "pending") {
    return Response.json(
      { message: `Invitation already ${invitation.status}` },
      { status: 400 },
    );
  }

  if (invitation.expiresAt && new Date() > invitation.expiresAt) {
    await db
      .update(invitations)
      .set({ status: "expired" })
      .where(eq(invitations.id, invitation.id));
    return Response.json({ message: "Invitation expired" }, { status: 400 });
  }

  if (action === "decline") {
    await db
      .update(invitations)
      .set({ status: "declined" })
      .where(eq(invitations.id, invitation.id));
    return redirect(`/events/${invitation.eventId}?declined=true`);
  }

  // Accept: requires auth
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return redirect(`/sign-in?callbackUrl=/api/invitations/${token}?action=accept`);
  }

  await db
    .update(invitations)
    .set({ status: "accepted" })
    .where(eq(invitations.id, invitation.id));

  // Auto-create approved RSVP
  await db.insert(rsvps).values({
    eventId: invitation.eventId,
    userId: session.user.id,
    status: "approved",
  });

  return redirect(`/events/${invitation.eventId}?accepted=true`);
}
