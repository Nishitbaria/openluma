import { timingSafeEqual } from "node:crypto";
import { and, eq, gte, lte } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { events, rsvps } from "@/lib/db/schema";
import { sendEventReminderEmail } from "@/lib/email";

// Constant-time bearer-token check so the shared cron secret can't be probed
// via response timing.
function isAuthorizedCron(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fail closed: a missing secret must never authenticate.
    return false;
  }
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }
  const provided = Buffer.from(authHeader.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  if (provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(provided, expected);
}

export async function GET(request: NextRequest) {
  // Verify cron secret — Vercel sets Authorization: Bearer <CRON_SECRET>
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // 24-hour window: events starting between 23h and 25h from now
  const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const window24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  // 1-hour window: events starting between 50min and 70min from now
  const window1hStart = new Date(now.getTime() + 50 * 60 * 1000);
  const window1hEnd = new Date(now.getTime() + 70 * 60 * 1000);

  const [events24h, events1h] = await Promise.all([
    db.query.events.findMany({
      columns: {
        endTime: true,
        id: true,
        location: true,
        slug: true,
        startTime: true,
        timezone: true,
        title: true,
      },
      where: and(
        gte(events.startTime, window24hStart),
        lte(events.startTime, window24hEnd),
        eq(events.reminderSent24h, false)
      ),
    }),
    db.query.events.findMany({
      columns: {
        endTime: true,
        id: true,
        location: true,
        slug: true,
        startTime: true,
        timezone: true,
        title: true,
      },
      where: and(
        gte(events.startTime, window1hStart),
        lte(events.startTime, window1hEnd),
        eq(events.reminderSent1h, false)
      ),
    }),
  ]);

  let sent = 0;

  async function sendRemindersForEvent(
    event: {
      id: string;
      slug: string | null;
      title: string;
      startTime: Date;
      endTime: Date | null;
      location: string | null;
      timezone: string;
    },
    flag: "reminderSent24h" | "reminderSent1h"
  ) {
    const approvedRsvps = await db.query.rsvps.findMany({
      where: and(eq(rsvps.eventId, event.id), eq(rsvps.status, "approved")),
      with: { user: { columns: { email: true } } },
    });

    const recipients = approvedRsvps.filter((r) => r.user.email);

    const results = await Promise.allSettled(
      recipients.map((r) =>
        sendEventReminderEmail(
          r.user.email,
          event.title,
          event.startTime,
          event.timezone,
          {
            endTime: event.endTime,
            id: event.id,
            location: event.location,
            slug: event.slug ?? undefined,
          }
        )
      )
    );

    let failures = 0;
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        failures += 1;
        console.error(
          `Reminder email failed (event ${event.id}, rsvp ${recipients[i].id}):`,
          result.reason
        );
      }
    });

    // Only mark the reminder as sent when every delivery succeeded, so a failed
    // run is retried next time. Retries are safe: sendEventReminderEmail passes
    // a Resend idempotency key, so already-delivered recipients aren't re-sent.
    if (failures === 0) {
      await db
        .update(events)
        .set({ [flag]: true })
        .where(eq(events.id, event.id));
    }

    sent += recipients.length - failures;
  }

  await Promise.all([
    ...events24h.map((e) => sendRemindersForEvent(e, "reminderSent24h")),
    ...events1h.map((e) => sendRemindersForEvent(e, "reminderSent1h")),
  ]);

  return Response.json({
    emailsSent: sent,
    processed: events24h.length + events1h.length,
  });
}
