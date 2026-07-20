import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, eventTags } from "@/lib/db/schema";
import { generateEventSlug } from "@/lib/utils/slugify";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;

  const source = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: { tags: true },
  });

  if (!source) {
    return Response.json({ message: "Event not found" }, { status: 404 });
  }

  if (source.hostId !== session.user.id) {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const newSlug = generateEventSlug(`${source.title} copy`);

  const [cloned] = await db
    .insert(events)
    .values({
      capacity: source.capacity,
      categoryId: source.categoryId,
      coverImage: source.coverImage,
      description: source.description,
      hostId: session.user.id,
      location: source.location,
      locationDetails: source.locationDetails,
      requiresApproval: source.requiresApproval,
      richDescription: source.richDescription,
      slug: newSlug,
      // startTime / endTime intentionally omitted — host must set new dates
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // placeholder: 1 week from now
      timezone: source.timezone,
      title: `${source.title} (Copy)`,
      type: source.type,
      visibility: source.visibility,
    })
    .returning();

  if (source.tags.length > 0) {
    await db
      .insert(eventTags)
      .values(source.tags.map((t) => ({ eventId: cloned.id, tag: t.tag })));
  }

  return Response.json({ id: cloned.id, slug: cloned.slug });
}
