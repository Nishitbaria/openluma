import { eq } from "drizzle-orm";
import { notFound, permanentRedirect } from "next/navigation";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

export default async function LegacyEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await db.query.events.findFirst({
    columns: { slug: true },
    where: eq(events.id, eventId),
  });
  if (!event) {
    notFound();
  }
  permanentRedirect(`/e/${event.slug}`);
}
