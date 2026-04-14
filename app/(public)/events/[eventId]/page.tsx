import { eq } from "drizzle-orm";
import { notFound, permanentRedirect } from "next/navigation";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    columns: { title: true, slug: true },
  });
  if (!event) return { title: "Event Not Found" };
  return { title: `${event.title} - OpenLuma` };
}

export default async function LegacyEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    columns: { slug: true },
  });
  if (!event) notFound();
  permanentRedirect(`/e/${event.slug}`);
}
