import { and, desc, eq, gte, ilike, lte, type SQL } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, eventTags } from "@/lib/db/schema";
import { generateEventSlug } from "@/lib/utils/slugify";
import { createEventSchema } from "@/lib/validators/event";

// Postgres timestamps can't hold every JS date, so bound the range.
const dateParam = z.coerce
  .date()
  .min(new Date("1970-01-01T00:00:00Z"))
  .max(new Date("9999-12-31T23:59:59Z"));

const listQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .default(20)
    .transform((n) => Math.min(n, 50)),
  offset: z.coerce.number().int().min(0).default(0),
  startAfter: dateParam.optional(),
  startBefore: dateParam.optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const visibility = searchParams.get("visibility");
  const search = searchParams.get("search");
  const hostId = searchParams.get("hostId");
  const query = listQuerySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
    startAfter: searchParams.get("startAfter") ?? undefined,
    startBefore: searchParams.get("startBefore") ?? undefined,
  });
  if (!query.success) {
    return Response.json(
      { errors: query.error.issues, message: "Invalid query" },
      { status: 400 }
    );
  }
  const { limit, offset, startAfter, startBefore } = query.data;

  const conditions: SQL[] = [];

  // Default to public events only; private events require authentication + ownership
  if (visibility === "private") {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }
    conditions.push(eq(events.visibility, "private"));
    conditions.push(eq(events.hostId, session.user.id));
  } else {
    conditions.push(eq(events.visibility, "public"));
  }

  if (hostId) {
    conditions.push(eq(events.hostId, hostId));
  }

  if (search) {
    conditions.push(ilike(events.title, `%${search}%`));
  }

  if (startAfter) {
    conditions.push(gte(events.startTime, startAfter));
  }

  if (startBefore) {
    conditions.push(lte(events.startTime, startBefore));
  }

  const results = await db.query.events.findMany({
    limit,
    offset,
    orderBy: [desc(events.startTime)],
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      host: { columns: { id: true, image: true, name: true } },
      rsvps: { columns: { id: true } },
    },
  });

  const formatted = results.map((event) => ({
    ...event,
    _count: { rsvps: event.rsvps.length },
    rsvps: undefined,
  }));

  return Response.json(formatted);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createEventSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { errors: parsed.error.issues, message: "Invalid data" },
      { status: 400 }
    );
  }

  const { tags, ...eventData } = parsed.data;

  const [event] = await db
    .insert(events)
    .values({
      ...eventData,
      endTime: eventData.endTime ? new Date(eventData.endTime) : null,
      hostId: session.user.id,
      slug: generateEventSlug(eventData.title),
      startTime: new Date(eventData.startTime),
    })
    .returning();

  if (tags && tags.length > 0) {
    await db.insert(eventTags).values(
      tags.map((tag) => ({
        eventId: event.id,
        tag,
      }))
    );
  }

  return Response.json(event, { status: 201 });
}
