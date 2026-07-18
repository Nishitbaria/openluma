import { and, eq, gte, lte } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { events, rsvps } from "@/lib/db/schema";
import { sendEventReminderEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  // Verify cron secret — Vercel sets Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
      where: and(
        gte(events.startTime, window24hStart),
        lte(events.startTime, window24hEnd),
        eq(events.reminderSent24h, false),
      ),
      columns: {
        id: true,
        slug: true,
        title: true,
        startTime: true,
        endTime: true,
        location: true,
        timezone: true,
      },
    }),
    db.query.events.findMany({
      where: and(
        gte(events.startTime, window1hStart),
        lte(events.startTime, window1hEnd),
        eq(events.reminderSent1h, false),
      ),
      columns: {
        id: true,
        slug: true,
        title: true,
        startTime: true,
        endTime: true,
        location: true,
        timezone: true,
      },
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
    flag: "reminderSent24h" | "reminderSent1h",
  ) {
    const approvedRsvps = await db.query.rsvps.findMany({
      where: and(eq(rsvps.eventId, event.id), eq(rsvps.status, "approved")),
      with: { user: { columns: { email: true } } },
    });

    await Promise.all(
      approvedRsvps
        .filter((r) => r.user.email)
        .map((r) =>
          sendEventReminderEmail(
            r.user.email,
            event.title,
            event.startTime,
            event.timezone,
            {
              id: event.id,
              slug: event.slug ?? undefined,
              endTime: event.endTime,
              location: event.location,
            },
          ).catch((err) =>
            console.error(`Reminder email failed for ${r.user.email}:`, err),
          ),
        ),
    );

    await db
      .update(events)
      .set({ [flag]: true })
      .where(eq(events.id, event.id));

    sent += approvedRsvps.length;
  }

  await Promise.all([
    ...events24h.map((e) => sendRemindersForEvent(e, "reminderSent24h")),
    ...events1h.map((e) => sendRemindersForEvent(e, "reminderSent1h")),
  ]);

  return Response.json({
    processed: events24h.length + events1h.length,
    emailsSent: sent,
  });
}
